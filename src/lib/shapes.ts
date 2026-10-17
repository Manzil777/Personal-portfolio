/**
 * Shape registry + point sampler for the particle field.
 *
 * Every shape is authored by hand here in a 0..100 square (y grows downward) as
 * line primitives. `sampleShape` turns a shape into an even spread of target
 * points by walking the total outline length, so dots read like line art.
 *
 * Roughly 11% of the points of any shape are reserved for that shape's single
 * red "focal detail" (a flame, a cork, a flag, a caret …).
 */
import type { Layer } from "./art-points";


export type Pt = [number, number];

type Prim =
  | { t: "poly"; pts: Pt[]; closed?: boolean; accent?: boolean }
  | { t: "line"; a: Pt; b: Pt; accent?: boolean }
  | { t: "arc"; c: Pt; r: number; a0: number; a1: number; accent?: boolean }
  | { t: "circle"; c: Pt; r: number; accent?: boolean; fill?: boolean };

export type ShapeDef = {
  prims: Prim[];
  /** Radians/second of slow Y-axis rotation; >0 makes a 3D-ish wireframe. */
  spin?: number;
};

export type Target = {
  x: number;
  y: number;
  a: boolean;
  s: number;
  layer?: Layer;
  spineS?: number;
  hairDist?: number;
  weight?: number;
};

const D = (deg: number) => (deg * Math.PI) / 180;

const line = (x1: number, y1: number, x2: number, y2: number, accent = false): Prim => ({
  t: "line",
  a: [x1, y1],
  b: [x2, y2],
  accent,
});
const poly = (pts: Pt[], closed = false, accent = false): Prim => ({
  t: "poly",
  pts,
  closed,
  accent,
});
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, accent = false): Prim => ({
  t: "arc",
  c: [cx, cy],
  r,
  a0: D(a0),
  a1: D(a1),
  accent,
});
const circle = (cx: number, cy: number, r: number, accent = false, fill = false): Prim => ({
  t: "circle",
  c: [cx, cy],
  r,
  accent,
  fill,
});

/* ------------------------------------------------------------------ helpers */

function helix(): Prim[] {
  const out: Prim[] = [];
  const a: Pt[] = [];
  const b: Pt[] = [];
  const steps = 46;
  for (let i = 0; i <= steps; i++) {
    const x = 14 + (72 * i) / steps;
    const ph = (i / steps) * Math.PI * 4;
    a.push([x, 50 + Math.sin(ph) * 26]);
    b.push([x, 50 - Math.sin(ph) * 26]);
  }
  out.push(poly(a), poly(b));
  for (let i = 2; i < steps; i += 4) out.push(line(a[i][0], a[i][1], b[i][0], b[i][1]));
  // focal detail: one amino-acid bead sitting on a rung
  out.push(circle(a[22][0], (a[22][1] + b[22][1]) / 2, 4.5, true, true));
  return out;
}

function pentagon(cx: number, cy: number, r: number, rot = -90): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = D(rot + i * 72);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/* ------------------------------------------------------------------- shapes */

export const shapes: Record<string, ShapeDef> = {
  // ---- rest ---------------------------------------------------------------
  "rest:neural": {
    prims: [
      // four layers of nodes with edges between them
      ...[30, 74].flatMap((y) => [circle(16, y, 4.5)]),
      ...[22, 50, 78].flatMap((y) => [circle(42, y, 4.5)]),
      ...[22, 50, 78].flatMap((y) => [circle(66, y, 4.5)]),
      ...[36, 64].flatMap((y) => [circle(88, y, 4.5)]),
      ...[30, 74].flatMap((y0) => [22, 50, 78].flatMap((y1) => [line(20, y0, 38, y1)])),
      ...[22, 50, 78].flatMap((y0) => [22, 50, 78].flatMap((y1) => [line(46, y0, 62, y1)])),
      ...[22, 50, 78].flatMap((y0) => [36, 64].flatMap((y1) => [line(70, y0, 84, y1)])),
      circle(42, 50, 6, true, true),
    ],
  },

  // ---- projects -----------------------------------------------------------
  "project:ai-forge": {
    prims: [
      circle(42, 42, 26),
      line(61, 61, 86, 86),
      arc(42, 46, 17, 205, 335),
      arc(42, 48, 11, 212, 328),
      arc(42, 50, 5.5, 220, 320),
      circle(42, 42, 4, true, true),
      // evidence tag on the handle
      poly(
        [
          [78, 30],
          [92, 30],
          [92, 44],
        ],
        false,
      ),
    ],
  },
  "project:proteinclassify": { prims: helix(), spin: 0.28 },
  "project:sentiment": {
    prims: [
      poly(
        [
          [16, 18],
          [84, 18],
          [84, 60],
          [48, 60],
          [34, 76],
          [34, 60],
          [16, 60],
        ],
        true,
      ),
      line(28, 54, 28, 40),
      line(42, 54, 42, 30),
      line(56, 54, 56, 44),
      line(70, 54, 70, 36),
      poly([[42, 30], [42, 46]], false, true),
    ],
  },
  "project:soletrack": {
    prims: [
      poly(
        [
          [10, 54],
          [10, 40],
          [22, 36],
          [34, 44],
          [46, 48],
          [58, 48],
          [62, 38],
          [70, 34],
          [80, 40],
          [84, 50],
          [86, 54],
        ],
        false,
      ),
      poly(
        [
          [84, 54],
          [8, 54],
        ],
        false,
      ),
      line(12, 60, 88, 60),
      line(26, 44, 34, 50),
      line(34, 42, 42, 48),
      line(42, 40, 50, 46),
      // barcode below the shoe, one red SKU bar
      line(26, 70, 26, 86),
      line(32, 70, 32, 86),
      line(38, 70, 38, 86, true),
      line(44, 70, 44, 86),
      line(50, 70, 50, 86),
      line(56, 70, 56, 86),
      line(62, 70, 62, 86),
      line(68, 70, 68, 86),
    ],
  },
  "project:weather": {
    prims: [
      circle(34, 40, 13),
      circle(50, 32, 16),
      circle(66, 42, 12),
      line(21, 52, 79, 52),
      line(30, 60, 26, 70),
      line(42, 60, 38, 70),
      line(72, 60, 68, 70),
      // lightning bolt, the focal detail
      poly(
        [
          [56, 56],
          [48, 72],
          [56, 72],
          [50, 88],
          [66, 66],
          [58, 66],
          [64, 56],
        ],
        true,
        true,
      ),
    ],
  },
  "project:robot": {
    prims: [
      poly(
        [
          [28, 34],
          [72, 34],
          [72, 64],
          [28, 64],
        ],
        true,
        false,
      ),
      line(50, 34, 50, 24),
      circle(50, 20, 3.5),
      circle(40, 48, 4.5),
      circle(60, 48, 4.5, true, true),
      line(42, 58, 58, 58),
      circle(32, 76, 7),
      circle(68, 76, 7),
      line(20, 70, 12, 62),
      line(80, 70, 88, 62),
      arc(74, 40, 8, -50, 50),
      arc(74, 40, 15, -50, 50),
    ],
  },

  // ---- education ----------------------------------------------------------
  "edu:cmrit": {
    prims: [
      poly(
        [
          [50, 14],
          [90, 32],
          [50, 50],
          [10, 32],
        ],
        true,
      ),
      line(10, 32, 10, 44),
      line(90, 32, 90, 52),
      circle(90, 54, 3, true, true),
      line(24, 56, 76, 56),
      line(26, 56, 26, 80),
      line(42, 56, 42, 80),
      line(58, 56, 58, 80),
      line(74, 56, 74, 80),
      line(18, 80, 82, 80),
    ],
  },
  "edu:stxaviers": {
    prims: [
      poly(
        [
          [10, 38],
          [50, 30],
          [50, 78],
          [10, 70],
        ],
        true,
      ),
      poly(
        [
          [90, 38],
          [50, 30],
          [50, 78],
          [90, 70],
        ],
        true,
      ),
      line(50, 30, 50, 78),
      line(18, 48, 40, 43),
      line(18, 56, 40, 51),
      line(18, 64, 40, 59),
      line(60, 43, 82, 48),
      line(60, 51, 82, 56),
      line(60, 59, 82, 64),
      // red bookmark ribbon
      poly(
        [
          [58, 30],
          [68, 32],
          [63, 46],
        ],
        true,
        true,
      ),
    ],
  },

  // ---- life ---------------------------------------------------------------
  "life:basketball": {
    prims: [
      circle(50, 50, 32),
      line(50, 18, 50, 82),
      line(18, 50, 82, 50, true),
      poly(
        [
          [50, 18],
          [36, 34],
          [32, 50],
          [36, 66],
          [50, 82],
        ],
        false,
      ),
      poly(
        [
          [50, 18],
          [64, 34],
          [68, 50],
          [64, 66],
          [50, 82],
        ],
        false,
      ),
    ],
  },
  "life:football": {
    prims: [
      circle(50, 50, 32),
      poly(pentagon(50, 48, 12), true, true),
      ...[0, 1, 2, 3, 4].flatMap((i) => {
        const a = D(-90 + i * 72);
        const b = D(-90 + (i + 1) * 72);
        const mx = (Math.cos(a) + Math.cos(b)) / 2;
        const my = (Math.sin(a) + Math.sin(b)) / 2;
        const m = Math.hypot(mx, my) || 1;
        return [line(50 + Math.cos(a) * 12, 48 + Math.sin(a) * 12, 50 + (mx / m) * 32, 50 + (my / m) * 32)];
      }),
    ],
  },
  "life:music": {
    prims: [
      arc(50, 52, 30, 200, 340),
      poly(
        [
          [14, 54],
          [26, 54],
          [26, 72],
          [14, 72],
        ],
        true,
      ),
      poly(
        [
          [74, 54],
          [86, 54],
          [86, 72],
          [74, 72],
        ],
        true,
      ),
      // red note, the focal detail
      circle(58, 66, 4.5, true, true),
      line(62, 66, 62, 50, true),
      line(62, 50, 70, 53, true),
    ],
  },
  "life:places": {
    prims: [
      poly(
        [
          [12, 30],
          [84, 30],
          [84, 82],
          [12, 82],
        ],
        true,
      ),
      poly(
        [
          [12, 30],
          [38, 24],
          [62, 34],
          [84, 30],
        ],
        false,
      ),
      line(36, 25, 36, 81),
      line(60, 33, 60, 80),
      poly(
        [
          [18, 70],
          [30, 58],
          [42, 66],
          [54, 52],
        ],
        false,
      ),
      // red location pin
      circle(70, 46, 6, true),
      poly(
        [
          [64, 50],
          [76, 50],
          [70, 62],
        ],
        true,
        true,
      ),
    ],
  },
  "life:club": {
    prims: [
      poly(
        [
          [20, 42],
          [20, 62],
          [38, 62],
          [62, 76],
          [62, 28],
          [38, 42],
        ],
        true,
      ),
      poly(
        [
          [26, 62],
          [30, 82],
          [38, 82],
          [38, 62],
        ],
        true,
      ),
      line(38, 42, 62, 42),
      arc(64, 52, 8, -45, 45),
      arc(64, 52, 15, -45, 45),
      // red spark
      poly(
        [
          [80, 20],
          [83, 28],
          [91, 31],
          [83, 34],
          [80, 42],
          [77, 34],
          [69, 31],
          [77, 28],
        ],
        true,
        true,
      ),
    ],
  },
  "life:hackathon": {
    prims: [
      poly(
        [
          [26, 30],
          [74, 30],
          [74, 62],
          [26, 62],
        ],
        true,
      ),
      poly(
        [
          [18, 64],
          [82, 64],
          [88, 74],
          [12, 74],
        ],
        true,
      ),
      line(40, 40, 34, 46),
      line(34, 46, 40, 52),
      line(60, 40, 66, 46),
      line(66, 46, 60, 52),
      line(52, 38, 48, 54),
      // red flag
      line(64, 30, 64, 12),
      poly(
        [
          [64, 12],
          [80, 16],
          [64, 22],
        ],
        true,
        true,
      ),
    ],
  },

  // ---- social / actions ---------------------------------------------------
  "logo:github": {
    prims: [
      circle(30, 24, 8),
      circle(30, 76, 8),
      circle(72, 50, 8),
      line(30, 32, 30, 68),
      poly(
        [
          [30, 40],
          [50, 40],
          [72, 46],
        ],
        false,
      ),
      circle(30, 24, 4, true, true),
    ],
  },
  "logo:linkedin": {
    prims: [
      poly(
        [
          [16, 16],
          [84, 16],
          [84, 84],
          [16, 84],
        ],
        true,
      ),
      line(38, 44, 38, 70),
      circle(38, 36, 3),
      line(54, 70, 54, 44),
      poly(
        [
          [54, 50],
          [60, 44],
          [66, 50],
          [66, 70],
        ],
        false,
      ),
      circle(38, 36, 5, true, true),
    ],
  },
  "logo:leetcode": {
    prims: [
      line(30, 30, 30, 70),
      line(70, 30, 70, 70),
      line(30, 30, 70, 50),
      line(70, 50, 30, 70),
      poly(
        [
          [30, 30],
          [30, 70],
        ],
        false,
        true,
      ),
    ],
  },
  "logo:resume": {
    prims: [
      poly(
        [
          [24, 12],
          [62, 12],
          [76, 26],
          [76, 88],
          [24, 88],
        ],
        true,
      ),
      poly(
        [
          [62, 12],
          [62, 26],
          [76, 26],
        ],
        false,
      ),
      line(34, 40, 66, 40),
      line(34, 50, 66, 50),
      line(34, 60, 66, 60),
      line(34, 70, 54, 70),
      circle(62, 78, 8, true),
    ],
  },
  message: {
    prims: [
      poly(
        [
          [14, 20],
          [86, 20],
          [86, 70],
          [48, 70],
          [32, 84],
          [32, 70],
          [14, 70],
        ],
        true,
      ),
      circle(36, 45, 3.5),
      circle(50, 45, 3.5, true, true),
      circle(64, 45, 3.5),
    ],
  },
  "broken-link": {
    prims: [
      arc(30, 50, 10, 90, 270),
      line(30, 40, 46, 40),
      line(30, 60, 46, 60),
      arc(70, 50, 10, 270, 450),
      line(70, 40, 54, 40),
      line(70, 60, 54, 60),
      line(48, 44, 52, 52, true),
      line(52, 48, 48, 56, true),
    ],
  },
};

/* ------------------------------------------------------------------ sampler */

type Path =
  | { kind: "poly"; pts: Pt[] }
  | { kind: "ring"; c: Pt; r: number; a0: number; a1: number }
  | { kind: "disc"; c: Pt; r: number };

function toPath(p: Prim): Path {
  switch (p.t) {
    case "line":
      return { kind: "poly", pts: [p.a, p.b] };
    case "poly":
      return { kind: "poly", pts: p.closed ? [...p.pts, p.pts[0]] : p.pts };
    case "arc":
      return { kind: "ring", c: p.c, r: p.r, a0: p.a0, a1: p.a1 };
    case "circle":
      return p.fill
        ? { kind: "disc", c: p.c, r: p.r }
        : { kind: "ring", c: p.c, r: p.r, a0: 0, a1: Math.PI * 2 };
  }
}

function pathLength(p: Path): number {
  if (p.kind === "poly") {
    let len = 0;
    for (let i = 1; i < p.pts.length; i++) {
      len += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]);
    }
    return len;
  }
  if (p.kind === "ring") return Math.abs(p.a1 - p.a0) * p.r;
  return Math.PI * p.r * p.r * 0.6;
}

const rnd = (n: number) => (n < 0 ? 0 : n >= 1 ? 0.999999 : n);

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashKey(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pointAt(p: Path, u: number): Pt {
  const t = rnd(u);
  if (p.kind === "poly") {
    let total = 0;
    const segs: number[] = [];
    for (let i = 1; i < p.pts.length; i++) {
      const d = Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]);
      segs.push(d);
      total += d;
    }
    if (total === 0) return p.pts[0];
    let want = t * total;
    for (let i = 0; i < segs.length; i++) {
      if (want <= segs[i] || i === segs.length - 1) {
        const k = segs[i] === 0 ? 0 : want / segs[i];
        return [
          p.pts[i][0] + (p.pts[i + 1][0] - p.pts[i][0]) * k,
          p.pts[i][1] + (p.pts[i + 1][1] - p.pts[i][1]) * k,
        ];
      }
      want -= segs[i];
    }
    return p.pts[0];
  }
  if (p.kind === "ring") {
    const a = p.a0 + (p.a1 - p.a0) * t;
    return [p.c[0] + Math.cos(a) * p.r, p.c[1] + Math.sin(a) * p.r];
  }
  const a = t * Math.PI * 2;
  const rr = Math.sqrt(rnd((t * 7919) % 1)) * p.r;
  return [p.c[0] + Math.cos(a) * rr, p.c[1] + Math.sin(a) * rr];
}

/** Evenly spread `count` points along a weighted mix of paths. */
function spread(paths: Path[], count: number, rand: () => number): Pt[] {
  const out: Pt[] = [];
  if (count <= 0 || paths.length === 0) return out;
  const len = paths.map(pathLength);
  const total = len.reduce((a, b) => a + b, 0) || 1;
  // largest-remainder allocation keeps big strokes from being starved
  const quotas = len.map((l) => (l / total) * count);
  const base = quotas.map(Math.floor);
  const left = count - base.reduce((a, b) => a + b, 0);
  const order = quotas
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < left; k++) base[order[k % order.length].i]++;
  len.forEach((_, pi) => {
    const n = base[pi];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : (i + 0.5 + (rand() - 0.5) * 0.7) / n;
      out.push(pointAt(paths[pi], u));
    }
  });
  return out;
}

/**
 * Turn a shape key into `count` normalised targets in 0..1. Shapes are scaled
 * to a consistent footprint so every morph reads at the same visual weight.
 */
export function sampleShape(key: string, count: number, fit = 0.94): Target[] {
  const def = shapes[key] ?? shapes["rest:neural"];
  const rand = mulberry(hashKey(key));
  const accentPrims = def.prims.filter((p) => p.accent);
  const plainPrims = def.prims.filter((p) => !p.accent);
  const accentCount = accentPrims.length ? Math.max(24, Math.round(count * 0.11)) : 0;
  const pts = [
    ...spread(plainPrims.map(toPath), count - accentCount, rand),
    ...spread(accentPrims.map(toPath), accentCount, rand),
  ];
  return normalise(pts, accentPrims.length, count, fit, key);
}

function normalise(
  pts: Pt[],
  accentPrims: number,
  count: number,
  fit: number,
  seedKey: string,
): Target[] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = fit / Math.max(w, h);
  const offX = 0.5 - (w * scale) / 2 - minX * scale;
  const offY = 0.5 - (h * scale) / 2 - minY * scale;
  const audio = mulberry(hashKey(seedKey + ":s"));
  const accentTotal = accentPrims ? Math.max(24, Math.round(count * 0.11)) : 0;
  const firstAccent = pts.length - accentTotal;
  return pts.map(([x, y], i) => ({
    x: x * scale + offX,
    y: y * scale + offY,
    a: accentPrims > 0 && i >= firstAccent,
    s: 0.72 + audio() * 0.6,
  }));
}

