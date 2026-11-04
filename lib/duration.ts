// Reads a duration the person actually typed in their own step text, so the
// step's minutes can match what they said instead of a fixed default.
const wordNumbers: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
};
const numberWord =
  'a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|\\d{1,3}';
const minutePattern = new RegExp(
  `\\b(${numberWord})[\\s-]*(?:minutes?|mins?)\\b`,
);
const secondPattern = new RegExp(`\\b(\\d{1,3})[\\s-]*(?:seconds?|secs?|s)\\b`);
// Returns null when the text states no duration at all.
export function statedMinutes(text: string): number | null {
  const s = text.toLowerCase();
  if (/\bhalf an hour\b/.test(s)) {
    return 30;
  }
  if (/\ban hour\b/.test(s)) {
    return 30;
  }
  const minuteMatch = s.match(minutePattern);
  if (minuteMatch) {
    const raw = minuteMatch[1];
    const n = wordNumbers[raw] ?? Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(30, Math.round(n));
    }
  }
  const secondMatch = s.match(secondPattern);
  if (secondMatch) {
    const n = Number(secondMatch[1]);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(30, Math.max(1, Math.ceil(n / 60)));
    }
  }
  return null;
}

// How long a step really took, from the stored start and the tap on Return.
// Null when that tap can't be trusted: missing, or long after the timer ended
// (the late-return screen), when it says when they came back, not when they stopped.
export function timeTaken(e: {
  startedAt: number;
  returnedAt?: number;
  minutes: number;
}): string | null {
  if (e.returnedAt === undefined || e.returnedAt <= e.startedAt) {
    return null;
  }
  if (e.returnedAt > e.startedAt + (e.minutes + 30) * 60000) {
    return null;
  }
  const total = Math.round((e.returnedAt - e.startedAt) / 1000);
  if (total < 60) {
    return `${total} sec`;
  }
  if (total >= 600) {
    return `${Math.round(total / 60)} min`;
  }
  const seconds = total % 60;
  return seconds
    ? `${Math.floor(total / 60)} min ${seconds} sec`
    : `${total / 60} min`;
}
// The line shown on Result.
export function timeLine(e: {
  startedAt: number;
  returnedAt?: number;
  minutes: number;
  outcome: string;
}): string | null {
  const taken = timeTaken(e);
  if (taken === null || e.outcome === 'not_started') {
    return null;
  }
  return e.outcome === 'stopped' ? `Stopped after ${taken}` : `Took ${taken}`;
}
