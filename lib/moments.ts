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
