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
  ['understand', 'I want to understand it first'],
  ['start', 'I don’t know where to start'],
  ['judged', 'I’m worried I’ll do it badly'],
  ['unpleasant', 'It just feels unpleasant to begin'],
  ['other', 'Something else'],
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
  if (/\b(recheck|checking|polishing|perfect)\b/.test(s))
    return { resistance: 'checking', confident: false };
  if (
    /\b(afraid|worried|judg|embarrass)/.test(s) &&
    /\b(ask|boss|send|question|people|present)/.test(s)
  )
    return { resistance: 'judged', confident: true };
  if (/\b(unsure|uncertain|understand|structure|research)\b/.test(s))
    return { resistance: 'understand', confident: false };
  return { resistance: 'start', confident: false };
}
export function candidate(
  situation: string,
  resistance: Resistance,
  history: Encounter[] = [],
): Candidate {
  const prior = history.filter(
    (e) => e.situation === situation && e.outcome !== 'not_started',
  );
  const last = prior.at(-1);
  const smaller =
    last && (last.outcome === 'stopped' || (last.actual ?? 0) >= 8);
  const minutes = smaller ? 1 : 3;
  const territory: Territory = (
    {
      understand: 'fog',
      start: 'fog',
      judged: 'spotlight',
      unpleasant: 'water',
      other: 'unknown',
      checking: 'loop',
    } as const
  )[resistance];
  let title = 'Take One Small Step',
    action = '';
  if (territory === 'fog') {
    title =
      prior.length && !smaller
        ? 'Keep Going Before Checking'
        : 'Start Before You Know';
    if (/\b(proposal|document|design doc)\b/i.test(situation))
      action =
        prior.length && !smaller
          ? `Open the draft and spend ${minutes} minutes adding to one section before checking whether it is right.`
          : `Open the draft and spend ${minutes} minute${minutes === 1 ? '' : 's'} writing three possible sections, even if you’re unsure.`;
    else if (/\b(message|email|reply)\b/i.test(situation))
      action = `Open the message and spend ${minutes} minute${minutes === 1 ? '' : 's'} writing a first sentence before revising it.`;
  }
  if (territory === 'spotlight') title = 'Let It Be Seen';
  if (territory === 'loop') title = 'Stop After Enough';
  if (territory === 'water') title = 'Stay With It for a Moment';
  if (smaller) title = 'Make the Step Smaller';
  return {
    title,
    action,
    minutes: territory === 'water' ? 1 : minutes,
    territory,
    secondary: [],
    resistance,
    template: `${resistance}-${prior.length ? 'continue' : 'first'}-v1`,
    situation,
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
export function discoveries(all: Encounter[]) {
  return (
    ['fog', 'spotlight', 'loop', 'water', 'unknown'] as Territory[]
  ).flatMap((territory) => {
    const eligible = all.filter(
      (e) => e.territory === territory && e.outcome !== 'not_started',
    );
    for (let end = 4; end <= eligible.length; end++) {
      const sample = eligible.slice(Math.max(0, end - 6), end);
      const supporting = sample.filter(
        (e) => observation(e).code === 'doorway',
      );
      if (
        new Set(sample.map((e) => e.localDate)).size < 3 ||
        supporting.length < 3 ||
        supporting.length / sample.length < 0.75
      )
        continue;
      const evidence = [
        ...new Map(
          [...sample, ...eligible.slice(end)].map((e) => [e.id, e]),
        ).values(),
      ];
      const support = evidence.filter((e) => observation(e).code === 'doorway');
      const mixed = support.length / evidence.length < 0.75;
      return [
        {
          id: `doorway-${territory}`,
          territory,
          title: 'The Doorway Is Worse Than the Room',
          body: mixed
            ? 'This pattern appeared in earlier encounters. More recent evidence is mixed.'
            : 'Across these encounters, starting often felt harder than continuing.',
          evidence: evidence.map((e) => e.id),
          support: support.map((e) => e.id),
          contrary: evidence
            .filter((e) => !support.includes(e))
            .map((e) => e.id),
        },
      ];
    }
    return [];
  });
}
export function isCandidate(e: unknown): e is Candidate {
  if (!e || typeof e !== 'object') return false;
  const x = e as Candidate;
  return (
    typeof x.situation === 'string' &&
    typeof x.action === 'string' &&
    typeof x.title === 'string' &&
    x.territory in territories &&
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
    x.secondary.every((t) => t in territories)
  );
}
export function isSession(e: unknown): e is Session {
  if (!isCandidate(e)) return false;
  const x = e as Session;
  return (
    typeof x.id === 'string' &&
    validScale(x.prediction) &&
    (x.actual === null || validScale(x.actual)) &&
    Number.isFinite(x.startedAt) &&
    ['', 'no', 'stayed', 'returned', 'stopped'].includes(x.urge) &&
    Array.isArray(x.notices) &&
    x.notices.every((n) => typeof n === 'string') &&
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
    typeof x.localDate === 'string'
  );
}
