import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { SuggestionRequest, parseSuggestion } from '../lib/suggestions.ts';
import { candidate } from '../lib/engine.ts';
import { consumeQuota } from '../server/quota.ts';
import {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  recordLoginAttempt,
  sessionCookie,
  readSessionCookie,
} from '../server/auth.ts';
import worker from '../server/worker.ts';
const result = (s) => ({
  candidate: candidate(s, 'understand'),
  source: 'model',
  needsClarification: false,
});
// Same in-memory-D1 pattern the quota test already used, extended so it also has the
// users/login_attempts tables the auth rework added.
function makeDb() {
  const sql = new DatabaseSync(':memory:');
  for (const file of readdirSync('drizzle').filter((x) => x.endsWith('.sql')))
    sql.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  return {
    sql,
    db: {
      prepare: (query) => ({
        bind: (...values) => ({
          first: async () => sql.prepare(query).get(...values),
        }),
      }),
    },
  };
}
test('rejects mismatched situations and user corrections', () => {
  assert.throws(() => parseSuggestion(result('proposal'), 'other', null));
  assert.throws(() =>
    parseSuggestion(result('proposal'), 'proposal', 'judged'),
  );
});
test('cancelled request cannot return even if its transport ignores abort', async () => {
  const client = new SuggestionRequest();
  let done;
  const pending = client.run(
    'proposal',
    null,
    async () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  );
  client.cancel();
  done(Response.json(result('proposal')));
  assert.equal(await pending, null);
});
test('new request wins when responses finish out of order', async () => {
  const client = new SuggestionRequest();
  let done;
  const first = client.run(
    'proposal',
    null,
    async () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  );
  const second = await client.run('second proposal', null, async () =>
    Response.json(result('second proposal')),
  );
  done(Response.json(result('proposal')));
  assert.equal(await first, null);
  assert.equal(second.candidate.situation, 'second proposal');
});
test('transport sends only consented current situation and choice', async () => {
  const client = new SuggestionRequest();
  await client.run('proposal', 'understand', async (url, options) => {
    assert.equal(url, '/api/suggestion');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), [
      'confirmedResistance',
      'consentVersion',
      'situation',
    ]);
    return Response.json(result('proposal'));
  });
});
test('quota uses durable atomic counters, independent users, and UTC resets', async () => {
  const { db, sql } = makeDb();
  const date = (day) =>
    new Date(`2026-09-${String(day).padStart(2, '0')}T12:00:00Z`);
  for (let day = 1; day <= 15; day++) {
    const permits = await Promise.all(
      Array.from({ length: 12 }, () => consumeQuota(db, 'one', date(day))),
    );
    assert.equal(permits.filter(Boolean).length, 10);
  }
  assert.equal(await consumeQuota(db, 'one', date(16)), false);
  assert.equal(await consumeQuota(db, 'two', date(16)), true);
  assert.equal(
    await consumeQuota(db, 'one', new Date('2026-10-01T00:00:00Z')),
    true,
  );
  sql.close();
});

// server/auth.ts — the session/password machinery that replaces the Sites dispatcher.
test('password hashing verifies the right password and rejects the wrong one', async () => {
  const { hash, salt } = await hashPassword('correct horse battery staple');
  assert.equal(
    await verifyPassword('correct horse battery staple', salt, hash),
    true,
  );
  assert.equal(await verifyPassword('wrong password', salt, hash), false);
  // A second hash of the same password gets a fresh random salt, so the digests differ.
  const again = await hashPassword('correct horse battery staple');
  assert.notEqual(again.salt, salt);
});
test('a session verifies for its owner, expires, and cannot be forged by editing it', async () => {
  const now = Date.UTC(2026, 8, 1);
  const token = await createSession('alex', 'secret', now);
  assert.equal(await verifySession(token, 'secret', now + 1000), 'alex');
  assert.equal(
    await verifySession(token, 'secret', now + 31 * 24 * 60 * 60 * 1000),
    null,
    'expired',
  );
  assert.equal(
    await verifySession(token, 'wrong-secret', now),
    null,
    'wrong signing key',
  );
  const [user, expires] = token.split('.');
  const forged = `${user === 'alex' ? 'mallory' : user}.${expires}.${token.split('.')[2]}`;
  assert.equal(
    await verifySession(forged, 'secret', now),
    null,
    'tampered payload',
  );
  assert.equal(await verifySession(null, 'secret', now), null);
  assert.equal(await verifySession('not.a.valid.token', 'secret', now), null);
});
test('the session cookie round-trips through Set-Cookie/Cookie header parsing', async () => {
  const token = await createSession('alex', 'secret');
  const setCookie = sessionCookie(token);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  const cookieHeader = setCookie.split(';')[0];
  const request = new Request('https://example.test/', {
    headers: { cookie: cookieHeader },
  });
  assert.equal(readSessionCookie(request), token);
});
test('login attempts are rate-limited per day, per identity, atomically', async () => {
  const { db, sql } = makeDb();
  const date = (day) =>
    new Date(`2026-09-${String(day).padStart(2, '0')}T12:00:00Z`);
  const permits = await Promise.all(
    Array.from({ length: 12 }, () => recordLoginAttempt(db, 'alex', date(1))),
  );
  assert.equal(permits.filter(Boolean).length, 10, 'capped at 10/day');
  assert.equal(
    await recordLoginAttempt(db, 'alex', date(1)),
    false,
    'still locked the same day',
  );
  assert.equal(
    await recordLoginAttempt(db, 'mallory', date(1)),
    true,
    'a different identity is unaffected',
  );
  assert.equal(
    await recordLoginAttempt(db, 'alex', date(2)),
    true,
    'resets the next day',
  );
  sql.close();
});

test('the worker gates every route behind a session, not just /api/*', async () => {
  const { db } = makeDb();
  const env = {
    ASSETS: { fetch: async () => new Response('shell') },
    DB: db,
    SESSION_SECRET: 'secret',
  };
  // No session at all: static assets redirect to /login, the API 401s instead of redirecting.
  let r = await worker.fetch(new Request('https://threshold.example/'), env);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/login');
  r = await worker.fetch(
    new Request('https://threshold.example/api/suggestion', { method: 'POST' }),
    env,
  );
  assert.equal(r.status, 401);
  // A forged cookie (right shape, wrong signature) is rejected exactly like no cookie at all.
  r = await worker.fetch(
    new Request('https://threshold.example/', {
      headers: { cookie: 'threshold_session=mallory.9999999999999.deadbeef' },
    }),
    env,
  );
  assert.equal(r.status, 302);
});
test('logging in with the wrong password never reaches the app, the right one does', async () => {
  const { db, sql } = makeDb();
  const { hash, salt } = await hashPassword('correct-password');
  sql
    .prepare(
      'INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)',
    )
    .run('alex', hash, salt, Date.now());
  const env = {
    ASSETS: { fetch: async () => new Response('shell') },
    DB: db,
    SESSION_SECRET: 'secret',
  };
  const wrongLogin = async (password) => {
    const body = new URLSearchParams({ username: 'alex', password });
    return worker.fetch(
      new Request('https://threshold.example/login', { method: 'POST', body }),
      env,
    );
  };
  let r = await wrongLogin('nope');
  assert.equal(r.status, 401);
  r = await wrongLogin('correct-password');
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/');
  const cookieHeader = r.headers.get('set-cookie').split(';')[0];
  // The session that login just issued actually gets through the gate.
  r = await worker.fetch(
    new Request('https://threshold.example/', {
      headers: { cookie: cookieHeader },
    }),
    env,
  );
  assert.equal(await r.text(), 'shell');
  sql.close();
});
test('logging out clears the session cookie', async () => {
  const { db } = makeDb();
  const env = {
    ASSETS: { fetch: async () => new Response('shell') },
    DB: db,
    SESSION_SECRET: 'secret',
  };
  const r = await worker.fetch(
    new Request('https://threshold.example/logout'),
    env,
  );
  assert.equal(r.status, 302);
  assert.equal(r.headers.get('location'), '/login');
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
});
