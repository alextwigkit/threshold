import assert from 'node:assert/strict';
import test from 'node:test';
import {
  projectMap,
  fields,
  labelAnchors,
  labelInk,
  compactCrops,
  positions,
  canvas,
  originBox,
  labelBoxes,
  noteInk,
  inkMargin,
  notePlacement,
  noteBox as buildNoteBox,
} from '../lib/map.ts';

const TERRITORIES = ['fog', 'spotlight', 'loop', 'water', 'unknown'];

function encounter(id, over = {}) {
  return {
    id,
    territory: 'fog',
    outcome: 'attempted',
    createdAt: Number(id.replace(/\D/g, '') || 1) * 1000,
    localDate: '2026-09-01',
    prediction: 5,
    actual: 4,
    urge: 'stayed',
    notices: ['doorway'],
    ...over,
  };
}
const only = (e) => projectMap([e]).routes[0];
/* Deterministic synthetic ids, enough to sweep the whole reachable field. */
const sweep = Array.from(
  { length: 1500 },
  (_, i) => `sweep-${i}-${(i * 2654435761) >>> 0}`,
);
/* Tolerance absorbs the 0.05 that rounding marks to one decimal can add. */
const inField = ([x, y], t) => {
  const { c, rx, ry } = fields[t];
  return ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 <= 1.01;
};
/*
 * Ink extents measured from the rendered SVG, shared with the code that places
 * the notes. Guessed numbers here were wrong in both directions: too wide, and
 * too short to cover the descenders that sit below the anchor.
 */
const BOXES = labelBoxes();
const inLabel = ([x, y], t) => {
  const b = BOXES[t];
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
};
/* Margin-aware: a box that merely touches another still counts as too close. */
const overlaps = (a, b) =>
  a.x0 - inkMargin < b.x1 &&
  a.x1 + inkMargin > b.x0 &&
  a.y0 - inkMargin < b.y1 &&
  a.y1 + inkMargin > b.y0;
/* Built from the same offset the renderer draws with, not a re-typed -5. */
const noteBox = (end) => buildNoteBox(end, notePlacement(end));
const inOrigin = ([x, y]) =>
  x >= originBox.x[0] &&
  x <= originBox.x[1] &&
  y >= originBox.y[0] &&
  y <= originBox.y[1];

/*
 * The golden lock. Nothing else pins the actual numbers, so a change to the
 * hash or the layout would otherwise relocate a real person's whole history
 * with every structural test still green.
 */
test('route geometry is pinned to exact coordinates', () => {
  const fixed = only(encounter('e1', { territory: 'loop' }));
  assert.deepEqual(fixed.start, [191, 435]);
  assert.deepEqual(fixed.end, [74.7, 194.1]);
  assert.equal(fixed.path, 'M 191 435 C 103 318, 85.6 249.8, 74.7 194.1');
  const halted = only(
    encounter('e1', { territory: 'loop', outcome: 'stopped' }),
  );
  assert.deepEqual(halted.start, [191, 435]);
  assert.deepEqual(halted.end, [79.1, 215]);
  assert.equal(halted.path, 'M 191 435 C 113.7 332.2, 90.9 267.1, 79.1 215');
});

/*
 * One territory locked above is not enough: every other territory's own
 * gate and field centre are free to move with every other test still green,
 * since inField() and inLabel() check against the very values that moved.
 * Pin one arrived and one stopped end per territory.
 */
test('every territory has its own pinned endpoint, not just Loop', () => {
  const golden = {
    fog: { arrived: [230.1, 146.4], stopped: [239.8, 166.7] },
    spotlight: { arrived: [252.1, 326.1], stopped: [265.3, 349.4] },
    loop: { arrived: [74.7, 194.1], stopped: [79.1, 215] },
    water: { arrived: [79.6, 363.7], stopped: [96.5, 377.9] },
    unknown: { arrived: [179.6, 246.8], stopped: [184.5, 263.9] },
  };
  for (const [t, { arrived, stopped }] of Object.entries(golden)) {
    assert.deepEqual(only(encounter('e1', { territory: t })).end, arrived, t);
    assert.deepEqual(
      only(encounter('e1', { territory: t, outcome: 'stopped' })).end,
      stopped,
      `${t} stopped`,
    );
  }
});

test('every reachable mark lands in its own territory and nowhere else', () => {
  for (const territory of TERRITORIES) {
    for (const id of sweep) {
      const { end } = only(encounter(id, { territory }));
      assert.ok(inField(end, territory), `${territory} ${id} left its field`);
      for (const other of TERRITORIES) {
        if (other !== territory)
          assert.ok(!inField(end, other), `${territory} ${id} in ${other}`);
        assert.ok(
          !inLabel(end, other),
          `${territory} ${id} under ${other} label`,
        );
      }
      assert.ok(!inOrigin(end), `${territory} ${id} landed on the origin`);
      assert.ok(end[0] >= 0 && end[0] <= canvas.width, 'x on canvas');
      assert.ok(end[1] >= 0 && end[1] <= canvas.height, 'y on canvas');
    }
  }
});

/*
 * A stopped route ends at the threshold of its territory. It must be visibly
 * shorter than an arrival, and it must not come to rest on someone else's
 * ground: halting two thirds of the way along the curve, which is the obvious
 * implementation, strands 57% of stopped Fog routes inside another label.
 */
test('a stopped route halts at the threshold, not in a neighbour', () => {
  for (const territory of TERRITORIES) {
    const { c, rx, ry } = fields[territory];
    for (const id of sweep) {
      const went = only(encounter(id, { territory }));
      const halted = only(encounter(id, { territory, outcome: 'stopped' }));
      const reach = (r) =>
        Math.hypot(r.end[0] - r.start[0], r.end[1] - r.start[1]);
      assert.ok(
        reach(halted) < reach(went),
        `${territory} ${id} not shortened`,
      );
      const [x, y] = halted.end;
      /*
       * At the rim, or a little outside it where the curve grazes the field
       * and the mark has to be stepped back to read as short. Measured as
       * distance beyond the rim in map units rather than as a ratio, which
       * overstates the offset badly for the flattest field.
       */
      const ratio = Math.hypot((x - c[0]) / rx, (y - c[1]) / ry);
      const beyond =
        Math.hypot(x - c[0], y - c[1]) * (1 - 1 / Math.max(ratio, 1));
      // The 6-unit step back, plus slack: measuring outward along the radius
      // overstates the true distance to the rim of a wide flat field.
      assert.ok(
        beyond <= 10,
        `${territory} ${id} stranded ${beyond} beyond its ground`,
      );
      for (const other of TERRITORIES) {
        if (other !== territory)
          assert.ok(
            !inField(halted.end, other),
            `${territory} ${id} stopped inside ${other}`,
          );
        assert.ok(
          !inLabel(halted.end, other),
          `${territory} ${id} stopped under ${other} label`,
        );
      }
      assert.ok(
        !inOrigin(halted.end),
        `${territory} ${id} stopped on the origin`,
      );
    }
  }
});

/*
 * The note is the only place the map says a word about what happened, so it
 * has to be readable. Below the mark is the natural place and mostly works,
 * but a mark resting on the rim nearest a name printed the note straight
 * through it: this was live on The Spotlight before it was measured.
 */
test('the "stopped here" note never prints over a territory name', () => {
  for (const territory of TERRITORIES) {
    for (const id of sweep) {
      const { end } = only(encounter(id, { territory, outcome: 'stopped' }));
      const box = noteBox(end);
      for (const [other, label] of Object.entries(BOXES))
        assert.ok(
          !overlaps(box, label),
          `${territory} ${id} note prints over ${other}`,
        );
      assert.ok(
        box.y0 >= 0 && box.y1 <= canvas.height,
        `${id} note off canvas`,
      );
    }
  }
});

test('marks keep clear of the middle of their field so they stay apart', () => {
  for (const territory of TERRITORIES) {
    const { c, rx, ry } = fields[territory];
    for (const id of sweep) {
      const [x, y] = only(encounter(id, { territory })).end;
      const r = ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2;
      assert.ok(r >= 0.15, `${territory} ${id} fell into the middle`);
    }
  }
});

test('each field sits inside the terrain drawn for its territory', () => {
  /* Bounds of the glyphs in map-fragment.tsx, relative to positions[t]. */
  const glyph = {
    fog: [-70, 50, -8, 45.7],
    spotlight: [-63, 63, -4, 55],
    loop: [-50, 51.2, -39.1, 60.9],
    water: [-55, 55, 0, 27.5],
  };
  for (const [t, [x0, x1, y0, y1]] of Object.entries(glyph)) {
    const [ax, ay] = positions[t];
    const { c, rx, ry } = fields[t];
    assert.ok(c[0] - rx >= ax + x0, `${t} field runs off its terrain (left)`);
    assert.ok(c[0] + rx <= ax + x1, `${t} field runs off its terrain (right)`);
    assert.ok(c[1] - ry >= ay + y0, `${t} field runs off its terrain (top)`);
    assert.ok(c[1] + ry <= ay + y1, `${t} field runs off its terrain (bottom)`);
  }
});

test('the setup preview frames the whole of its territory', () => {
  for (const t of TERRITORIES) {
    const [, top, , height] = compactCrops[t].split(' ').map(Number);
    const { c, ry } = fields[t];
    assert.ok(
      c[1] - ry >= top && c[1] + ry <= top + height,
      `${t} field cropped`,
    );
    const [, ly] = labelAnchors[t];
    assert.ok(
      ly - labelInk.up >= top && ly + labelInk.down <= top + height,
      `${t} label cropped`,
    );
  }
});

// labelInk/noteInk/inkMargin are measured from the rendered SVG and the CSS halo
// stroke-widths, not derived from anything else the code checks: a length-based
// plausibility range let a 21% shrink of labelInk.half.unknown through and still left
// 405 real note-over-label overlaps in a 12,500-route sweep. Pin the exact values instead.
test('the measured label, note and halo-margin extents are pinned to what was measured', () => {
  assert.deepEqual(
    new Set(Object.keys(labelInk.half)),
    new Set(TERRITORIES),
    'labelInk.half must cover exactly the current territories',
  );
  assert.deepEqual(labelInk.half, {
    fog: 36,
    loop: 68,
    unknown: 70,
    spotlight: 59,
    water: 48,
  });
  assert.equal(labelInk.up, 11);
  assert.equal(labelInk.down, 15);
  assert.deepEqual(noteInk, { half: 35, up: 13, down: 5, dx: -5 });
  // (5px .map-label halo + 3px .map-note halo) / 2, in app/globals.css.
  assert.equal(inkMargin, 4);
});

// notePlacement is only ever exercised indirectly, through whichever end points the hash
// sweep happens to produce. Force the cases that make it actually climb the ladder,
// including the fallback, directly.
test('notePlacement finds a clear rung, and falls back honestly when none exists', () => {
  // Sitting exactly on a label anchor forces past the default rung (18):
  // below lands the note inside The Open Loop's own name.
  const onLabel = labelAnchors.loop;
  const dy = notePlacement(onLabel);
  assert.equal(dy, -22, 'a point on a label anchor must climb the ladder');
  const box = buildNoteBox(onLabel, dy);
  for (const label of Object.values(labelBoxes()))
    assert.ok(
      !(
        box.x0 - inkMargin < label.x1 &&
        box.x1 + inkMargin > label.x0 &&
        box.y0 - inkMargin < label.y1 &&
        box.y1 + inkMargin > label.y0
      ),
      'the chosen rung must actually be clear',
    );

  // No real end point is ever this far below the canvas, so every rung's canvas-bound
  // check must fail here, which is what actually reaches the `?? 18` fallback rather
  // than rung 18 merely being chosen on its own merits (they happen to share a value).
  const unreachableEnd = [labelAnchors.fog[0], canvas.height + 500];
  for (const rung of [18, -14, 2, 26, -22, 34]) {
    const b = buildNoteBox(unreachableEnd, rung);
    assert.ok(
      b.y1 > canvas.height,
      `rung ${rung} must fail the canvas bound for this fallback case to be real`,
    );
  }
  assert.equal(
    notePlacement(unreachableEnd),
    18,
    'fallback must be the documented default rung',
  );
});

test('an empty map projects to nothing at all', () => {
  const map = projectMap([]);
  assert.deepEqual(map.routes, []);
  assert.deepEqual(map.known, []);
  assert.deepEqual(map.discoveries, []);
  assert.deepEqual(map.familiarity, {});
});

test('an unclassified encounter still gets known ground and a mark', () => {
  const map = projectMap([encounter('u1', { territory: 'unknown' })]);
  assert.deepEqual(map.known, ['unknown']);
  assert.equal(map.familiarity.unknown, 1);
  assert.ok(inField(map.routes[0].end, 'unknown'));
});

test('deleting history never moves the marks that remain', () => {
  const all = [
    encounter('a1', { territory: 'fog' }),
    encounter('b2', { territory: 'water' }),
    encounter('c3', { territory: 'loop', outcome: 'stopped' }),
    encounter('d4', { territory: 'fog' }),
  ];
  const before = projectMap(all).routes;
  for (const gone of all) {
    const after = projectMap(all.filter((e) => e.id !== gone.id)).routes;
    for (const r of after) {
      const was = before.find((x) => x.id === r.id);
      assert.deepEqual(r.end, was.end, `${r.id} moved when ${gone.id} went`);
      assert.equal(r.path, was.path, `${r.id} redrawn when ${gone.id} went`);
    }
  }
});

test('projected discoveries reach the map with their supporting evidence', () => {
  const history = ['1', '2', '3', '4'].map((n) =>
    encounter(`disc${n}`, {
      createdAt: Number(n) * 1000,
      localDate: `2026-09-0${n}`,
      notices: ['doorway'],
    }),
  );
  const map = projectMap(history);
  assert.equal(map.discoveries.length, 1);
  const [found] = map.discoveries;
  assert.equal(found.rule, 'doorway');
  // The mark hangs off a real route, which is what the map draws it on.
  assert.ok(map.routes.some((r) => found.support.includes(r.id)));
});

/*
 * The map only animates a discovery the first time it appears (see
 * newDiscoveryId in map-fragment.tsx and page.tsx), which works only because
 * a discovery's id depends on its rule and territory and nothing else. If a
 * further supporting encounter ever changed that id, every existing
 * discovery would look "new" again and replay its reveal on every
 * observation — the exact bug this map pass fixed. Nothing rendered checks
 * this; it has to be pinned here.
 */
test('a discovery keeps its id as more supporting evidence arrives', () => {
  const history = ['1', '2', '3', '4'].map((n) =>
    encounter(`stable${n}`, {
      createdAt: Number(n) * 1000,
      localDate: `2026-09-0${n}`,
      notices: ['doorway'],
    }),
  );
  const before = projectMap(history).discoveries;
  assert.equal(before.length, 1);
  const grown = projectMap([
    ...history,
    encounter('stable5', {
      createdAt: 5000,
      localDate: '2026-09-05',
      notices: ['doorway'],
    }),
  ]).discoveries;
  assert.equal(grown.length, 1);
  assert.equal(
    grown[0].id,
    before[0].id,
    'id must survive new supporting evidence',
  );
});
