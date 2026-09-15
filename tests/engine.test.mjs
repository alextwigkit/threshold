import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidate,
  infer,
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
// A real bug: "feel" (not "feeling") missed water entirely. That silently reclassified
// the Map screen's "Today's Threshold" preview to a different territory than the AI
// action text still shown for it, producing a title/minutes that contradicted the action
// underneath ("3 min" next to "For 1 minute, notice...").
test('the word stem "feel" routes to water, not just the exact word "feeling"', () => {
  assert.equal(
    candidate(
      'sitting to meditate when i feel activated and energized and slightly uncomfortable',
      'unpleasant',
    ).territory,
    'water',
  );
});
test('an AI-suggested water action stays consistent with its own title and minutes on the next preview', () => {
  const situation =
    'sitting to meditate when i feel activated and energized and slightly uncomfortable';
  const prior = [
    encounter('1', {
      situation,
      resistance: 'unpleasant',
      territory: 'water',
      template: 'model-notice-v1',
      action:
        'For 1 minute, notice the activation before opening a distraction. You can stop whenever you need to.',
      title: 'Stay With It for a Moment',
      minutes: 1,
    }),
  ];
  const next = candidate(situation, 'unpleasant', prior);
  assert.equal(next.territory, 'water');
  assert.equal(next.minutes, 1);
  assert.equal(next.title, 'Stay With It for a Moment');
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
// infer() had zero coverage: BEHAVIOR_ENGINE.md asks to evaluate ambiguity, negation,
// unfamiliar phrasing and user correction, and the only branch that can ever skip
// clarification (confident: true) is 'judged'. Every other branch always asks the person
// to confirm, which is the actual safety property worth pinning here.
test('infer only ever skips clarification for a clean, unnegated judged read', () => {
  assert.deepEqual(infer('polishing the deck one more time before sending'), {
    resistance: 'checking',
    confident: false,
  });
  assert.deepEqual(infer("I'm worried what my boss will think if I ask"), {
    resistance: 'judged',
    confident: true,
  });
  assert.deepEqual(infer('I am unsure how to structure this proposal'), {
    resistance: 'understand',
    confident: false,
  });
  assert.deepEqual(infer('xyzzy plugh frobnicate'), {
    resistance: 'start',
    confident: false,
  });
  assert.deepEqual(infer(''), { resistance: 'start', confident: false });
});

test('negation and overlapping uncertainty suppress confidence, not just resistance', () => {
  // Negated judged language must not be treated as a clean judged read.
  assert.equal(
    infer("I'm not afraid to ask, I just don't know where to start").confident,
    false,
  );
  // Judged language mixed with uncertainty is not clean either.
  assert.equal(
    infer('worried about asking because I am unsure how to structure it')
      .confident,
    false,
  );
});

// candidate() deliberately leaves action blank for situations none of its templates
// cover, per BEHAVIOR_ENGINE.md: "require the user to supply the exact action instead
// of inserting the whole situation into an awkward template." This is the boundary that
// makes the app safe for unfamiliar, awkward or high-stakes phrasing it cannot template,
// so it needs a regression guard as much as any template that does fire.
test('an unfamiliar or awkwardly phrased situation leaves the action for the person to write, not a guess', () => {
  const unfamiliar = [
    ['clean my apartment before my parents visit', 'start'],
    ['apply for a new job', 'start'],
    ['confront my abuser about what happened', 'judged'],
  ];
  for (const [situation, resistance] of unfamiliar)
    assert.equal(
      candidate(situation, resistance).action,
      '',
      `"${situation}" should not receive a fabricated action`,
    );
});

// Mirrors the AI path's own instruction to route coercion/danger/medical-legal-financial/
// safety-critical situations to a blank, user-written step. Previously the local path had
// no equivalent: this exact situation matched the generic "conversation" template purely
// because it contains "talk", with no awareness of what the conversation was about.
test('a safety-critical situation is never auto-templated, regardless of which keyword it also happens to match', () => {
  const cases = [
    [
      'talk to my doctor about stopping my medication without telling anyone',
      'judged',
    ],
    ['tell my friend I want to end my life', 'judged'],
    ['call my lawyer about the eviction notice', 'judged'],
    ['ask my doctor about the surgery next week', 'understand'],
  ];
  for (const [situation, resistance] of cases) {
    const result = candidate(situation, resistance);
    assert.equal(result.territory, 'unknown', situation);
    assert.equal(result.action, '', situation);
  }
  // An ordinary conversation without any safety-critical language is unaffected.
  assert.notEqual(
    candidate('ask my boss for a raise', 'judged').action,
    '',
    'ordinary situations must still template normally',
  );
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
