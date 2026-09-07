import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidate,
  validScale,
  remaining,
  observation,
  toggleNotice,
  appendEncounter,
  discoveries,
  isEncounter,
} from '../lib/engine.ts';
const encounter = (id, overrides = {}) => ({
  ...candidate('starting a proposal', 'understand'),
  id,
  startedAt: 1000,
  prediction: 7,
  predictionNote: '',
  actual: 4,
  urge: 'stayed',
  notices: ['doorway'],
  note: '',
  stopped: false,
  outcome: 'attempted',
  createdAt: Date.UTC(2026, 8, Number(id) || 1),
  localDate: `2026-9-${id}`,
  ...overrides,
});
test('zero is a real response; absent, fractional and out of range values are invalid', () => {
  assert.equal(validScale(0), true);
  for (const n of [null, undefined, -1, 11, 2.5, '7'])
    assert.equal(validScale(n), false);
});
test('timer uses elapsed wall time and cannot go negative', () => {
  const e = encounter('1');
  assert.equal(remaining(e, 61000), 120);
  assert.equal(remaining(e, 999999), 0);
});
test('routing correction changes the territory and never forces Fog', () => {
  assert.equal(candidate('ask a colleague', 'judged').territory, 'spotlight');
  assert.equal(candidate('check a proposal', 'checking').territory, 'loop');
  assert.equal(candidate('unknown', 'other').territory, 'unknown');
});
test('history changes the relevant recommendation and a stop reduces dose', () => {
  const e = encounter('1');
  assert.equal(
    candidate(e.situation, e.resistance, [e]).title,
    'Keep Going Before Checking',
  );
  assert.equal(
    candidate(e.situation, e.resistance, [{ ...e, outcome: 'stopped' }])
      .minutes,
    1,
  );
});
test('lower discomfort alone cannot invent a starting-versus-continuing observation', () => {
  assert.equal(observation(encounter('1', { notices: [] })).code, 'neutral');
});
test('high discomfort can support meaningful approach', () => {
  assert.equal(
    observation(encounter('1', { actual: 9, notices: ['carried'] })).code,
    'carried',
  );
});
test('stopping and not-started cannot produce a carried or doorway claim', () => {
  assert.equal(
    observation(encounter('1', { outcome: 'stopped' })).code,
    'stopped',
  );
  assert.equal(
    observation(encounter('1', { outcome: 'not_started', actual: null })).code,
    'not_started',
  );
});
test('noticing is multi-select; nothing is exclusive', () => {
  assert.deepEqual(toggleNotice(['doorway'], 'carried'), [
    'doorway',
    'carried',
  ]);
  assert.deepEqual(toggleNotice(['doorway'], 'nothing'), ['nothing']);
  assert.deepEqual(toggleNotice(['nothing'], 'carried'), ['carried']);
});
test('same encounter cannot count twice', () => {
  const e = encounter('1');
  assert.equal(appendEncounter([e], e).length, 1);
});
test('discovery requires repeated reports on multiple dates', () => {
  assert.equal(discoveries([encounter('1')]).length, 0);
  assert.equal(
    discoveries(
      [1, 2, 3, 4].map((i) => encounter(String(i), { localDate: '2026-9-1' })),
    ).length,
    0,
  );
  assert.equal(
    discoveries([1, 2, 3, 4].map((i) => encounter(String(i)))).length,
    1,
  );
});
test('contradictory and not-started evidence cannot inflate discovery', () => {
  const all = [1, 2, 3, 4].map((i) =>
    encounter(String(i), { notices: i > 2 ? ['nothing'] : ['doorway'] }),
  );
  assert.equal(discoveries(all).length, 0);
  assert.equal(
    discoveries(
      [1, 2, 3, 4].map((i) =>
        encounter(String(i), { outcome: 'not_started', actual: null }),
      ),
    ).length,
    0,
  );
});
test('serialized records remain valid; corrupt records rejected', () => {
  assert.equal(isEncounter(JSON.parse(JSON.stringify(encounter('1')))), true);
  assert.equal(isEncounter({ id: 'bad' }), false);
  assert.equal(isEncounter(encounter('1', { actual: 99 })), false);
});
test('a discovery retains its history when later evidence is mixed', () => {
  const initial = [1, 2, 3, 4].map((i) => encounter(String(i)));
  const later = [5, 6, 7, 8].map((i) =>
    encounter(String(i), { notices: ['nothing'] }),
  );
  const d = discoveries([...initial, ...later])[0];
  assert.ok(d);
  assert.equal(d.contrary.length, 4);
  assert.match(d.body, /mixed/);
});
