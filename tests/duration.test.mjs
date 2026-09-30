import test from 'node:test';
import assert from 'node:assert/strict';
import { statedMinutes } from '../lib/duration.ts';

test('statedMinutes reads seconds, rounding up to a whole minute', () => {
  assert.equal(statedMinutes('try for 20 seconds'), 1);
  assert.equal(statedMinutes('do 30 secs of this'), 1);
  assert.equal(statedMinutes('just 45s'), 1);
  assert.equal(statedMinutes('spend 90 seconds on it'), 2);
});

test('statedMinutes reads minutes as digits or number words', () => {
  assert.equal(statedMinutes('a minute'), 1);
  assert.equal(statedMinutes('one minute'), 1);
  assert.equal(statedMinutes('1 min'), 1);
  assert.equal(statedMinutes('15 mins'), 15);
  assert.equal(statedMinutes('for 5 minutes'), 5);
  assert.equal(statedMinutes('a 10-minute walk'), 10);
  assert.equal(statedMinutes('two minutes'), 2);
  assert.equal(statedMinutes('fifteen minutes'), 15);
  assert.equal(statedMinutes('twenty minutes'), 20);
  assert.equal(statedMinutes('thirty minutes'), 30);
});

test('statedMinutes reads hour phrases, clamped', () => {
  assert.equal(statedMinutes('half an hour'), 30);
  assert.equal(statedMinutes('an hour'), 30);
});

test('statedMinutes clamps to 30 minutes', () => {
  assert.equal(statedMinutes('45 minutes'), 30);
  assert.equal(statedMinutes('60 minutes'), 30);
});

test('statedMinutes returns null when nothing is stated', () => {
  assert.equal(
    statedMinutes('open the draft and write a first sentence'),
    null,
  );
  assert.equal(statedMinutes(''), null);
  assert.equal(statedMinutes('call the bank'), null);
});
