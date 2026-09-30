import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidate,
  infer,
  validScale,
  remaining,
  observation,
  compare,
  nextStepLine,
  patternEvidence,
  toggleNotice,
  appendEncounter,
  updateEncounter,
  worryLine,
  lastPurpose,
  discoveries,
  isEncounter,
  isSession,
  isCandidate,
  needsCare,
  resistanceChoices,
  stepReasons,
  blankStepHints,
  noticeCodes,
  noticeLabels,
  noticingChoices,
  urgeOnReturn,
  isLateReturn,
  startedDay,
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
// The general form of the bug above, not tied to the water/"feel" regex specifically:
// candidate() re-derives territory from a crude resistance-only table on every call,
// discarding whatever the actually-recorded encounter's territory was. Any situation the
// table's regexes can't reproduce — here, resistance "start" always maps to fog, but this
// encounter was filed under "unknown" — silently flips on the very next recompute, live
// on the Map screen's "Today's Threshold" card, while the map thumbnail beside it (built
// straight from history, not recomputed) still correctly shows the original territory.
test('a recorded territory the resistance table would not reproduce stays fixed on the next preview', () => {
  const situation =
    'calling the dentist to reschedule an appointment I keep putting off';
  const prior = [
    encounter('1', {
      situation,
      resistance: 'start',
      territory: 'unknown',
      template: 'model-own_step-v1',
      action: 'Call and reschedule for next week',
      title: 'Take One Small Step',
      minutes: 3,
    }),
  ];
  assert.equal(candidate(situation, 'start', prior).territory, 'unknown');
  // A genuinely new situation+resistance pair, with no recorded territory to preserve,
  // still falls back to the table normally.
  assert.equal(candidate('a brand new proposal', 'start').territory, 'fog');
  // The safety-critical guard still overrides even a stored non-safety territory: it is
  // read from the current situation text every time, not cached from history.
  assert.equal(
    candidate('ask my doctor about the surgery next week', 'unpleasant', [
      encounter('2', {
        situation: 'ask my doctor about the surgery next week',
        resistance: 'unpleasant',
        territory: 'water',
      }),
    ]).territory,
    'unknown',
  );
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
test('compare summarizes prediction versus actual in plain words', () => {
  assert.equal(
    compare(encounter('1', { prediction: 5, actual: 5 })).heading,
    'About what you expected',
  );
  assert.equal(
    compare(encounter('1', { prediction: 5, actual: 4 })).heading,
    'A little easier than you expected',
  );
  assert.equal(
    compare(encounter('1', { prediction: 4, actual: 5 })).heading,
    'A little harder than you expected',
  );
  assert.equal(
    compare(encounter('1', { prediction: 7, actual: 2 })).heading,
    'Easier than you expected',
  );
  assert.equal(
    compare(encounter('1', { prediction: 2, actual: 7 })).heading,
    'Harder than you expected',
  );
  assert.equal(
    compare(encounter('1', { prediction: 5, actual: 5 })).numbers,
    'Expected 5, felt 5',
  );
  assert.equal(
    compare(encounter('1', { outcome: 'not_started', actual: null })),
    null,
  );
});
test('nextStepLine only claims what next actually offers', () => {
  const stopped = encounter('1', { outcome: 'stopped', minutes: 3 });
  assert.equal(
    nextStepLine(stopped, { minutes: 1 }),
    'Next time, try 1 minute instead of 3 minutes.',
  );
  const water = encounter('1', { outcome: 'stopped', minutes: 1 });
  assert.equal(
    nextStepLine(water, { minutes: 1 }),
    'You can make the next one smaller.',
  );
  const notStarted = encounter('1', {
    outcome: 'not_started',
    actual: null,
    minutes: 3,
  });
  assert.equal(
    nextStepLine(notStarted, { minutes: 1 }),
    'A shorter version of this step is on Home when you’re ready.',
  );
  assert.equal(
    nextStepLine(notStarted, { minutes: 3 }),
    'Your step is on Home when you’re ready.',
  );
  const hard = encounter('1', { outcome: 'attempted', actual: 9, minutes: 3 });
  assert.equal(
    nextStepLine(hard, { minutes: 1 }),
    'Next time, try 1 minute instead of 3 minutes.',
  );
  const normal = encounter('1', {
    outcome: 'attempted',
    actual: 4,
    minutes: 3,
  });
  assert.equal(nextStepLine(normal, { minutes: 1 }), '');
  assert.equal(nextStepLine(normal, null), '');
});
test('observation titles reflect the three outcomes', () => {
  assert.equal(
    observation(encounter('1', { outcome: 'not_started', actual: null })).title,
    'You didn’t start this time',
  );
  assert.equal(
    observation(encounter('1', { outcome: 'stopped' })).title,
    'You stopped partway',
  );
  assert.equal(
    observation(encounter('1', { prediction: 7, actual: 4 })).title,
    'Easier than you expected',
  );
});
test('observation.code reflects outcome and how prediction compared to actual', () => {
  assert.equal(
    observation(encounter('1', { prediction: 7, actual: 4 })).code,
    'easier',
  );
  assert.equal(
    observation(encounter('1', { prediction: 5, actual: 5 })).code,
    'same',
  );
  assert.equal(
    observation(encounter('1', { prediction: 4, actual: 7 })).code,
    'harder',
  );
  assert.equal(
    observation(encounter('1', { outcome: 'stopped' })).code,
    'stopped',
  );
  assert.equal(
    observation(encounter('1', { outcome: 'not_started', actual: null })).code,
    'not_started',
  );
});
test('patternEvidence merges the count with what the steps were about', () => {
  const discovery = {
    id: 'doorway-fog',
    territory: 'fog',
    title: 'Starting has been the hardest part',
    body: '',
    evidence: ['1', '2', '3', '4'],
    support: ['1', '2', '3'],
    contrary: ['4'],
    rule: 'doorway',
    establishedAt: 0,
  };
  assert.equal(
    patternEvidence(discovery, []),
    'You said so in 3 of the 4 steps where you weren’t sure how to begin.',
  );
});
test('patternEvidence says "all" once every step in the sample supports it', () => {
  const discovery = {
    id: 'carried-water',
    territory: 'water',
    title: '',
    body: '',
    evidence: ['1', '2', '3', '4'],
    support: ['1', '2', '3', '4'],
    contrary: [],
    rule: 'carried',
    establishedAt: 0,
  };
  assert.equal(
    patternEvidence(discovery, []),
    'You said so in all 4 steps where you were avoiding a feeling.',
  );
});
test('patternEvidence appends the partly/yes split for a bluff pattern', () => {
  const discovery = {
    id: 'bluff-spotlight',
    territory: 'spotlight',
    title: '',
    body: '',
    evidence: ['1', '2', '3', '4'],
    support: ['1', '2', '3'],
    contrary: ['4'],
    rule: 'bluff',
    establishedAt: 0,
  };
  const evidence = [
    encounter('1', { worryHappened: 'no' }),
    encounter('2', { worryHappened: 'no' }),
    encounter('3', { worryHappened: 'no' }),
    encounter('4', { worryHappened: 'partly' }),
  ];
  assert.equal(
    patternEvidence(discovery, evidence),
    'In 3 of the 4 steps where you found out, your worry didn’t happen. In 1 it partly did.',
  );
  const both = {
    ...discovery,
    evidence: ['1', '2', '3', '4', '5'],
    support: ['1', '2', '3'],
  };
  assert.equal(
    patternEvidence(both, [
      ...evidence,
      encounter('5', { worryHappened: 'yes' }),
    ]),
    'In 3 of the 5 steps where you found out, your worry didn’t happen. In 1 it partly did, and in 1 it did.',
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
    ['signing the custody agreement my ex sent', 'start'],
  ];
  for (const [situation, resistance] of cases) {
    const result = candidate(situation, resistance);
    assert.equal(result.territory, 'unknown', situation);
    assert.equal(result.action, '', situation);
    assert.equal(result.careful, true, situation);
    assert.equal(needsCare(situation), true, situation);
  }
  assert.equal(needsCare('ask my boss for a raise'), false);
  assert.equal(
    candidate('ask my boss for a raise', 'judged').careful,
    undefined,
  );
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

// A worry check, named on Setup and checked on Return: old predictionNote
// records still load, and the new fields reject inconsistent combinations.
test('an old record without worry fields still loads', () => {
  assert.equal(isSession(encounter('1')), true);
});
test('an invalid worryHappened or worryLater value is rejected', () => {
  assert.equal(
    isSession(
      encounter('1', { worry: 'they will say no', worryHappened: 'maybe' }),
    ),
    false,
  );
  assert.equal(
    isSession(
      encounter('1', {
        worry: 'they will say no',
        worryHappened: 'no',
        worryLater: 'nope',
      }),
    ),
    false,
  );
});
test('worryHappened is rejected when there is no worry to answer for', () => {
  assert.equal(isSession(encounter('1', { worryHappened: 'no' })), false);
  assert.equal(
    isSession(encounter('1', { worry: '  ', worryHappened: 'no' })),
    false,
  );
  assert.equal(
    isSession(
      encounter('1', { worry: 'they will say no', worryHappened: 'no' }),
    ),
    true,
  );
});
test('worryLater is rejected unless the Return answer was unknown', () => {
  assert.equal(
    isSession(
      encounter('1', {
        worry: 'they will say no',
        worryHappened: 'no',
        worryLater: 'yes',
      }),
    ),
    false,
  );
  assert.equal(
    isSession(
      encounter('1', {
        worry: 'they will say no',
        worryHappened: 'unknown',
        worryLater: 'yes',
      }),
    ),
    true,
  );
});

test('worryLine is blank without a worry, quotes it with the outcome otherwise, and uses the later answer when there is one', () => {
  assert.equal(worryLine(encounter('1', { worry: '' })), '');
  assert.equal(
    worryLine(
      encounter('1', { worry: 'they will say no', worryHappened: 'no' }),
    ),
    '“they will say no” That didn’t happen.',
  );
  assert.equal(
    worryLine(
      encounter('1', { worry: 'it will be awkward', worryHappened: 'partly' }),
    ),
    '“it will be awkward” Part of it happened.',
  );
  assert.equal(
    worryLine(
      encounter('1', { worry: 'they will say no', worryHappened: 'yes' }),
    ),
    '“they will say no” That happened.',
  );
  assert.equal(
    worryLine(
      encounter('1', { worry: 'they will say no', worryHappened: 'unknown' }),
    ),
    '“they will say no” You weren’t sure yet.',
  );
  assert.equal(
    worryLine(
      encounter('1', {
        worry: 'they will say no',
        worryHappened: 'unknown',
        worryLater: 'yes',
      }),
    ),
    '“they will say no” That happened.',
  );
});
test('worryLine truncates a long worry to about 120 characters', () => {
  const long = 'a'.repeat(200);
  const line = worryLine(encounter('1', { worry: long, worryHappened: 'no' }));
  assert.ok(line.startsWith(`“${'a'.repeat(120)}…”`));
});

test('updateEncounter patches only worryLater and leaves the order unchanged', () => {
  const all = [encounter('1'), encounter('2'), encounter('3')];
  const updated = updateEncounter(all, '2', { worryLater: 'no' });
  assert.deepEqual(
    updated.map((e) => e.id),
    ['1', '2', '3'],
  );
  assert.equal(updated[1].worryLater, 'no');
  assert.equal(updated[0], all[0]);
  assert.equal(updated[2], all[2]);
});

test('bluff ignores encounters that were never asked, left unknown, only answered later, or not started', () => {
  const territory = 'spotlight';
  const all = [1, 2, 3, 4].map((i) =>
    encounter(String(i), { territory, worryHappened: undefined }),
  );
  assert.equal(
    discoveries(all).some((d) => d.rule === 'bluff'),
    false,
  );
  const unknownOnly = [1, 2, 3, 4].map((i) =>
    encounter(String(i), { territory, worryHappened: 'unknown' }),
  );
  assert.equal(
    discoveries(unknownOnly).some((d) => d.rule === 'bluff'),
    false,
  );
  const laterOnly = [1, 2, 3, 4].map((i) =>
    encounter(String(i), {
      territory,
      worryHappened: 'unknown',
      worryLater: 'no',
    }),
  );
  assert.equal(
    discoveries(laterOnly).some((d) => d.rule === 'bluff'),
    false,
  );
  const notStarted = [1, 2, 3, 4].map((i) =>
    encounter(String(i), {
      territory,
      outcome: 'not_started',
      actual: null,
      worryHappened: 'no',
    }),
  );
  assert.equal(
    discoveries(notStarted).some((d) => d.rule === 'bluff'),
    false,
  );
});
test('bluff skips interleaved unknown answers instead of counting them against the window', () => {
  const territory = 'spotlight';
  const d = discoveries([
    encounter('1', { territory, worryHappened: 'no' }),
    encounter('2', { territory, worryHappened: 'unknown' }),
    encounter('3', { territory, worryHappened: 'no' }),
    encounter('4', {
      territory,
      worryHappened: 'unknown',
      worryLater: 'no',
    }),
    encounter('5', { territory, worryHappened: 'no' }),
    encounter('6', { territory, worryHappened: 'yes' }),
  ]).find((x) => x.rule === 'bluff');
  assert.ok(d);
  assert.deepEqual(d.evidence, ['1', '3', '5', '6']);
  assert.doesNotMatch(d.body, /mixed/);
});
test('a not-started encounter has no worry answer and no worry line', () => {
  const skipped = encounter('1', {
    outcome: 'not_started',
    actual: null,
    worry: 'they will say no',
  });
  assert.equal(isEncounter(skipped), true);
  assert.equal(worryLine(skipped), '');
  assert.equal(isEncounter({ ...skipped, worryHappened: 'no' }), false);
});
test('bluff needs at least four samples on at least three dates, and at least 75% support', () => {
  const territory = 'spotlight';
  const answered = (id, worryHappened, localDate) =>
    encounter(id, { territory, worryHappened, localDate });
  assert.equal(
    discoveries([
      answered('1', 'no', '2026-9-1'),
      answered('2', 'no', '2026-9-2'),
      answered('3', 'no', '2026-9-3'),
    ]).some((d) => d.rule === 'bluff'),
    false,
  );
  assert.equal(
    discoveries([
      answered('1', 'no', '2026-9-1'),
      answered('2', 'no', '2026-9-1'),
      answered('3', 'no', '2026-9-1'),
      answered('4', 'no', '2026-9-1'),
    ]).some((d) => d.rule === 'bluff'),
    false,
  );
  assert.equal(
    discoveries([
      answered('1', 'yes', '2026-9-1'),
      answered('2', 'yes', '2026-9-2'),
      answered('3', 'no', '2026-9-3'),
      answered('4', 'no', '2026-9-4'),
    ]).some((d) => d.rule === 'bluff'),
    false,
  );
  const found = discoveries([
    answered('1', 'no', '2026-9-1'),
    answered('2', 'no', '2026-9-2'),
    answered('3', 'no', '2026-9-3'),
    answered('4', 'yes', '2026-9-4'),
  ]).find((d) => d.rule === 'bluff');
  assert.ok(found);
  assert.equal(found.title, 'Your worries mostly didn’t happen');
  const unanimous = discoveries([
    answered('1', 'no', '2026-9-1'),
    answered('2', 'no', '2026-9-2'),
    answered('3', 'no', '2026-9-3'),
    answered('4', 'no', '2026-9-4'),
  ]).find((d) => d.rule === 'bluff');
  assert.equal(unanimous.title, 'Your worries didn’t happen');
  assert.equal(
    unanimous.body,
    'In each of these steps, what you were worried about didn’t happen.',
  );
});
test('bluff shows mixed evidence like the other rules', () => {
  const territory = 'spotlight';
  const answered = (id, worryHappened, localDate) =>
    encounter(id, { territory, worryHappened, localDate });
  const initial = [1, 2, 3, 4].map((i) =>
    answered(String(i), 'no', `2026-9-${i}`),
  );
  const later = [5, 6, 7, 8].map((i) =>
    answered(String(i), 'yes', `2026-9-${i}`),
  );
  const d = discoveries([...initial, ...later]).find((x) => x.rule === 'bluff');
  assert.ok(d);
  assert.match(d.body, /mixed/);
});
test('bluff does not change the doorway or carried results', () => {
  const all = [1, 2, 3, 4].map((i) => encounter(String(i)));
  const withWorry = [1, 2, 3, 4].map((i) =>
    encounter(String(i), { worryHappened: 'no' }),
  );
  const before = discoveries(all)
    .filter((d) => d.rule !== 'bluff')
    .map((d) => ({ ...d }));
  const after = discoveries(withWorry).filter((d) => d.rule !== 'bluff');
  assert.deepEqual(after, before);
});

test('an encounter cleared to not_started excludes it from bluff evidence, whatever its worry was', () => {
  const notStarted = encounter('1', {
    territory: 'spotlight',
    outcome: 'not_started',
    actual: null,
    worry: 'they will say no',
    worryHappened: undefined,
  });
  assert.equal(isEncounter(notStarted), true);
  assert.equal(
    discoveries([
      notStarted,
      ...[2, 3, 4].map((i) =>
        encounter(String(i), {
          territory: 'spotlight',
          worry: 'they will say no',
          worryHappened: 'no',
        }),
      ),
    ]).some((d) => d.rule === 'bluff'),
    false,
  );
});

test('lastPurpose carries across resistances for the same situation, not across situations', () => {
  const all = [
    encounter('1', {
      situation: 'Starting a proposal',
      purpose: 'so the team can move',
    }),
    encounter('2', {
      situation: 'starting a proposal',
      resistance: 'start',
      purpose: 'to unblock reviewers',
    }),
    encounter('3', {
      situation: 'a different situation',
      purpose: 'something else',
    }),
  ];
  assert.equal(lastPurpose(all, 'STARTING A PROPOSAL'), 'to unblock reviewers');
  assert.equal(lastPurpose(all, 'a different situation'), 'something else');
  assert.equal(lastPurpose(all, 'never seen before'), '');
});

test('isCandidate accepts a purpose up to 300 characters and rejects longer', () => {
  const base = candidate('starting a proposal', 'understand');
  assert.equal(isCandidate(base), true);
  assert.equal(isCandidate({ ...base, careful: true }), true);
  assert.equal(isCandidate({ ...base, careful: 'yes' }), false);
  assert.equal(isCandidate({ ...base, purpose: 'x'.repeat(300) }), true);
  assert.equal(isCandidate({ ...base, purpose: 'x'.repeat(301) }), false);
});
test('stepReasons and blankStepHints cover every resistance with real copy', () => {
  for (const [resistance] of resistanceChoices) {
    assert.equal(typeof stepReasons[resistance], 'string');
    assert.ok(stepReasons[resistance].trim().length > 0);
    assert.ok(!stepReasons[resistance].includes('—'));
    assert.ok(!stepReasons[resistance].includes('--'));
    assert.equal(typeof blankStepHints[resistance], 'string');
    assert.ok(blankStepHints[resistance].trim().length > 0);
    assert.ok(!blankStepHints[resistance].includes('—'));
    assert.ok(!blankStepHints[resistance].includes('--'));
  }
});

// Return only offers three notice options going forward, but earlier records
// used four more codes: those must still validate and still have a label
// wherever they render (History Details), even though Return no longer offers them.
test('retired notice codes still validate and still have a label', () => {
  for (const code of ['easier', 'same', 'harder']) {
    assert.equal(isSession(encounter('1', { notices: [code] })), true);
    assert.equal(typeof noticeLabels[code], 'string');
    assert.ok(noticeLabels[code].trim().length > 0);
  }
  // Every code the app has ever stored has a label, not just the retired ones.
  for (const code of noticeCodes) assert.ok(noticeLabels[code]);
});
test('Return offers exactly three notice options', () => {
  assert.deepEqual(
    noticingChoices.map(([code]) => code),
    ['doorway', 'carried', 'other'],
  );
});
test('a stop always overrides the urge with "stopped", never the answer already given', () => {
  assert.equal(urgeOnReturn(true, ''), 'stopped');
  assert.equal(urgeOnReturn(true, 'no'), 'stopped');
  assert.equal(urgeOnReturn(false, 'stayed'), 'stayed');
  assert.equal(urgeOnReturn(false, ''), '');
});
test('a return counts as late only strictly past 30 minutes after the timer ended', () => {
  const s = encounter('1', { startedAt: 0, minutes: 3 });
  const end = 3 * 60000 + 30 * 60000;
  assert.equal(isLateReturn(s, end), false);
  assert.equal(isLateReturn(s, end + 1), true);
});

test('startedDay says today, yesterday, or the date', () => {
  const now = new Date(2026, 8, 29, 9, 0).getTime();
  assert.equal(startedDay(new Date(2026, 8, 29, 0, 5).getTime(), now), 'today');
  assert.equal(
    startedDay(new Date(2026, 8, 28, 23, 50).getTime(), now),
    'yesterday',
  );
  assert.match(
    startedDay(new Date(2026, 8, 26, 12).getTime(), now),
    /^on .*26/,
  );
});
