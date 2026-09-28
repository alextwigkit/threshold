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

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** How many steps felt easier than expected, in words, once there is more than one. */
export function pattern(encounters: Encounter[]) {
  const all = taken(encounters);
  if (all.length < 2) return '';
  const easier = all.filter((e) => (e.actual ?? 0) < e.prediction).length;
  return `${easier} of ${all.length} felt easier than you expected.`;
}

/** The Observation caption: where this step sits on the trail. */
export function trailCaption(last: Encounter, encounters: Encounter[]) {
  if (last.outcome === 'not_started')
    return 'Your trail grows when you start a step.';
  const all = taken(encounters);
  const step = all.findIndex((e) => e.id === last.id) + 1;
  if (step === 1) return 'The first stone on your trail.';
  return `Your ${ordinal(step)} step. ${pattern(all.slice(0, step))}`;
}
