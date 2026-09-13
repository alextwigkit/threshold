export type Territory = 'fog' | 'spotlight' | 'loop' | 'water' | 'unknown';
export type Resistance =
  | 'understand'
  | 'start'
  | 'judged'
  | 'unpleasant'
  | 'other'
  | 'checking';
export type Urge = 'no' | 'stayed' | 'returned' | 'stopped' | '';
export const territories: Record<
  Territory,
  { name: string; description: string }
> = {
  fog: {
    name: 'The Fog',
    description:
      'The territory of uncertainty—when action has to happen before everything is clear.',
  },
  spotlight: {
    name: 'The Spotlight',
    description: 'When being seen or heard is part of the hard thing.',
  },
  loop: {
    name: 'The Open Loop',
    description: 'When stopping means leaving some uncertainty unresolved.',
  },
  water: {
    name: 'Still Water',
    description:
      'When an unpleasant feeling is here, without needing to fix it first.',
  },
  unknown: {
    name: 'Somewhere new',
    description:
      'Start with the situation. The shape of this territory can come later.',
  },
};
export const resistanceChoices: [Resistance, string][] = [
  ['start', 'I don’t know where to start.'],
  ['understand', 'I want to feel more certain before I act.'],
  ['judged', 'I’m worried about how someone will react.'],
  ['checking', 'I keep checking or preparing instead of moving ahead.'],
  ['unpleasant', 'I’m trying to avoid the feeling it brings up.'],
  ['other', 'Something else—or I’m not sure yet.'],
];
export const noticingChoices = [
  ['doorway', 'Starting was harder than continuing'],
  ['easier', 'It was easier than I expected'],
  ['carried', 'I was uncomfortable and could still work'],
  ['same', 'It was about as hard as I expected'],
  ['harder', 'It was harder than I expected'],
  ['nothing', 'Nothing stood out'],
  ['other', 'Something else'],
] as const;
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
};
export type Session = Candidate & {
  id: string;
  prediction: number;
  predictionNote: string;
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
  const territory: Territory = (
    {
      understand: 'fog',
      start: 'fog',
      judged: 'spotlight',
      unpleasant:
        /\b(feeling|emotion|restless|boredom|sadness|distraction|scrolling)\b/i.test(
          situation,
        )
          ? 'water'
          : 'unknown',
      other: 'unknown',
      checking: 'loop',
    } as const
  )[resistance];
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
        : 'Start Before You Know';
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
    title = 'Let It Be Seen';
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
  };
}
export function validScale(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 10;
}
export function remaining(s: Session, now: number) {
  return Math.max(0, Math.ceil((s.startedAt + s.minutes * 60000 - now) / 1000));
}
export function observation(e: Encounter) {
  if (e.outcome === 'not_started')
    return {
      title: 'A Step for Another Time',
      body: 'You didn’t start this time. You can change the step when you’re ready.',
      code: 'not_started',
    };
  if (e.outcome === 'stopped')
    return {
      title: 'You Found a Stopping Point',
      body: 'You approached it, and then stopped. That is part of this encounter, too.',
      code: 'stopped',
    };
  if (e.notices.includes('doorway'))
    return {
      title: 'The Doorway Felt Worse',
      body: 'This time, starting felt harder than continuing. Let’s see if it happens again.',
      code: 'doorway',
    };
  if (
    e.notices.includes('carried') &&
    (e.actual ?? 0) > 0 &&
    ['stayed', 'returned', 'no'].includes(e.urge)
  )
    return {
      title: 'Uncomfortable, and Still Here',
      body: 'This time, you could act while some discomfort was still here.',
      code: 'carried',
    };
  if (
    e.actual !== null &&
    e.actual < e.prediction &&
    e.notices.includes('easier')
  )
    return {
      title: 'Different Than Expected',
      body: 'This encounter felt easier than you expected. That is one piece of your map.',
      code: 'easier',
    };
  return {
    title: 'An Encounter, Recorded',
    body: 'This is what happened this time. It doesn’t need to become a lesson.',
    code: 'neutral',
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
export type Discovery = {
  id: string;
  territory: Territory;
  title: string;
  body: string;
  evidence: string[];
  support: string[];
  contrary: string[];
  rule: 'doorway' | 'carried';
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
export function discoveries(all: Encounter[]): Discovery[] {
  const unique = [...new Map(all.map((e) => [e.id, e])).values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  return (
    ['fog', 'spotlight', 'loop', 'water', 'unknown'] as Territory[]
  ).flatMap((territory) =>
    (['doorway', 'carried'] as const).flatMap((rule) => {
      const eligible = unique.filter(
        (e) => e.territory === territory && e.outcome !== 'not_started',
      );
      for (let end = 4; end <= eligible.length; end++) {
        const sample = eligible.slice(Math.max(0, end - 6), end);
        const supporting = sample.filter((e) => supports(e, rule));
        if (
          new Set(sample.map((e) => e.localDate)).size < 3 ||
          supporting.length < 3 ||
          supporting.length / sample.length < 0.75
        )
          continue;
        const evidence = [...sample, ...eligible.slice(end)];
        const support = evidence.filter((e) => supports(e, rule));
        const mixed = support.length / evidence.length < 0.75;
        return [
          {
            id: `${rule}-${territory}`,
            territory,
            rule,
            title:
              rule === 'doorway'
                ? 'The Doorway Is Worse Than the Room'
                : 'You Can Act While Uncomfortable',
            body: mixed
              ? 'This pattern appeared in earlier encounters. More recent evidence is mixed.'
              : rule === 'doorway'
                ? 'Across these encounters, starting often felt harder than continuing.'
                : 'Across these encounters, you acted while discomfort was still present.',
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
    }),
  );
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
    x.secondary.every((t) => Object.hasOwn(territories, t))
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
    x.notices.every((n) => noticingChoices.some(([code]) => code === n)) &&
    typeof x.predictionNote === 'string' &&
    typeof x.note === 'string'
  );
}
export function isEncounter(e: unknown): e is Encounter {
  if (!isSession(e)) return false;
  const x = e as Encounter;
  return (
    ['attempted', 'stopped', 'not_started'].includes(x.outcome) &&
    (x.outcome === 'not_started' ? x.actual === null : validScale(x.actual)) &&
    Number.isFinite(x.createdAt) &&
    typeof x.localDate === 'string' &&
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(x.localDate)
  );
}
