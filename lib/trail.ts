import type { Discovery, Encounter } from './engine';

export type Stone = {
  id: string;
  /** 1-based position among every step taken, not just the visible ones. */
  step: number;
  encounter: Encounter;
  expected: number;
  experienced: number;
  stopped: boolean;
  /** Discovery ids established on this step. */
  discoveries: string[];
};

/** Steps taken, oldest first. Not starting leaves no stone. */
export function taken(encounters: Encounter[]) {
  return [...new Map(encounters.map((e) => [e.id, e])).values()]
    .filter((e) => e.outcome !== 'not_started' && e.actual !== null)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** The latest `limit` stones, and how many earlier steps are left off. */
export function trailStones(
  encounters: Encounter[],
  found: Discovery[] = [],
  limit = 4,
) {
  const all = taken(encounters);
  const stones: Stone[] = all.map((e, i) => ({
    id: e.id,
    step: i + 1,
    encounter: e,
    expected: e.prediction,
    experienced: e.actual ?? 0,
    stopped: e.outcome === 'stopped' || e.urge === 'stopped',
    // A discovery is established by the last encounter of its qualifying sample.
    discoveries: found
      .filter(
        (d) => d.establishedAt === e.createdAt && d.evidence.includes(e.id),
      )
      .map((d) => d.id),
  }));
  const shown = stones.slice(-limit);
  return { stones: shown, earlier: stones.length - shown.length };
}

/** How many steps felt easier than expected, in words, once there is more than one. */
export function pattern(encounters: Encounter[]) {
  const all = taken(encounters);
  if (all.length < 2) return '';
  const easier = all.filter((e) => (e.actual ?? 0) < e.prediction).length;
  if (easier === all.length) {
    return all.length === 2
      ? 'Both of your steps felt easier than you expected.'
      : `All ${easier} of your steps felt easier than you expected.`;
  }
  return `${easier} of your ${all.length} steps felt easier than you expected.`;
}

/**
 * How many named worries didn't happen, in words, once there are at least
 * two answered. Counts a Return answer or a later Atlas answer; an
 * unanswered "can't tell yet" doesn't count either way yet.
 */
export function worryPattern(encounters: Encounter[]) {
  const answered = taken(encounters)
    .map((e) => e.worryLater ?? e.worryHappened)
    .filter(
      (a): a is 'no' | 'partly' | 'yes' =>
        a === 'no' || a === 'partly' || a === 'yes',
    );
  if (answered.length < 2) {
    return '';
  }
  const n = answered.length;
  const didnt = answered.filter((a) => a === 'no').length;
  if (didnt === n) {
    return n === 2
      ? 'Neither worry you followed up on happened.'
      : `None of the ${n} worries you followed up on happened.`;
  }
  if (didnt === 0) {
    return n === 2
      ? 'Both worries you followed up on happened, at least in part.'
      : `All ${n} worries you followed up on happened, at least in part.`;
  }
  return `Of ${n} worries you followed up on, ${didnt} didn’t happen and ${n - didnt} did, at least in part.`;
}
