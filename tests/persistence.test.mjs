import test from 'node:test';
import assert from 'node:assert/strict';
import { candidate, discoveries, infer } from '../lib/engine.ts';
import {
  initial,
  parseSaved,
  mergeBackup,
  restoreSummary,
} from '../lib/storage.ts';
import { trailStones } from '../lib/trail.ts';
const e = (id, extra = {}) => ({
  ...candidate('starting a proposal', 'understand'),
  id,
  startedAt: 1000,
  prediction: 7,
  predictionNote: '',
  actual: 8,
  urge: 'stayed',
  notices: ['doorway', 'carried'],
  note: '',
  stopped: false,
  outcome: 'attempted',
  createdAt: Date.UTC(2026, 8, Number(id)),
  localDate: `2026-9-${id}`,
  ...extra,
});
const saved = (encounters = []) => ({
  ...initial,
  screen: 'map',
  encounters,
  lastId: encounters.at(-1)?.id ?? null,
});
test('one multi-select encounter can support both patterns without reducing discomfort', () => {
  const d = discoveries([1, 2, 3, 4].map((n) => e(String(n))));
  assert.deepEqual(d.map((x) => x.rule).sort(), ['carried', 'doorway']);
  assert.ok(d.every((x) => x.support.length === 4));
});
test('duplicate encounter ids cannot fabricate discovery evidence', () => {
  assert.equal(discoveries(Array.from({ length: 4 }, () => e('1'))).length, 0);
});
test('merely unpleasant starting does not force Still Water', () => {
  assert.equal(
    candidate('starting a spreadsheet', 'unpleasant').territory,
    'unknown',
  );
  assert.equal(
    candidate('staying with this feeling instead of scrolling', 'unpleasant')
      .territory,
    'water',
  );
});
test('overlapping or negated lexical hints ask for clarification', () => {
  assert.equal(
    infer('I am worried about asking before I understand it').confident,
    false,
  );
  assert.equal(infer('I am not worried about asking my boss').confident, false);
});
test('concrete situations receive bounded reviewed actions', () => {
  for (const [s, r, pattern] of [
    ['ask my boss a question', 'judged', /ask the person/],
    ['reply to an email', 'judged', /recipient/],
    ['begin a conversation', 'judged', /suitable time/],
    ['polishing the proposal', 'checking', /functional check/],
  ]) {
    const c = candidate(s, r);
    assert.match(c.action, pattern);
    assert.ok(c.minutes <= 3);
  }
});
test('user edits survive recommendations and repeated smaller suggestions do not accumulate prefixes', () => {
  const first = e('1', {
    userAction: 'Write a rough title in my notebook.',
    action: 'Write a rough title in my notebook.',
  });
  const c = candidate(first.situation, first.resistance, [first]);
  assert.match(c.action, /rough title/);
  const again = candidate(first.situation, first.resistance, [
    first,
    e('2', { ...c, userAction: first.userAction }),
  ]);
  assert.equal(again.action, c.action);
});
test('round trip preserves zero prediction and progressive reflection draft', () => {
  const state = {
    ...saved(),
    screen: 'return',
    session: { ...e('1'), actual: 0, prediction: 0 },
  };
  assert.deepEqual(
    parseSaved(JSON.stringify(state)),
    JSON.parse(JSON.stringify(state)),
  );
});
test('restore merges idempotently, keeps local collision records and preserves the active session', () => {
  const local = {
    ...saved([e('1')]),
    session: e('3'),
    screen: 'active',
    situation: 'unfinished draft',
  };
  const backup = saved([e('1', { action: 'different version' }), e('2')]);
  const summary = restoreSummary(local, backup);
  assert.deepEqual(summary, { added: 1, duplicates: 1 });
  const merged = mergeBackup(local, backup);
  assert.equal(merged.encounters.length, 2);
  assert.equal(merged.encounters[0].action, local.encounters[0].action);
  assert.equal(merged.session, local.session);
  assert.equal(merged.situation, local.situation);
  assert.deepEqual(mergeBackup(merged, backup), merged);
});
test('corrupt and unsupported backups fail without mutating the current state', () => {
  const local = saved([e('1')]);
  const before = JSON.stringify(local);
  for (const bad of [
    '{',
    'null',
    JSON.stringify({ ...local, version: 2 }),
    JSON.stringify({ ...local, screen: 'return', session: null }),
    JSON.stringify(saved([e('1', { territory: 'toString' })])),
    JSON.stringify(saved([e('1', { notices: ['made-up'] })])),
  ])
    assert.throws(() => parseSaved(bad));
  assert.equal(JSON.stringify(local), before);
});
test('not starting adds no stone, and restored earlier history keeps later stones as they were', () => {
  assert.equal(
    trailStones([e('1', { outcome: 'not_started', actual: null })]).stones
      .length,
    0,
  );
  const stone = trailStones([e('3')]).stones[0];
  const later = trailStones([e('1'), e('3')]).stones.find((x) => x.id === '3');
  assert.deepEqual({ ...later, step: 1 }, stone);
  assert.equal(later.step, 2);
});
test('the trail deduplicates history and remains deterministic', () => {
  assert.deepEqual(trailStones([e('1'), e('1')]), trailStones([e('1')]));
  assert.deepEqual(
    trailStones([e('2'), e('1')]),
    trailStones([e('1'), e('2')]),
  );
});
test('a backup cannot preempt the current active encounter using the same id', () => {
  const local = { ...saved(), screen: 'active', session: e('1') };
  const backup = saved([e('1')]);
  assert.deepEqual(restoreSummary(local, backup), { added: 0, duplicates: 1 });
  const merged = mergeBackup(local, backup);
  assert.equal(merged.encounters.length, 0);
  assert.equal(merged.session, local.session);
});
