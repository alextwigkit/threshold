import { discoveries, type Encounter, type Territory } from './engine.ts';
/*
 * Territory anchors. These place the terrain glyphs and have not moved: the
 * world the person already recognises stays where it is. What moved is where
 * their marks land within it, and where routes set out from.
 */
export const positions: Record<Territory, [number, number]> = {
  fog: [265, 130],
  spotlight: [285, 302],
  loop: [104, 184],
  water: [117, 352],
  unknown: [210, 242],
};
/*
 * Where a territory's encounters can land: an ellipse sized to sit inside that
 * territory's own drawn terrain. Previously every endpoint was pushed a fixed
 * distance *below* its anchor, which put Fog and Still Water marks outside the
 * terrain they belonged to and dropped Still Water on top of the route origin.
 */
export const fields: Record<
  Territory,
  { c: [number, number]; rx: number; ry: number }
> = {
  fog: { c: [265, 150], rx: 46, ry: 20 },
  spotlight: { c: [287, 330], rx: 46, ry: 22 },
  loop: { c: [102, 198], rx: 36, ry: 22 },
  /* ry 13, not 14: the waves bottom out at 379.5 and the field must stay in them. */
  water: { c: [116, 366], rx: 48, ry: 13 },
  unknown: { c: [210, 250], rx: 40, ry: 18 },
};
/*
 * Every route into a territory passes through its gate, so repeated encounters
 * overlay each other for most of their length and separate only on the final
 * approach. Repetition therefore darkens a shared trunk without any route
 * consulting another, which is the line continuity the design asks for.
 */
export const gates: Record<Territory, [number, number]> = {
  fog: [312, 300],
  spotlight: [296, 398],
  loop: [96, 318],
  water: [140, 414],
  unknown: [206, 348],
};
/* Label centres, placed clear of every field and of each other. */
export const labelAnchors: Record<Territory, [number, number]> = {
  fog: [265, 100],
  loop: [100, 152],
  unknown: [220, 212],
  spotlight: [287, 288],
  water: [116, 330],
};
/*
 * Ink extents of each name, measured from the rendered SVG rather than guessed:
 * half-width per name, and a vertical span that is not symmetric about the
 * anchor because the text is drawn on a baseline eight units below it.
 */
export const labelInk: {
  half: Record<Territory, number>;
  up: number;
  down: number;
} = {
  half: { fog: 36, loop: 68, unknown: 70, spotlight: 59, water: 48 },
  up: 11,
  down: 15,
};
/* "stopped here", 11px, centred five units left of the mark. */
export const noteInk = { half: 35, up: 13, down: 5 };
type Box = { x0: number; x1: number; y0: number; y1: number };
const labelBox = (t: Territory): Box => {
  const [x, y] = labelAnchors[t];
  const h = labelInk.half[t];
  return { x0: x - h, x1: x + h, y0: y - labelInk.up, y1: y + labelInk.down };
};
export const labelBoxes = () =>
  Object.fromEntries(
    (Object.keys(labelAnchors) as Territory[]).map((t) => [t, labelBox(t)]),
  ) as Record<Territory, Box>;
const hits = (a: Box, b: Box) =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/*
 * Where the "stopped here" note sits relative to its mark. Below is the
 * natural reading order, but a mark that stops at the rim nearest a name puts
 * the note straight through it: the note used to land on The Spotlight, and
 * two lines of text over each other read as neither. Flip above in that case.
 */
export function notePlacement(end: [number, number]): number {
  const box = (dy: number): Box => ({
    x0: end[0] - 5 - noteInk.half,
    x1: end[0] - 5 + noteInk.half,
    y0: end[1] + dy - noteInk.up,
    y1: end[1] + dy + noteInk.down,
  });
  const all = Object.values(labelBoxes());
  const clear = (dy: number) => {
    const b = box(dy);
    return b.y0 >= 0 && b.y1 <= canvas.height && !all.some((l) => hits(b, l));
  };
  /* Below first, then above, then further out. A test sweeps every reachable
   * mark in every territory and none of them exhausts this ladder. */
  return [18, -14, 26, -22, 34].find(clear) ?? 18;
}
/*
 * The setup preview frames the one territory being entered. A 400x470 map
 * cannot fit a wide short slot without either bars or losing its bottom
 * quarter, so the preview uses its own window instead of cropping by accident.
 */
export const compactCrops: Record<Territory, string> = {
  fog: '0 54 400 150',
  loop: '0 105 400 150',
  unknown: '0 159 400 150',
  spotlight: '0 239 400 150',
  water: '0 274 400 150',
};
export const canvas = { width: 400, height: 470 };
/* Home. Bottom-centre, so the fan is radial and clear of Still Water. */
export const originBox = { x: [186, 213], y: [432, 442] };
function fnv(s: string) {
  let n = 2166136261;
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
/* FNV's low bits are weakly mixed and the layout draws several slices. */
function mix(h: number) {
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}
const round = (n: number) => Math.round(n * 10) / 10;
type Point = [number, number];
const onField = (p: Point, t: Territory) => {
  const { c, rx, ry } = fields[t];
  return ((p[0] - c[0]) / rx) ** 2 + ((p[1] - c[1]) / ry) ** 2 <= 1;
};
/*
 * The shape of one encounter's journey. A pure function of the encounter's own
 * id, territory and outcome: no sibling, index or count is consulted, so a
 * trace never moves because the history around it changed.
 */
function shape(id: string, territory: Territory, stopped: boolean) {
  const h1 = mix(fnv(id));
  const h2 = mix(fnv(`${id}~2`));
  const { c, rx, ry } = fields[territory];
  const angle = ((h1 % 3600) / 3600) * Math.PI * 2;
  /*
   * sqrt spreads marks evenly by area rather than piling them at the centre,
   * and the 0.16 floor keeps a hole in the middle so marks stay apart without
   * any route needing to know where the others went.
   */
  const reach = Math.sqrt(0.16 + 0.84 * (((h1 >>> 12) % 1024) / 1024));
  const target: Point = [
    c[0] + rx * reach * Math.cos(angle),
    c[1] + ry * reach * Math.sin(angle),
  ];
  const start: Point = [186 + ((h2 >>> 8) % 28), 442 - ((h2 >>> 16) % 11)];
  const bow = (h2 % 17) - 8;
  const [gx, gy] = gates[territory];
  const p1: Point = [gx + bow, gy];
  const p2: Point = [
    target[0] + 0.35 * (gx - target[0]) + 0.5 * bow,
    target[1] + 0.45 * (gy - target[1]),
  ];
  const at = (u: number): Point => {
    const m = 1 - u;
    const f = (i: 0 | 1) =>
      m ** 3 * start[i] +
      3 * m * m * u * p1[i] +
      3 * m * u * u * p2[i] +
      u ** 3 * target[i];
    return [f(0), f(1)];
  };
  if (!stopped) return { start, p1, p2, end: target, at, cut: 1 };
  /*
   * A stopped encounter reached the edge of the territory without going in, so
   * its line ends where it first meets the field. It has to be that edge and
   * not some fraction of the way along: halting two thirds of the way put 57%
   * of stopped Fog routes inside The Open Loop's label.
   */
  const search = (test: (u: number) => boolean) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (test(m)) hi = m;
      else lo = m;
    }
    return hi;
  };
  const gap = (u: number) => {
    const p = at(u);
    return Math.hypot(target[0] - p[0], target[1] - p[1]);
  };
  const rim = search((u) => onField(at(u), territory));
  /*
   * When the curve grazes the field the rim is the target, and stopping would
   * look identical to arriving. Step back to a fixed short distance rather
   * than a fixed fraction of the curve: the parameter is not arc length, so
   * trimming a flat 6% of it dragged stopped Fog marks a whole field-width
   * back down the approach.
   */
  const cut = gap(rim) >= 6 ? rim : search((u) => gap(u) <= 6);
  return { start, p1, p2, end: at(cut), at, cut };
}
/* de Casteljau: the first `cut` of the curve, as its own cubic. */
function curve(
  start: Point,
  p1: Point,
  p2: Point,
  end: Point,
  cut: number,
): string {
  const l = (a: Point, b: Point, u: number): Point => [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
  ];
  const a = l(start, p1, cut);
  const b = l(p1, p2, cut);
  const c = l(a, b, cut);
  const p = (q: Point) => `${round(q[0])} ${round(q[1])}`;
  return `M ${p(start)} C ${p(a)}, ${p(c)}, ${p(end)}`;
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
    const stopped = e.outcome === 'stopped';
    const s = shape(e.id, e.territory, stopped);
    return {
      id: e.id,
      territory: e.territory,
      stopped,
      end: [round(s.end[0]), round(s.end[1])] as Point,
      start: s.start,
      path: curve(s.start, s.p1, s.p2, s.end, s.cut),
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
