import { discoveries, type Encounter, type Territory } from './engine.ts';
export const positions: Record<Territory, [number, number]> = {
  fog: [265, 130],
  spotlight: [285, 302],
  loop: [104, 184],
  water: [117, 352],
  unknown: [210, 242],
};
function hash(id: string) {
  let n = 2166136261;
  for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function projectMap(encounters: Encounter[]) {
  const attempted = [
    ...new Map(
      encounters
        .filter((e) => e.outcome !== 'not_started')
        .map((e) => [e.id, e]),
    ).values(),
  ].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const routes = attempted.map((e) => {
    const seed = hash(e.id);
    const [x, y] = positions[e.territory];
    const end: [number, number] = [
      x + (seed % 51) - 25,
      y + 25 + ((seed >>> 8) % 19) + (e.outcome === 'stopped' ? 35 : 0),
    ];
    const start: [number, number] = [
      78 + (seed % 31),
      417 - ((seed >>> 12) % 18),
    ];
    return {
      id: e.id,
      territory: e.territory,
      stopped: e.outcome === 'stopped',
      end,
      start,
      path: `M ${start[0]} ${start[1]} C ${start[0] + 30} ${320 + (seed % 25)}, ${end[0] - 50} ${end[1] + 75}, ${end[0]} ${end[1]}`,
      createdAt: e.createdAt,
    };
  });
  const known = [...new Set(attempted.map((e) => e.territory))];
  return {
    routes,
    known,
    discoveries: discoveries(attempted),
    familiarity: Object.fromEntries(
      known.map((t) => [t, attempted.filter((e) => e.territory === t).length]),
    ) as Partial<Record<Territory, number>>,
  };
}
