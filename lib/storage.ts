import {
  isCandidate,
  isEncounter,
  isSession,
  validScale,
  type Candidate,
  type Resistance,
  type Session,
  type Encounter,
} from './engine.ts';
import { isMoment, type Moment } from './moments.ts';
export type Screen =
  | 'name'
  | 'clarify'
  | 'setup'
  | 'active'
  | 'return'
  | 'observation'
  | 'map'
  | 'atlas'
  | 'me'
  | 'notice'
  | 'noticed'
  | 'watch';
export type Saved = {
  version: 1;
  screen: Screen;
  situation: string;
  resistance: Resistance;
  custom: string;
  draft: Candidate | null;
  prediction: number | null;
  predictionNote: string;
  session: Session | null;
  encounters: Encounter[];
  // Moments of resistance noticed, acted on or not.
  moments: Moment[];
  lastId: string | null;
  // The moment the noticed and watch screens are about.
  momentId?: string;
  // Which half of Setup is showing. Absent means the first half, "Your step".
  setupPart?: 'prepare';
  // Where the current setup flow started, for Back and for Home's Start.
  setupFrom?: 'home' | 'clarify';
  // Setup's worry field, kept in Saved so it survives an app switch.
  worryDraft?: string;
};
export const initial: Saved = {
  version: 1,
  screen: 'name',
  situation: '',
  resistance: 'start',
  custom: '',
  draft: null,
  prediction: null,
  predictionNote: '',
  session: null,
  encounters: [],
  moments: [],
  lastId: null,
};
export const KEY = 'edge-atlas-v1';
const screens = [
  'name',
  'clarify',
  'setup',
  'active',
  'return',
  'observation',
  'map',
  'atlas',
  'me',
  'notice',
  'noticed',
  'watch',
];
const resistances = [
  'understand',
  'start',
  'judged',
  'unpleasant',
  'other',
  'checking',
];
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;
export function parseSaved(raw: string): Saved {
  if (raw.length > 10_000_000)
    throw Error('This file is too large to restore.');
  let x: any;
  try {
    x = JSON.parse(raw);
  } catch {
    throw Error('This is not a readable Threshold backup.');
  }
  if (
    !x ||
    x.version !== 1 ||
    !screens.includes(x.screen) ||
    !text(x.situation, 2000) ||
    !resistances.includes(x.resistance) ||
    !text(x.custom, 1000) ||
    !text(x.predictionNote, 1000) ||
    (x.prediction !== null && !validScale(x.prediction)) ||
    !Array.isArray(x.encounters) ||
    x.encounters.length > 10000 ||
    !x.encounters.every(isEncounter) ||
    (x.session !== null && !isSession(x.session)) ||
    (x.draft !== null && !isCandidate(x.draft)) ||
    (x.lastId !== null && !text(x.lastId, 200)) ||
    (x.setupPart !== undefined && x.setupPart !== 'prepare') ||
    (x.setupFrom !== undefined && !['home', 'clarify'].includes(x.setupFrom)) ||
    (x.worryDraft !== undefined && !text(x.worryDraft, 1000)) ||
    (x.moments !== undefined &&
      (!Array.isArray(x.moments) ||
        x.moments.length > 10000 ||
        !x.moments.every(isMoment))) ||
    (x.momentId !== undefined && !text(x.momentId, 200))
  )
    throw Error(
      'This backup contains incomplete or unsupported Threshold data. Your data has not changed.',
    );
  if (['active', 'return'].includes(x.screen) && !x.session)
    throw Error('The saved step is incomplete.');
  if (x.screen === 'setup' && !x.draft)
    throw Error('The saved step is incomplete.');
  if (x.screen === 'observation' && !x.encounters.length)
    throw Error('The saved result has no step.');
  const unique = [
    ...new Map<string, Encounter>(
      x.encounters.map((e: Encounter) => [e.id, e]),
    ).values(),
  ].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const moments = sortMoments(x.moments ?? []);
  const followed = moments.some((m) => m.id === x.momentId);
  // Fields this build doesn't know are kept, so a rollback can't erase them.
  return {
    ...(x as object),
    version: 1,
    screen:
      ['noticed', 'watch'].includes(x.screen) && !followed ? 'map' : x.screen,
    situation: x.situation,
    resistance: x.resistance,
    custom: x.custom,
    draft: x.draft,
    prediction: x.prediction,
    predictionNote: x.predictionNote,
    session: x.session,
    encounters: unique,
    moments,
    lastId: x.lastId,
    ...(x.setupPart !== undefined ? { setupPart: x.setupPart } : {}),
    ...(x.setupFrom !== undefined ? { setupFrom: x.setupFrom } : {}),
    ...(x.worryDraft !== undefined ? { worryDraft: x.worryDraft } : {}),
  };
}
function sortMoments(moments: Moment[]) {
  return [
    ...new Map<string, Moment>(moments.map((m) => [m.id, m])).values(),
  ].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function restoreSummary(current: Saved, backup: Saved) {
  const ids = new Set([
    ...current.encounters.map((e) => e.id),
    ...(current.session ? [current.session.id] : []),
  ]);
  const momentIds = new Set(current.moments.map((m) => m.id));
  return {
    added: backup.encounters.filter((e) => !ids.has(e.id)).length,
    duplicates: backup.encounters.filter((e) => ids.has(e.id)).length,
    momentsAdded: backup.moments.filter((m) => !momentIds.has(m.id)).length,
    momentDuplicates: backup.moments.filter((m) => momentIds.has(m.id)).length,
  };
}
export function mergeBackup(current: Saved, backup: Saved): Saved {
  const merged = new Map(
    backup.encounters
      .filter((e) => e.id !== current.session?.id)
      .map((e) => [e.id, e]),
  );
  for (const e of current.encounters) merged.set(e.id, e);
  const encounters = [...merged.values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  // Moments already here win, like steps.
  const moments = sortMoments([...backup.moments, ...current.moments]);
  // Restore history, never someone else's unfinished timer or a different device's drafts.
  return {
    ...current,
    encounters,
    moments,
    lastId: current.lastId ?? encounters.at(-1)?.id ?? null,
  };
}
// Reopening the app with no step running lands on Home rather than wherever
// it was left, unless a flow is mid-way: clarify, setup, a typed situation,
// or a minute being watched in the last half hour.
export function screenOnOpen(s: Saved, now: number): Saved {
  if (s.session) {
    return s;
  }
  const watched = s.moments.find((m) => m.id === s.momentId);
  if (
    s.screen === 'watch' &&
    watched?.watchStartedAt !== undefined &&
    watched.watched === undefined &&
    watched.watchStartedAt <= now &&
    now - watched.watchStartedAt < 30 * 60000
  ) {
    return s;
  }
  const resting: Screen[] = [
    'observation',
    'map',
    'atlas',
    'me',
    'notice',
    'noticed',
    'watch',
  ];
  const idle =
    resting.includes(s.screen) || (s.screen === 'name' && !s.situation.trim());
  if (!idle) {
    return s;
  }
  const history = s.encounters.length > 0 || s.moments.length > 0;
  return { ...s, screen: history ? 'map' : 'name', momentId: undefined };
}
