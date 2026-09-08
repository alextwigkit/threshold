import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { SuggestionRequest, parseSuggestion } from '../lib/suggestions.ts';
import { candidate } from '../lib/engine.ts';
import { consumeQuota } from '../server/quota.ts';
import worker from '../server/worker.ts';
const result = (s) => ({ candidate: candidate(s, 'understand'), source: 'model', needsClarification: false });
test('rejects mismatched situations and user corrections', () => {
 assert.throws(() => parseSuggestion(result('proposal'), 'other', null));
 assert.throws(() => parseSuggestion(result('proposal'), 'proposal', 'judged'));
});
test('cancelled request cannot return even if its transport ignores abort', async () => {
 const client = new SuggestionRequest(); let done;
 const pending = client.run('proposal', null, async () => new Promise(resolve => { done = resolve; }));
 client.cancel(); done(Response.json(result('proposal')));
 assert.equal(await pending, null);
});
test('new request wins when responses finish out of order', async () => {
 const client = new SuggestionRequest(); let done;
 const first = client.run('proposal', null, async () => new Promise(resolve => { done = resolve; }));
 const second = await client.run('second proposal', null, async () => Response.json(result('second proposal')));
 done(Response.json(result('proposal')));
 assert.equal(await first, null); assert.equal(second.candidate.situation, 'second proposal');
});
test('transport sends only consented current situation and choice', async () => {
 const client = new SuggestionRequest();
 await client.run('proposal', 'understand', async (url, options) => {
  assert.equal(url, '/api/suggestion'); assert.equal(options.cache, 'no-store');
  assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), ['confirmedResistance','consentVersion','situation']);
  return Response.json(result('proposal'));
 });
});
test('quota uses durable atomic counters, independent users, and UTC resets', async () => {
 const sql = new DatabaseSync(':memory:');
 for (const file of readdirSync('drizzle').filter(x => x.endsWith('.sql'))) sql.exec(readFileSync(`drizzle/${file}`, 'utf8'));
 const db = { prepare: query => ({ bind: (...values) => ({ first: async () => sql.prepare(query).get(...values) }) }) };
 const date = day => new Date(`2026-09-${String(day).padStart(2,'0')}T12:00:00Z`);
 for(let day=1;day<=15;day++) {
  const permits=await Promise.all(Array.from({length:12},()=>consumeQuota(db,'one',date(day))));
  assert.equal(permits.filter(Boolean).length, 10);
 }
 assert.equal(await consumeQuota(db,'one',date(16)),false);
 assert.equal(await consumeQuota(db,'two',date(16)),true);
 assert.equal(await consumeQuota(db,'one',new Date('2026-10-01T00:00:00Z')),true);
 sql.close();
});
test('worker fails closed for missing dispatch identity and untrusted origin', async () => {
 const env = { ASSETS: { fetch: async () => new Response('shell') } };
 let r=await worker.fetch(new Request('https://edge-personal-atlas.thenewdeal.chatgpt.site/api/suggestion',{method:'POST'}),env);
 assert.equal(r.status,401);
 r=await worker.fetch(new Request('https://other.test/api/suggestion',{method:'POST',headers:{'oai-authenticated-user-id':'forged'}}),env);
 assert.equal(r.status,401);
 r=await worker.fetch(new Request('https://edge-personal-atlas.thenewdeal.chatgpt.site/'),env);
 assert.equal(await r.text(),'shell');
});
