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
export type Screen =
  | 'name'
  | 'clarify'
  | 'setup'
  | 'active'
  | 'return'
  | 'observation'
  | 'map'
  | 'atlas'
  | 'me';
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
  lastId: string | null;
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
    (x.lastId !== null && !text(x.lastId, 200))
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
  return {
    version: 1,
    screen: x.screen,
    situation: x.situation,
    resistance: x.resistance,
    custom: x.custom,
    draft: x.draft,
    prediction: x.prediction,
    predictionNote: x.predictionNote,
    session: x.session,
    encounters: unique,
    lastId: x.lastId,
  };
}
export function restoreSummary(current: Saved, backup: Saved) {
  const ids = new Set([
    ...current.encounters.map((e) => e.id),
    ...(current.session ? [current.session.id] : []),
  ]);
  return {
    added: backup.encounters.filter((e) => !ids.has(e.id)).length,
    duplicates: backup.encounters.filter((e) => ids.has(e.id)).length,
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
  // Restore history, never someone else's unfinished timer or a different device's drafts.
  return {
    ...current,
    encounters,
    lastId: current.lastId ?? encounters.at(-1)?.id ?? null,
  };
}
