import test from 'node:test';
import assert from 'node:assert/strict';
import { candidate, discoveries } from '../lib/engine.ts';
import { taken, trailStones, pattern, worryPattern } from '../lib/trail.ts';
const step = (id, overrides = {}) => ({
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

test('an empty history is an empty trail', () => {
  assert.deepEqual(trailStones([]), { stones: [], earlier: 0 });
  assert.equal(pattern([]), '');
});

test('stones run oldest first, with same-moment steps ordered by id', () => {
  const at = Date.UTC(2026, 8, 5);
  const order = taken([
    step('3'),
    step('b', { createdAt: at }),
    step('1'),
    step('a', { createdAt: at }),
  ]).map((e) => e.id);
  assert.deepEqual(order, ['1', '3', 'a', 'b']);
});

test('not starting leaves no stone and does not count as a step', () => {
  const { stones } = trailStones([
    step('1'),
    step('2', { outcome: 'not_started', actual: null }),
    step('3'),
  ]);
  assert.deepEqual(
    stones.map((s) => [s.id, s.step]),
    [
      ['1', 1],
      ['3', 2],
    ],
  );
});

test('a stone carries expected and experienced exactly, including zero', () => {
  const [s] = trailStones([step('1', { prediction: 6, actual: 0 })]).stones;
  assert.equal(s.expected, 6);
  assert.equal(s.experienced, 0);
});

test('stopping early shows on the stone, whether recorded as outcome or urge', () => {
  const { stones } = trailStones([
    step('1'),
    step('2', { outcome: 'stopped' }),
    step('3', { urge: 'stopped' }),
  ]);
  assert.deepEqual(
    stones.map((s) => s.stopped),
    [false, true, true],
  );
});

test('only the latest steps are shown, with a count of the earlier ones', () => {
  const all = ['1', '2', '3', '4', '5', '6'].map((id) => step(id));
  const { stones, earlier } = trailStones(all);
  assert.deepEqual(
    stones.map((s) => s.id),
    ['3', '4', '5', '6'],
  );
  assert.equal(earlier, 2);
  assert.equal(stones[0].step, 3);
});

test('a discovery rings the stone that established it, and no other', () => {
  // Four doorway steps on separate days in one territory qualify on the fourth.
  const all = ['1', '2', '3', '4', '5'].map((id) => step(id));
  const found = discoveries(all).filter((d) => d.rule === 'doorway');
  assert.equal(found.length, 1);
  const { stones } = trailStones(all, found, 10);
  assert.deepEqual(
    stones.filter((s) => s.discoveries.length).map((s) => s.id),
    ['4'],
  );
});

test('the pattern counts steps that felt easier than expected', () => {
  assert.equal(pattern([step('1')]), '');
  assert.equal(
    pattern([
      step('1', { prediction: 6, actual: 3 }),
      step('2', { prediction: 7, actual: 7 }),
      step('3', { prediction: 4, actual: 2 }),
      step('4', { outcome: 'not_started', actual: null }),
    ]),
    '2 of your 3 steps felt easier than you expected.',
  );
  assert.equal(
    pattern([
      step('1', { prediction: 6, actual: 3 }),
      step('2', { prediction: 4, actual: 2 }),
    ]),
    'Both of your steps felt easier than you expected.',
  );
});

test('the worry pattern stays blank below two answered worries, and excludes not-started', () => {
  assert.equal(worryPattern([]), '');
  assert.equal(worryPattern([step('1', { worryHappened: 'no' })]), '');
  assert.equal(
    worryPattern([
      step('1', { worryHappened: 'no' }),
      step('2', {
        outcome: 'not_started',
        actual: null,
        worryHappened: 'no',
      }),
    ]),
    '',
  );
});

test('the worry pattern counts a Return answer or a later Atlas answer, but not an unanswered "can\'t tell yet"', () => {
  assert.equal(
    worryPattern([
      step('1', { worryHappened: 'no' }),
      step('2', { worryHappened: 'yes' }),
      step('3', { worryHappened: 'unknown' }),
    ]),
    'Of 2 worries you followed up on, 1 didn’t happen and 1 did, at least in part.',
  );
  assert.equal(
    worryPattern([
      step('1', { worryHappened: 'no' }),
      step('2', { worryHappened: 'unknown', worryLater: 'no' }),
    ]),
    'Neither worry you followed up on happened.',
  );
  assert.equal(
    worryPattern([
      step('1', { worryHappened: 'partly' }),
      step('2', { worryHappened: 'yes' }),
    ]),
    'Both worries you followed up on happened, at least in part.',
  );
  assert.equal(
    worryPattern([
      step('1', { worryHappened: 'no' }),
      step('2', { worryHappened: 'no' }),
      step('3', { worryHappened: 'no' }),
    ]),
    'None of the 3 worries you followed up on happened.',
  );
});
