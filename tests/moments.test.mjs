import test from 'node:test';
import assert from 'node:assert/strict';
import { recognised } from '../lib/moments.ts';

const m = (id, minute, what, saying = '') => ({
  id,
  createdAt: Date.UTC(2026, 10, 10, 12, minute),
  noticed: 'now',
  what,
  saying,
});

test('recognition matches a line met before, never the entry itself', () => {
  const first = m('a', 0, 'Phone at my desk', 'Just one quick look');
  // Case, spacing, quotes and closing punctuation don't make a line new.
  const again = m('b', 1, 'Phone on the bus', ' “just one  quick look .” ');
  assert.equal(recognised([first, again], again), true);
  // An entry alone, or a later entry, is never "met before".
  assert.equal(recognised([first], first), false);
  assert.equal(recognised([first, again], first), false);
  // A different line is new, even when what was happening repeats.
  const other = m('c', 2, 'Phone at my desk', 'Not now');
  assert.equal(recognised([first, other], other), false);
  // With nothing said, it falls back to what was happening.
  const quiet = m('d', 3, 'phone at my desk.');
  assert.equal(recognised([first, quiet], quiet), true);
});
