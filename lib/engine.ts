export type Territory = 'fog' | 'spotlight' | 'loop' | 'water' | 'unknown';
export type Resistance =
  'understand' | 'start' | 'judged' | 'unpleasant' | 'other' | 'checking';
export type Urge = 'no' | 'stayed' | 'returned' | 'stopped' | '';
export const territories: Record<Territory, { where: string }> = {
  fog: { where: 'weren’t sure how to begin' },
  spotlight: { where: 'were worried how someone would react' },
  loop: { where: 'kept checking or preparing' },
  water: { where: 'were avoiding a feeling' },
  unknown: { where: 'found it hard for another reason' },
};
export const resistanceChoices: [Resistance, string][] = [
  ['start', 'I don’t know where to start.'],
  ['understand', 'I want to feel more certain before I act.'],
  ['judged', 'I’m worried about how someone will react.'],
  ['checking', 'I keep checking or preparing instead of moving ahead.'],
  ['unpleasant', 'I’m trying to avoid the feeling it brings up.'],
  ['other', 'Something else—or I’m not sure yet.'],
];
// The why line under the step on Your step, keyed by the Clarify answer.
export const stepReasons: Record<Resistance, string> = {
  start:
    'Starting is often the hardest part. A rough few minutes is enough to get going, and it doesn’t need to be good.',
  understand:
    'Waiting until you feel sure can take a long time. Doing a little while unsure often tells you more than more thinking would.',
  judged:
    'You can’t know how they’ll react until they see or hear it. A small, real try lets you find out instead of guessing.',
  checking:
    'Each extra check eases the worry briefly, so the next one feels needed too. Stopping after the check that matters lets you find out whether it was enough.',
  unpleasant:
    'Getting away from a feeling brings quick relief, so it’s easy to keep doing. Staying with it for a minute lets you see whether it grows, settles or passes. You can stop any time.',
  other:
    'A step you can start right now is easier to begin, and it still shows you how this really feels.',
};
// Shown above a blank step field, one per Clarify answer.
export const blankStepHints: Record<Resistance, string> = {
  judged:
    'Something someone else will see or hear. For example: say one thing in the meeting, or show someone what you have so far.',
  start:
    'The very first physical action. For example: open it, lay it out, or write one line.',
  understand:
    'Something you can do before you’re sure. For example: pick one option to try, or write down your best guess.',
  checking:
    'The one check that’s needed, then stop. For example: look it over once, then close it.',
  unpleasant:
    'Start and let the feeling be there. For example: do the first two minutes and notice how it feels.',
  other:
    'Something small enough to start now. For example: open the file, or write the first line.',
};
export const careHint =
  'Choose a step that feels safe and manageable. It’s fine to get advice or support first.';
// Every code ever recorded, including retired Return options: stored data
// keeps whatever code it was saved with, so this list only ever grows.
export const noticeCodes = [
  'doorway',
  'easier',
  'carried',
  'same',
  'harder',
  'nothing',
  'other',
] as const;
export type NoticeCode = (typeof noticeCodes)[number];
// A label for every code, so an old entry still renders wherever labels are
// shown (History Details), even once Return stops offering it.
export const noticeLabels: Record<NoticeCode, string> = {
  doorway: 'Starting was the hardest part',
  easier: 'It was easier than I expected',
  carried: 'I felt uncomfortable and did it anyway',
  same: 'It was about as hard as I expected',
  harder: 'It was harder than I expected',
  nothing: 'Nothing stood out',
  other: 'Something else',
};
// The options Return actually offers. 'nothing' is covered by Skip instead.
export const noticingChoices: [NoticeCode, string][] = (
  ['doorway', 'carried', 'other'] as const
).map((code) => [code, noticeLabels[code]]);
export type Candidate = {
  resistanceNote?: string;
  userAction?: string;
  title: string;
  action: string;
  minutes: number;
  territory: Territory;
  secondary: Territory[];
  resistance: Resistance;
  template: string;
  situation: string;
  // What this step is for, in the person's own words. Set explicitly by
  // whatever builds the draft (never by a server response) from `lastPurpose`.
  purpose?: string;
  // Sensitive situation: the person writes their own step and is never nudged.
  careful?: boolean;
};
export type Session = Candidate & {
  id: string;
  prediction: number;
  // The old "what do you expect will happen?" note. Superseded by `worry`
  // below; kept only so existing records still load. New sessions write ''.
  predictionNote: string;
  // A concrete worry, named on Setup and checked on Return.
  worry?: string;
  // The Return answer. Set only from Return, and only once.
  worryHappened?: 'no' | 'partly' | 'yes' | 'unknown';
  // A later answer given from the Atlas, only when the Return answer was 'unknown'.
  worryLater?: 'no' | 'partly' | 'yes';
  startedAt: number;
  returnedAt?: number;
  actual: number | null;
  urge: Urge;
  notices: string[];
  note: string;
  stopped: boolean;
};
export type Encounter = Session & {
  outcome: 'attempted' | 'stopped' | 'not_started';
  createdAt: number;
  localDate: string;
};
export function infer(situation: string): {
  resistance: Resistance;
  confident: boolean;
} {
  const s = situation.toLowerCase();
  // Lexical hints are tentative. Negation and overlapping signals need a correction opportunity.
  const checking =
    /\b(recheck(?:ing)?|checking|polishing|perfect(?:ion)?|reread(?:ing)?)\b/.test(
      s,
    );
  const judged =
    /\b(afraid|worried|judg\w*|embarrass\w*)\b/.test(s) &&
    /\b(ask|boss|send|question|people|present\w*)\b/.test(s);
  const uncertain = /\b(unsure|uncertain|understand|structure|research)\b/.test(
    s,
  );
  const negated = /\b(not|never|isn't|aren't|don't|doesn't)\b/.test(s);
  if (checking) return { resistance: 'checking', confident: false };
  if (judged)
    return { resistance: 'judged', confident: !uncertain && !negated };
  if (uncertain) return { resistance: 'understand', confident: false };
  return { resistance: 'start', confident: false };
}
// Mirrors the AI path's own instruction to route coercion/danger/medical-legal-financial/
// safety-critical situations to a blank, user-written step instead of an auto-generated
// one. Conservative on purpose: high-signal phrases only, biased toward under-catching.
export function needsCare(situation: string) {
  return /\b(suicid\w*|self[- ]?harm|end(?:ing)? (my|his|her|their) life|end it all|not want to (live|be here)|better off dead|kill(?:ing)? (myself|him|her|them)|hurt(?:ing)? (myself|someone)|abus\w*|assault\w*|domestic violence|overdose|medication|prescription|diagnos\w*|surgery|lawsuit|attorney|custody battle|eviction|foreclosure|bankrupt\w*|restraining order)\b/i.test(
    situation,
  );
}
export function candidate(
  situation: string,
  resistance: Resistance,
  history: Encounter[] = [],
): Candidate {
  const normalized = situation.trim().toLowerCase();
  const prior = history.filter(
    (e) =>
      e.situation.trim().toLowerCase() === normalized &&
      e.resistance === resistance,
  );
  const last = prior.at(-1);
  const attempted = prior.filter((e) => e.outcome !== 'not_started');
  const smaller =
    !!last && (last.outcome !== 'attempted' || (last.actual ?? 0) >= 8);
  const minutes = smaller ? 1 : 3;
  const span = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const safetyCritical = needsCare(situation);
  // A recurring situation+resistance pair keeps whatever territory it was actually
  // classified as (frequently by the AI, which reasons about the situation directly)
  // instead of re-deriving one from this crude resistance-only table every time. Without
  // this, any AI classification the table's own regexes can't reproduce — not just the
  // water/"feel" case already fixed once — silently flips on the very next recompute,
  // while the stored action/title text for that same encounter does not: this is what
  // produced a "Keep Going Before Checking" (fog) title sitting under a map thumbnail
  // that still correctly showed the encounter filed under "Somewhere new" (unknown).
  const territory: Territory = safetyCritical
    ? 'unknown'
    : (last?.territory ??
      (
        {
          understand: 'fog',
          start: 'fog',
          judged: 'spotlight',
          // Word stems, not exact words: "feel" alone (no "-ing") previously missed water
          // entirely for a genuinely new situation+resistance pair with no prior territory
          // to fall back on.
          unpleasant:
            /\b(feel|emotion|restless|bored|sad|distract|scroll)/i.test(
              situation,
            )
              ? 'water'
              : 'unknown',
          other: 'unknown',
          checking: 'loop',
        } as const
      )[resistance]);
  let title = 'Take One Small Step',
    action = '',
    template = 'user-action';
  const writing = /\b(proposal|document|design doc|essay|report|draft)\b/i.test(
    situation,
  );
  const message = /\b(message|email|reply)\b/i.test(situation);
  const question = /\b(ask|question|clarification)\b/i.test(situation);
  const conversation = /\b(conversation|talk|speak|call)\b/i.test(situation);
  if (territory === 'fog') {
    title =
      attempted.length && !smaller
        ? 'Keep Going Before Checking'
        : 'Start Before You’re Sure';
    if (writing) {
      template = 'draft';
      action =
        attempted.length && !smaller
          ? `Open the draft and spend ${span} adding to one section before checking whether it is right.`
          : `Open the draft and spend ${span} writing three possible sections, even if you’re unsure.`;
    } else if (message) {
      template = 'reply';
      action = `Open the message and spend ${span} writing a first sentence before revising it.`;
    } else if (question) {
      template = 'question';
      action = `Spend ${span} writing the one question you need answered. Ask it without researching the answer first.`;
      title = 'Ask Before You’re Sure';
    }
  }
  if (territory === 'spotlight') {
    title = 'Let Someone See It';
    if (question) {
      template = 'visible-question';
      title = 'Ask Before You’re Sure';
      action = `Write the one question you need answered, then ask the person you had in mind without rehearsing it again. Allow ${span}.`;
    } else if (message) {
      template = 'visible-message';
      title = 'Send Without Another Rehearsal';
      action = `Spend ${span} writing the message. Check the recipient and essential details, then send it without another wording pass.`;
    } else if (writing) {
      template = 'visible-draft';
      title = 'Share One Unfinished Section';
      action = `Choose one unfinished section you are willing to share. Spend ${span} checking essential details, then ask for feedback on that section.`;
    } else if (conversation) {
      template = 'conversation';
      title = 'Begin the Conversation';
      action = `Ask the person you had in mind for a suitable time to talk. Start with one sentence about what matters, without rehearsing the whole conversation. Allow ${span}.`;
    }
  }
  if (territory === 'loop') {
    title = 'Stop After Enough';
    if (writing || message) {
      template = 'end-checking';
      action = `Spend ${span} doing the necessary functional check. Then close the draft without one more polishing pass.`;
    }
  }
  if (territory === 'water') {
    title = 'Stay With It for a Moment';
    template = 'notice-feeling';
    action =
      'For 1 minute, notice the feeling you named before opening a distraction. You can stop whenever you need to.';
  }
  // Preserve the concrete action the user wrote instead of discarding it on the next visit.
  const lastDefault = last ? candidate(last.situation, last.resistance) : null;
  const userAction =
    last?.userAction ??
    (last?.template.endsWith('-v1') &&
    lastDefault &&
    last.action !== lastDefault.action
      ? last.action
      : undefined);
  if (userAction?.trim()) {
    action = smaller
      ? `For ${span}, try just the beginning of this step: ${userAction}`
      : userAction;
    template = 'user-action';
  }
  if (smaller) title = 'Make the Step Smaller';
  return {
    title,
    action,
    minutes: territory === 'water' ? 1 : minutes,
    territory,
    secondary: [],
    resistance,
    template: `${template}-${attempted.length ? 'continue' : 'first'}-v2`,
    situation: situation.trim(),
    resistanceNote: last?.resistanceNote,
    userAction,
    ...(safetyCritical ? { careful: true } : {}),
  };
}
// The most recent purpose named for this situation, across any resistance.
// Returns '' when there is none, so callers can spread it in unconditionally.
export function lastPurpose(history: Encounter[], situation: string): string {
  const normalized = situation.trim().toLowerCase();
  const prior = history.filter(
    (e) => e.situation.trim().toLowerCase() === normalized && e.purpose?.trim(),
  );
  return prior.at(-1)?.purpose ?? '';
}
export function validScale(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10;
}
export function remaining(s: Session, now: number) {
  return Math.max(0, Math.ceil((s.startedAt + s.minutes * 60000 - now) / 1000));
}
// Stopping partway answers the urge question itself, so it always overrides
// whatever urge was already recorded; Return never asks it again.
export function urgeOnReturn(stopped: boolean, current: Urge): Urge {
  return stopped ? 'stopped' : current;
}
// More than 30 minutes after the timer ended, Timer stops assuming the
// person is still nearby and asks what happened instead of counting down.
export function isLateReturn(s: Session, now: number) {
  return now > s.startedAt + s.minutes * 60000 + 30 * 60000;
}
// "today", "yesterday", or "on Tuesday, September 29", for the late-return line.
export function startedDay(startedAt: number, now: number) {
  const day = (t: number) => new Date(t).toDateString();
  if (day(startedAt) === day(now)) {
    return 'today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day(startedAt) === yesterday.toDateString()) {
    return 'yesterday';
  }
  return `on ${new Date(startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })}`;
}
function minuteSpan(minutes: number) {
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}
// A quiet, plain comparison of what was expected against what happened.
// Returns null before Return, when there is nothing yet to compare.
export function compare(
  e: Encounter,
): { heading: string; numbers: string } | null {
  if (e.actual === null) {
    return null;
  }
  const diff = e.prediction - e.actual;
  const heading =
    diff >= 2
      ? 'Easier than you expected'
      : diff === 1
        ? 'A little easier than you expected'
        : diff === 0
          ? 'About what you expected'
          : diff === -1
            ? 'A little harder than you expected'
            : 'Harder than you expected';
  return { heading, numbers: `Expected ${e.prediction}, felt ${e.actual}` };
}
// What, if anything, to say about the next step: only true when it is
// actually true against `next`, the step candidate() would offer on Home.
export function nextStepLine(
  last: Encounter,
  next: { minutes: number } | null,
): string {
  if (!next) {
    return '';
  }
  const shorter = next.minutes < last.minutes;
  if (last.outcome === 'stopped') {
    return shorter
      ? `Next time, try ${minuteSpan(next.minutes)} instead of ${minuteSpan(last.minutes)}.`
      : 'You can make the next one smaller.';
  }
  if (last.outcome === 'not_started') {
    return shorter
      ? 'A shorter version of this step is on Home when you’re ready.'
      : 'Your step is on Home when you’re ready.';
  }
  if ((last.actual ?? 0) >= 8 && shorter) {
    return `Next time, try ${minuteSpan(next.minutes)} instead of ${minuteSpan(last.minutes)}.`;
  }
  return '';
}
export function observation(
  e: Encounter,
  next: { minutes: number } | null = null,
) {
  if (e.outcome === 'not_started') {
    return {
      title: 'You didn’t start this time',
      body: nextStepLine(e, next),
      code: 'not_started',
    };
  }
  if (e.outcome === 'stopped') {
    return {
      title: 'You stopped partway',
      body: nextStepLine(e, next),
      code: 'stopped',
    };
  }
  const diff = e.prediction - (e.actual ?? 0);
  const code =
    diff >= 2
      ? 'easier'
      : diff === 1
        ? 'little_easier'
        : diff === 0
          ? 'same'
          : diff === -1
            ? 'little_harder'
            : 'harder';
  return {
    title: compare(e)?.heading ?? '',
    body: nextStepLine(e, next),
    code,
  };
}
export function toggleNotice(current: string[], code: string) {
  if (code === 'nothing') return current.includes(code) ? [] : ['nothing'];
  const clean = current.filter((x) => x !== 'nothing');
  return clean.includes(code)
    ? clean.filter((x) => x !== code)
    : [...clean, code];
}
export function appendEncounter(all: Encounter[], e: Encounter) {
  return all.some((x) => x.id === e.id) ? all : [...all, e];
}
// Encounters are otherwise immutable. This is the one narrow exception: a
// worry left unanswered on Return ('unknown') can be answered later.
export function updateEncounter(
  all: Encounter[],
  id: string,
  patch: { worryLater: NonNullable<Encounter['worryLater']> },
) {
  return all.map((e) => (e.id === id ? { ...e, ...patch } : e));
}
// A quiet caption pairing the person's own worry with what happened, for
// Observation and the Atlas. Uses the later Atlas answer when there is one.
export function worryLine(e: Encounter) {
  const trimmed = e.worry?.trim() ?? '';
  if (!trimmed || e.outcome === 'not_started') {
    return '';
  }
  const worry =
    trimmed.length > 120 ? `${trimmed.slice(0, 120).trim()}…` : trimmed;
  const answer = e.worryLater ?? e.worryHappened;
  const status =
    answer === 'no'
      ? 'That didn’t happen.'
      : answer === 'partly'
        ? 'Part of it happened.'
        : answer === 'yes'
          ? 'That happened.'
          : answer === 'unknown'
            ? 'You weren’t sure yet.'
            : '';
  return status ? `“${worry}” ${status}` : `“${worry}”`;
}
export type Discovery = {
  id: string;
  territory: Territory;
  title: string;
  body: string;
  evidence: string[];
  support: string[];
  contrary: string[];
  rule: 'doorway' | 'carried' | 'bluff';
  establishedAt: number;
};
export function supports(e: Encounter, rule: 'doorway' | 'carried') {
  if (
    e.outcome !== 'attempted' ||
    e.urge === 'stopped' ||
    e.notices.includes('nothing')
  )
    return false;
  if (rule === 'doorway') return e.notices.includes('doorway');
  return (
    e.notices.includes('carried') &&
    (e.actual ?? 0) > 0 &&
    ['stayed', 'returned', 'no'].includes(e.urge)
  );
}
type DiscoveryRule = {
  rule: Discovery['rule'];
  // Which encounters in a territory count toward this rule at all.
  eligible: (e: Encounter) => boolean;
  // Which of those eligible encounters count as supporting evidence.
  supports: (e: Encounter) => boolean;
  title: string;
  body: string;
  // Copy for when every encounter supports it, so the words match the count.
  unanimous?: { title: string; body: string };
};
// supports() treats stopped and "nothing" as contrary evidence, which is
// right for doorway/carried but wrong for bluff: a worry can resolve either
// way regardless of how the attempt itself went. So bluff gets its own,
// narrower supports() here rather than reusing that one.
const discoveryRules: DiscoveryRule[] = [
  {
    rule: 'doorway',
    eligible: (e) => e.outcome !== 'not_started',
    supports: (e) => supports(e, 'doorway'),
    title: 'Starting has been the hardest part',
    body: 'In most of these steps, starting felt harder than keeping going.',
  },
  {
    rule: 'carried',
    eligible: (e) => e.outcome !== 'not_started',
    supports: (e) => supports(e, 'carried'),
    title: 'You’ve kept going while uncomfortable',
    body: 'In most of these steps, you kept going while discomfort was still there.',
  },
  {
    rule: 'bluff',
    // Only a Return answer counts, never a later Atlas answer: otherwise
    // answering only the good outcomes later could inflate the evidence.
    eligible: (e) =>
      e.outcome !== 'not_started' &&
      ['no', 'partly', 'yes'].includes(e.worryHappened ?? ''),
    supports: (e) => e.worryHappened === 'no',
    title: 'Your worries mostly didn’t happen',
    body: 'In most of these steps, what you were worried about didn’t happen.',
    unanimous: {
      title: 'Your worries didn’t happen',
      body: 'In each of these steps, what you were worried about didn’t happen.',
    },
  },
];
export function discoveries(all: Encounter[]): Discovery[] {
  const unique = [...new Map(all.map((e) => [e.id, e])).values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  return (
    ['fog', 'spotlight', 'loop', 'water', 'unknown'] as Territory[]
  ).flatMap((territory) =>
    discoveryRules.flatMap(
      ({ rule, eligible, supports: supportsRule, title, body, unanimous }) => {
        const eligibleEncounters = unique.filter(
          (e) => e.territory === territory && eligible(e),
        );
        for (let end = 4; end <= eligibleEncounters.length; end++) {
          const sample = eligibleEncounters.slice(Math.max(0, end - 6), end);
          const supporting = sample.filter(supportsRule);
          if (
            new Set(sample.map((e) => e.localDate)).size < 3 ||
            supporting.length < 3 ||
            supporting.length / sample.length < 0.75
          )
            continue;
          const evidence = [...sample, ...eligibleEncounters.slice(end)];
          const support = evidence.filter(supportsRule);
          const mixed = support.length / evidence.length < 0.75;
          const copy =
            unanimous && support.length === evidence.length
              ? unanimous
              : { title, body };
          return [
            {
              id: `${rule}-${territory}`,
              territory,
              rule,
              title: copy.title,
              body: mixed
                ? 'This pattern showed up in earlier steps. More recent steps are mixed.'
                : copy.body,
              evidence: evidence.map((e) => e.id),
              support: support.map((e) => e.id),
              contrary: evidence
                .filter((e) => !support.includes(e))
                .map((e) => e.id),
              establishedAt: sample.at(-1)!.createdAt,
            },
          ];
        }
        return [];
      },
    ),
  );
}
// What a pattern suggests doing, shown under its evidence on the Result screen.
export const patternMeaning: Record<Discovery['rule'], string> = {
  doorway: 'Next time, try making your step just the first action.',
  carried: 'Next time, you don’t have to wait until it feels comfortable.',
  bluff: 'Next time a worry holds you back, remember these steps.',
};
// One sentence scoping a new pattern's heading to the steps behind it, for
// the Result screen. The heading states the finding, so this doesn't repeat it.
export function patternEvidence(d: Discovery, evidence: Encounter[]): string {
  const total = d.evidence.length;
  const support = d.support.length;
  const where = territories[d.territory].where;
  const scope =
    support === total && total >= 4
      ? `all ${total} steps where you ${where}`
      : `${support} of your ${total} steps where you ${where}`;
  if (d.rule !== 'bluff') {
    return `You said so in ${scope}.`;
  }
  const partly = evidence.filter((e) => e.worryHappened === 'partly').length;
  const yes = evidence.filter((e) => e.worryHappened === 'yes').length;
  const other = [
    partly && `in ${partly} it partly did`,
    yes && `in ${yes} it did`,
  ].filter(Boolean);
  const rest = other.join(', and ');
  return other.length
    ? `In ${scope}, your worry didn’t happen. ${rest[0].toUpperCase()}${rest.slice(1)}.`
    : `In ${scope}, your worry didn’t happen.`;
}
export function isCandidate(e: unknown): e is Candidate {
  if (!e || typeof e !== 'object') return false;
  const x = e as Candidate;
  return (
    typeof x.situation === 'string' &&
    x.situation.length <= 2000 &&
    typeof x.action === 'string' &&
    x.action.length <= 2000 &&
    typeof x.title === 'string' &&
    x.title.length <= 200 &&
    typeof x.template === 'string' &&
    (x.userAction === undefined ||
      (typeof x.userAction === 'string' && x.userAction.length <= 1000)) &&
    (x.resistanceNote === undefined ||
      (typeof x.resistanceNote === 'string' &&
        x.resistanceNote.length <= 1000)) &&
    (x.careful === undefined || typeof x.careful === 'boolean') &&
    Object.hasOwn(territories, x.territory) &&
    [
      'understand',
      'start',
      'judged',
      'unpleasant',
      'other',
      'checking',
    ].includes(x.resistance) &&
    Number.isFinite(x.minutes) &&
    x.minutes > 0 &&
    x.minutes <= 30 &&
    Array.isArray(x.secondary) &&
    x.secondary.every((t) => Object.hasOwn(territories, t)) &&
    (x.purpose === undefined ||
      (typeof x.purpose === 'string' && x.purpose.length <= 300))
  );
}
export function isSession(e: unknown): e is Session {
  if (!isCandidate(e)) return false;
  const x = e as Session;
  return (
    typeof x.id === 'string' &&
    x.id.length > 0 &&
    x.id.length <= 200 &&
    typeof x.stopped === 'boolean' &&
    validScale(x.prediction) &&
    (x.actual === null || validScale(x.actual)) &&
    Number.isFinite(x.startedAt) &&
    ['', 'no', 'stayed', 'returned', 'stopped'].includes(x.urge) &&
    Array.isArray(x.notices) &&
    x.notices.every((n) => (noticeCodes as readonly string[]).includes(n)) &&
    typeof x.predictionNote === 'string' &&
    typeof x.note === 'string' &&
    (x.worry === undefined ||
      (typeof x.worry === 'string' && x.worry.length <= 1000)) &&
    (x.worryHappened === undefined ||
      (['no', 'partly', 'yes', 'unknown'].includes(x.worryHappened) &&
        !!x.worry?.trim())) &&
    (x.worryLater === undefined ||
      (['no', 'partly', 'yes'].includes(x.worryLater) &&
        x.worryHappened === 'unknown'))
  );
}
export function isEncounter(e: unknown): e is Encounter {
  if (!isSession(e)) return false;
  const x = e as Encounter;
  return (
    ['attempted', 'stopped', 'not_started'].includes(x.outcome) &&
    (x.outcome === 'not_started'
      ? x.actual === null && x.worryHappened === undefined
      : validScale(x.actual)) &&
    Number.isFinite(x.createdAt) &&
    typeof x.localDate === 'string' &&
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(x.localDate)
  );
}
