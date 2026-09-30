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

/** The key under the dots, worked through with the latest step's own numbers. */
export function trailKey(stones: Stone[], tappable: boolean) {
  const latest = stones.at(-1);
  if (!latest) return '';
  const { expected: e, experienced: f } = latest;
  return [
    `The numbers are discomfort out of 10: ${e} → ${f} means you expected ${e} and it felt like ${f}.`,
    stones.some((x) => x.stopped) &&
      'A half-filled dot means you stopped partway.',
    tappable && 'Tap a dot to see that step.',
  ]
    .filter(Boolean)
    .join(' ');
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

/** Steps grouped by situation, newest group and newest entry within it first. */
export function groupBySituation(
  encounters: Encounter[],
): { situation: string; entries: Encounter[] }[] {
  const unique = [...new Map(encounters.map((e) => [e.id, e])).values()];
  const byKey = new Map<string, Encounter[]>();
  for (const e of unique) {
    const key = e.situation.trim();
    const list = byKey.get(key) ?? [];
    list.push(e);
    byKey.set(key, list);
  }
  const groups = [...byKey.values()].map((entries) => {
    const sorted = [...entries].sort(
      (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
    );
    return { situation: sorted[0].situation, entries: sorted };
  });
  return groups.sort(
    (a, b) =>
      b.entries[0].createdAt - a.entries[0].createdAt ||
      b.entries[0].id.localeCompare(a.entries[0].id),
  );
}

/** Distinct trimmed situations, newest first, capped at `limit`. */
export function recentSituations(encounters: Encounter[], limit = 3): string[] {
  const unique = [...new Map(encounters.map((e) => [e.id, e])).values()].sort(
    (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
  );
  const seen = new Set<string>();
  const result: string[] = [];
  for (const e of unique) {
    const key = e.situation.trim();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(key);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
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
