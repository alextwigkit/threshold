// A moment of resistance the person noticed, whether or not they acted on it.
// Separate from Encounter: it has no prediction, timer or felt score.
export type Noticed = 'now' | 'today' | 'yesterday';
export type Drift = 'louder' | 'same' | 'fading';
export type Moment = {
  id: string;
  createdAt: number;
  noticed: Noticed;
  what: string;
  // What the resistance said, in the person's words; '' when skipped.
  saying: string;
  // "Watch it for a minute": the guess before, and what it did after.
  guess?: Drift;
  watchStartedAt?: number;
  watched?: Drift;
  // "Name the smallest version", and whether they later marked it tried.
  smallest?: string;
  tried?: boolean;
};
export const noticedChoices: [Noticed, string][] = [
  ['now', 'Just now'],
  ['today', 'Earlier today'],
  ['yesterday', 'Yesterday'],
];
// History dates an entry by when it was written down, so the label says so.
export const noticedLabels: Record<Noticed, string> = {
  now: 'Written down in the moment',
  today: 'Written down later that day',
  yesterday: 'Written down the next day',
};
export const guessChoices: [Drift, string][] = [
  ['louder', 'Get louder'],
  ['same', 'Stay the same'],
  ['fading', 'Fade'],
];
export const watchedChoices: [Drift, string][] = [
  ['louder', 'It got louder'],
  ['same', 'It stayed the same'],
  ['fading', 'It faded'],
];
const guessPhrase: Record<Drift, string> = {
  louder: 'get louder',
  same: 'stay the same',
  fading: 'fade',
};
const drifts = ['louder', 'same', 'fading'];
const isDrift = (v: unknown): v is Drift =>
  typeof v === 'string' && drifts.includes(v);
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;
// Extra keys are allowed, so a moment saved by a newer build still loads.
export function isMoment(e: unknown): e is Moment {
  if (!e || typeof e !== 'object') {
    return false;
  }
  const x = e as Moment;
  return (
    text(x.id, 200) &&
    x.id.length > 0 &&
    Number.isFinite(x.createdAt) &&
    ['now', 'today', 'yesterday'].includes(x.noticed) &&
    text(x.what, 300) &&
    x.what.trim().length > 0 &&
    text(x.saying, 200) &&
    (x.guess === undefined || isDrift(x.guess)) &&
    (x.watchStartedAt === undefined || Number.isFinite(x.watchStartedAt)) &&
    (x.watched === undefined || isDrift(x.watched)) &&
    (x.smallest === undefined || text(x.smallest, 300)) &&
    (x.tried === undefined || typeof x.tried === 'boolean')
  );
}
// Case, spacing, quotes and closing punctuation don't make a line new.
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’]+|[\s.!?…"'“”‘’]+$/g, '');
}
// Met before when what it said matches an earlier entry, or, when nothing
// was said, when what was happening does.
export function metBefore(
  earlier: Moment[],
  m: Pick<Moment, 'what' | 'saying'>,
) {
  const said = normalize(m.saying);
  if (said) {
    return earlier.some((e) => normalize(e.saying) === said);
  }
  const what = normalize(m.what);
  return earlier.some((e) => normalize(e.what) === what);
}
// Whether this entry repeats one written down before it.
export function recognised(moments: Moment[], m: Moment) {
  return metBefore(
    moments.filter((e) => e.id !== m.id && e.createdAt <= m.createdAt),
    m,
  );
}
// The person's own earlier answers, most used first, then most recent.
export function usualLines(moments: Moment[], limit = 5): string[] {
  const seen = new Map<string, { line: string; count: number; last: number }>();
  for (const m of moments) {
    const key = normalize(m.saying);
    if (!key) {
      continue;
    }
    const prior = seen.get(key);
    seen.set(key, {
      line: prior && prior.last > m.createdAt ? prior.line : m.saying.trim(),
      count: (prior?.count ?? 0) + 1,
      last: Math.max(prior?.last ?? 0, m.createdAt),
    });
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map((v) => v.line);
}
// "You guessed it would fade. It stayed the same." for History.
export function watchLine(m: Moment): string {
  if (!m.guess) {
    return '';
  }
  const guessed = `You guessed it would ${guessPhrase[m.guess]}.`;
  if (!m.watched) {
    return guessed;
  }
  const did = watchedChoices.find(([v]) => v === m.watched)?.[1] ?? '';
  return `${guessed} ${did}.`;
}
