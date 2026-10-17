/**
 * Goku–Shenron stippled-dot generator.
 *
 * Pure function: takes raw RGBA pixel buffer + dimensions → array of
 * { u, v, layer, accent, weight } in normalised art-coordinates [0,1].
 *
 * Works identically in Node (fed by sharp) and in the browser (fed by
 * OffscreenCanvas / canvas getImageData).
 */

// ─── Layer tags ─────────────────────────────────────────────────────────────
export type Layer =
  | "cloud0"
  | "cloud1"
  | "cloud2"
  | "cloud3"
  | "cloud4"
  | "dragon_body"
  | "dragon_head"
  | "whisker_left"
  | "whisker_right"
  | "goku"
  | "hair"
  | "scarf"
  | "staff";

export type ArtPoint = {
  /** Normalised x in [0,1] across the art bounding box, origin top-left. */
  u: number;
  /** Normalised y in [0,1] across the art bounding box, origin top-left. */
  v: number;
  layer: Layer;
  accent: boolean;
  /** Visual weight 0–1, controls dot radius and opacity. */
  weight: number;
  /** Dragon spine parameter: 0 = tail tip, 1 = head. -1 for non-dragon. */
  s: number;
  /** Distance from hair centre, normalised. -1 for non-hair. */
  hairDist: number;
};

// ─── Constants (source-pixel coordinates, 809×964) ──────────────────────────

/** Subject bounding box (excluding frame and sky). */
export const ART_BBOX = { x0: 24, y0: 10, x1: 799, y1: 940 };
export const ART_W = ART_BBOX.x1 - ART_BBOX.x0; // 775
export const ART_H = ART_BBOX.y1 - ART_BBOX.y0; // 930

// ─── Manual layer regions (source-pixel coords) ────────────────────────────
export const CLOUD_ELLIPSES = [
  { cx: 610, cy: 130, rx: 115, ry: 60 },   // cloud0: top-right
  { cx: 145, cy: 250, rx: 90, ry: 55 },    // cloud1: left
  { cx: 255, cy: 480, rx: 70, ry: 48 },    // cloud2: centre-left (small)
  { cx: 655, cy: 500, rx: 80, ry: 65 },    // cloud3: right
  { cx: 185, cy: 740, rx: 140, ry: 80 },   // cloud4: bottom-left
];

// Dragon spine polyline (tail tip → body → neck → head)
export const DRAGON_SPINE: [number, number][] = [
  [115, 25],    // tail tip
  [100, 80],
  [80, 160],
  [65, 250],
  [75, 340],
  [110, 430],
  [160, 500],
  [230, 560],
  [310, 600],
  [380, 620],
  [420, 640],
  [470, 680],
  [520, 720],
  [560, 770],
  [600, 820],
  [650, 870],
  [700, 900],
  [720, 920],  // head tip
];

// Goku's head centre (for hair distance)
export const GOKU_HEAD = { cx: 400, cy: 240 };
export const HAIR_MAX_R = 160;

// Whisker polygons
const WHISKER_LEFT = [
  [24, 500], [80, 480], [130, 510], [180, 570],
  [250, 650], [310, 720], [360, 780], [420, 840],
  [400, 860], [320, 820], [220, 740], [140, 640],
  [70, 570], [24, 550],
] as [number, number][];

const WHISKER_RIGHT = [
  [660, 400], [740, 400], [780, 460], [795, 540], [795, 680],
  [785, 780], [775, 840], [750, 920], [680, 930],
  [650, 900], [670, 840], [720, 810], [730, 750],
  [730, 670], [710, 580], [670, 500], [650, 440],
] as [number, number][];

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inEllipse(
  px: number,
  py: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): boolean {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function inPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Project point onto spine polyline, return parameter s in [0,1]. */
export function projectOntoSpine(
  px: number,
  py: number,
  spine: [number, number][],
): number {
  const segLens: number[] = [];
  let totalLen = 0;
  for (let i = 1; i < spine.length; i++) {
    const dx = spine[i][0] - spine[i - 1][0];
    const dy = spine[i][1] - spine[i - 1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    totalLen += len;
  }

  let bestDist = Infinity;
  let bestS = 0;
  let cumLen = 0;

  for (let i = 0; i < segLens.length; i++) {
    const ax = spine[i][0], ay = spine[i][1];
    const bx = spine[i + 1][0], by = spine[i + 1][1];
    const dx = bx - ax, dy = by - ay;
    const len = segLens[i];
    if (len < 0.001) continue;

    let t = ((px - ax) * dx + (py - ay) * dy) / (len * len);
    t = clamp(t, 0, 1);
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));

    if (dist < bestDist) {
      bestDist = dist;
      bestS = (cumLen + t * len) / totalLen;
    }
    cumLen += len;
  }
  return bestS;
}

/** Get perpendicular normal at spine parameter s. */
export function spineNormalAt(
  s: number,
  spine: [number, number][],
): { nx: number; ny: number } {
  const segLens: number[] = [];
  let totalLen = 0;
  for (let i = 1; i < spine.length; i++) {
    const dx = spine[i][0] - spine[i - 1][0];
    const dy = spine[i][1] - spine[i - 1][1];
    segLens.push(Math.sqrt(dx * dx + dy * dy));
    totalLen += segLens[segLens.length - 1];
  }

  const targetLen = s * totalLen;
  let cumLen = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (cumLen + segLens[i] >= targetLen || i === segLens.length - 1) {
      const dx = spine[i + 1][0] - spine[i][0];
      const dy = spine[i + 1][1] - spine[i][1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { nx: -dy / len, ny: dx / len };
    }
    cumLen += segLens[i];
  }
  return { nx: 0, ny: -1 };
}

// ─── Background and Exclusion ───────────────────────────────────────────────

function isExcludedPixel(
  srcX: number,
  srcY: number,
  r: number,
  g: number,
  b: number,
  a: number,
): boolean {
  if (a < 50) return true;

  // Blue sky fill: indigo-blue with high B
  const isPouch = srcX >= 295 && srcX <= 350 && srcY >= 420 && srcY <= 530;
  if (!isPouch && b > 50 && (b - r > 16 || b - g > 12)) {
    return true;
  }

  // Yellow frame rectangle and borders:
  const isTailCrossing = srcX >= 75 && srcX <= 145 && srcY <= 120;
  const isStaffCrossing = srcX >= 640 && srcX <= 740 && srcY <= 120;
  const isHeadCrossing = srcX >= 430 && srcY >= 580;
  const isLeftWhiskerCrossing = srcX <= 65 && srcY >= 510 && srcY <= 570;
  const isCrossing = isTailCrossing || isStaffCrossing || isHeadCrossing || isLeftWhiskerCrossing;

  if (!isCrossing) {
    if (srcY >= 58 && srcY <= 77) return true;
    if (srcY >= 802 && srcY <= 826) return true;
    if (srcX >= 36 && srcX <= 54) return true;
    if (srcX >= 743 && srcX <= 762) return true;
    if (srcX < 36 || srcX > 762 || srcY < 58 || srcY > 826) return true;
  }

  return false;
}

// ─── Red Accent Detection (Precise) ─────────────────────────────────────────

function isRedAccent(
  srcX: number,
  srcY: number,
  r: number,
  g: number,
  b: number,
): boolean {
  // 1. Staff line: from (715, 45) to (615, 380)
  const x0 = 715, y0 = 45, x1 = 615, y1 = 380;
  const dx = x1 - x0, dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const t = clamp(((srcX - x0) * dx + (srcY - y0) * dy) / lenSq, 0, 1);
  const distToStaff = Math.hypot(srcX - (x0 + t * dx), srcY - (y0 + t * dy));
  if (distToStaff < 16 && srcY >= 25 && srcY <= 410) {
    if (r > 100 && r > g * 1.15 && r > b * 1.15) return true;
  }

  // 2. Goku wristband
  if (srcX >= 256 && srcX <= 292 && srcY >= 324 && srcY <= 375) {
    if (r > 120 && r > g * 1.2) return true;
  }

  // 3. Goku mouth interior
  if (srcX >= 395 && srcX <= 453 && srcY >= 330 && srcY <= 378) {
    if (r > 120 && r > g * 1.2) return true;
  }

  // 4. Goku shoe soles
  if (
    (srcX >= 310 && srcX <= 350 && srcY >= 615 && srcY <= 640) ||
    (srcX >= 590 && srcX <= 645 && srcY >= 560 && srcY <= 600 && r > 130 && r > g * 1.2)
  ) {
    return true;
  }

  // 5. Shenron lips / tongue
  if (srcX >= 480 && srcX <= 630 && srcY >= 740 && srcY <= 936) {
    if (r > 135 && r > g * 1.3 && r > b * 1.3) return true;
  }

  return false;
}

// ─── Layer Classification ───────────────────────────────────────────────────

function classifyLayer(
  srcX: number,
  srcY: number,
  g: number,
  b: number,
  a: number,
  lumVal: number,
): Layer {
  // 1. Staff
  const x0 = 715, y0 = 45, x1 = 615, y1 = 380;
  const dx = x1 - x0, dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  const t = clamp(((srcX - x0) * dx + (srcY - y0) * dy) / lenSq, 0, 1);
  const distToStaff = Math.hypot(srcX - (x0 + t * dx), srcY - (y0 + t * dy));
  if (distToStaff < 16 && srcY >= 20 && srcY <= 420) {
    return "staff";
  }

  // 2. Clouds (5 ellipses)
  for (let i = 0; i < CLOUD_ELLIPSES.length; i++) {
    const c = CLOUD_ELLIPSES[i];
    if (inEllipse(srcX, srcY, c.cx, c.cy, c.rx, c.ry)) {
      const isGreenish = g > 100 && g > b + 15;
      if (!isGreenish) return `cloud${i}` as Layer;
    }
  }

  // 3. Scarf (white sash at Goku's waist)
  if (srcX >= 300 && srcX <= 520 && srcY >= 410 && srcY <= 530) {
    if (lumVal > 0.60 && a > 200) return "scarf";
  }

  // 4. Whiskers
  if (inPolygon(srcX, srcY, WHISKER_LEFT)) return "whisker_left";
  if (inPolygon(srcX, srcY, WHISKER_RIGHT)) return "whisker_right";

  // 5. Dragon head (lower right)
  if (srcX >= 365 && srcX <= 800 && srcY >= 585 && srcY <= 942) {
    return "dragon_head";
  }

  // 6. Hair (black spiky hair)
  const hairDist = Math.hypot(srcX - GOKU_HEAD.cx, srcY - GOKU_HEAD.cy);
  if (hairDist < HAIR_MAX_R && srcY < 340 && lumVal < 0.30) {
    return "hair";
  }

  // 7. Goku body (center upper)
  if (srcX >= 240 && srcX <= 650 && srcY >= 90 && srcY <= 720) {
    const isGreenish = g > 100 && g > b + 15;
    if (!isGreenish) return "goku";
  }

  // 8. Dragon body
  return "dragon_body";
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export type GeneratorConfig = {
  count?: number;
  maxDim?: number;
  seed?: number;
};

export function generateArtPoints(
  pixels: Uint8Array | Uint8ClampedArray,
  srcW: number,
  srcH: number,
  config: GeneratorConfig = {},
): ArtPoint[] {
  const {
    count = 6000,
    maxDim = 520,
    seed = 42,
  } = config;

  const rand = mulberry32(seed);

  // ── Step 1: Downscale ──
  const scale = maxDim / Math.max(srcW, srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const downscaled = new Uint8Array(w * h * 4);

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const sx = clamp(Math.round(dx / scale), 0, srcW - 1);
      const sy = clamp(Math.round(dy / scale), 0, srcH - 1);
      const sp = (sy * srcW + sx) * 4;
      const dp = (dy * w + dx) * 4;
      downscaled[dp] = pixels[sp];
      downscaled[dp + 1] = pixels[sp + 1];
      downscaled[dp + 2] = pixels[sp + 2];
      downscaled[dp + 3] = pixels[sp + 3];
    }
  }

  // ── Step 2: Compute luminance & Sobel edge strength ──
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const a = downscaled[p + 3] / 255;
    lum[i] = (0.2126 * downscaled[p] + 0.7152 * downscaled[p + 1] + 0.0722 * downscaled[p + 2]) / 255 * a;
  }

  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = lum[(y - 1) * w + x - 1], tc = lum[(y - 1) * w + x], tr = lum[(y - 1) * w + x + 1];
      const ml = lum[y * w + x - 1], mr = lum[y * w + x + 1];
      const bl = lum[(y + 1) * w + x - 1], bc = lum[(y + 1) * w + x], br = lum[(y + 1) * w + x + 1];
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      edge[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // ── Step 3+4: Weight formula for stippled line art ──
  const weight = new Float32Array(w * h);
  const isRed = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const srcX = x / scale, srcY = y / scale;
      const p = idx * 4;
      const r = downscaled[p], g = downscaled[p + 1], b = downscaled[p + 2], a = downscaled[p + 3];

      if (isExcludedPixel(srcX, srcY, r, g, b, a)) continue;

      const L = lum[idx];
      const E = clamp(edge[idx], 0, 1);
      const darkness = 1 - L;

      // Stippled line art: lines, edges, dark hair, and shadow creases carry the picture.
      let wt = 0;
      if (E > 0.08 || darkness > 0.55) {
        wt = clamp(0.45 * darkness + 1.1 * E, 0, 1);
        wt = Math.pow(wt, 1.15);
      } else if (darkness > 0.25 && E > 0.04) {
        wt = clamp(0.2 * (darkness - 0.25) + 0.6 * E, 0, 1);
        wt = Math.pow(wt, 1.3);
      }

      // Check red accent regions
      const isAcc = isRedAccent(srcX, srcY, r, g, b);
      if (isAcc) {
        wt = Math.max(wt, 0.85);
      }

      // Face density boosts
      const dGoku = Math.hypot(srcX - 400, srcY - 310);
      if (dGoku < 80) wt = clamp(wt * 1.8, 0, 1);
      const dShen = Math.hypot(srcX - 580, srcY - 800);
      if (dShen < 120) wt = clamp(wt * 1.5, 0, 1);

      weight[idx] = wt;
      isRed[idx] = isAcc ? 1 : 0;
    }
  }

  // ── Step 5: Variable-radius Poisson-disc sampling ──
  const minR = 1.48;
  const maxR = 4.0;
  const cellSize = minR / Math.SQRT2;
  const gridW = Math.ceil(w / cellSize);
  const gridH = Math.ceil(h / cellSize);
  const grid = new Int32Array(gridW * gridH).fill(-1);
  const points: {
    x: number;
    y: number;
    srcX: number;
    srcY: number;
    wt: number;
    layer: Layer;
    accent: boolean;
  }[] = [];
  const activeList: number[] = [];

  function canPlace(px: number, py: number, minDist: number): boolean {
    const gx = (px / cellSize) | 0;
    const gy = (py / cellSize) | 0;
    const searchR = Math.ceil(minDist / cellSize) + 1;
    for (let dy = -searchR; dy <= searchR; dy++) {
      for (let dx = -searchR; dx <= searchR; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
        const pidx = grid[ny * gridW + nx];
        if (pidx < 0) continue;
        const ddx = points[pidx].x - px;
        const ddy = points[pidx].y - py;
        if (ddx * ddx + ddy * ddy < minDist * minDist) return false;
      }
    }
    return true;
  }

  function addPoint(px: number, py: number): boolean {
    const ix = clamp(Math.round(px), 0, w - 1);
    const iy = clamp(Math.round(py), 0, h - 1);
    const wt = weight[iy * w + ix];
    if (wt < 0.04) return false;

    const minDist = minR + (1 - wt) * (maxR - minR);
    if (!canPlace(px, py, minDist)) return false;

    const srcX = px / scale, srcY = py / scale;
    const p = (iy * w + ix) * 4;
    const layer = classifyLayer(srcX, srcY, downscaled[p + 1], downscaled[p + 2], downscaled[p + 3], lum[iy * w + ix]);
    const isAcc = isRed[iy * w + ix] === 1 || layer === "staff";

    const pidx = points.length;
    points.push({
      x: px,
      y: py,
      srcX,
      srcY,
      wt,
      layer,
      accent: isAcc,
    });

    const gx = (px / cellSize) | 0;
    const gy = (py / cellSize) | 0;
    if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
      grid[gy * gridW + gx] = pidx;
    }
    activeList.push(pidx);
    return true;
  }

  // 1. Explicit seeds along the staff (guarantees solid staff line)
  for (let t = 0; t <= 1; t += 0.02) {
    const sx = (715 * (1 - t) + 615 * t) * scale;
    const sy = (45 * (1 - t) + 380 * t) * scale;
    addPoint(sx, sy);
  }

  // 2. Explicit seeds in clouds
  for (const c of CLOUD_ELLIPSES) {
    for (let k = 0; k < 20; k++) {
      const a = rand() * Math.PI * 2;
      const r = rand() * 0.8;
      const sx = (c.cx + Math.cos(a) * c.rx * r) * scale;
      const sy = (c.cy + Math.sin(a) * c.ry * r) * scale;
      addPoint(sx, sy);
    }
  }

  // 3. Explicit seeds in cloud4 (bottom left)
  for (let k = 0; k < 40; k++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * 0.8;
    const sx = (185 + Math.cos(a) * 140 * r) * scale;
    const sy = (740 + Math.sin(a) * 80 * r) * scale;
    addPoint(sx, sy);
  }

  // 4. Initial random seeds across the subject
  for (let i = 0; i < 3000; i++) {
    const sx = rand() * w, sy = rand() * h;
    const ix = Math.round(sx), iy = Math.round(sy);
    if (iy < h && ix < w && weight[iy * w + ix] > 0.15) addPoint(sx, sy);
  }

  // 5. Poisson dart throwing with automatic replenishment
  let attempts = 0;
  while (points.length < count && attempts < 100000) {
    attempts++;
    if (activeList.length === 0) {
      for (let s = 0; s < 500; s++) {
        const sx = rand() * w, sy = rand() * h;
        if (addPoint(sx, sy)) break;
      }
      if (activeList.length === 0) break;
    }

    const aidx = (rand() * activeList.length) | 0;
    const p = points[activeList[aidx]];
    const ptMinDist = minR + (1 - p.wt) * (maxR - minR);
    let placed = false;

    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = rand() * Math.PI * 2;
      const dist = ptMinDist + rand() * ptMinDist;
      const nx = p.x + Math.cos(angle) * dist;
      const ny = p.y + Math.sin(angle) * dist;

      if (nx >= 0 && nx < w && ny >= 0 && ny < h && addPoint(nx, ny)) {
        placed = true;
      }
    }

    if (!placed) {
      activeList[aidx] = activeList[activeList.length - 1];
      activeList.pop();
    }
  }

  // ── Step 6+7: Normalise and emit ArtPoints ──
  const result: ArtPoint[] = [];
  for (const pt of points) {
    const srcX = pt.srcX, srcY = pt.srcY;

    const u = clamp((srcX - ART_BBOX.x0) / ART_W, 0, 1);
    const v = clamp((srcY - ART_BBOX.y0) / ART_H, 0, 1);

    let s = -1;
    if (pt.layer === "dragon_body" || pt.layer === "dragon_head") {
      s = projectOntoSpine(srcX, srcY, DRAGON_SPINE);
    }

    let hairDist = -1;
    if (pt.layer === "hair") {
      hairDist = clamp(Math.hypot(srcX - GOKU_HEAD.cx, srcY - GOKU_HEAD.cy) / HAIR_MAX_R, 0, 1);
    }

    result.push({
      u,
      v,
      layer: pt.layer,
      accent: pt.accent,
      weight: pt.wt,
      s,
      hairDist,
    });
  }

  return result;
}

// ─── Target conversion for particle field ───────────────────────────────────

// Scale art to fill the available canvas space nicely (98% height, 81.6% width)
export const FIT_H = 0.98;
export const FIT_W = FIT_H * (ART_W / ART_H); // 0.98 * (775 / 930) = 0.8167
export const OFF_X = (1 - FIT_W) / 2; // ~0.0916
export const OFF_Y = (1 - FIT_H) / 2; // 0.010

export function artPointsToTargets(pts: ArtPoint[]): {
  x: number;
  y: number;
  a: boolean;
  s: number;
  layer: Layer;
  spineS: number;
  hairDist: number;
  weight: number;
}[] {
  return pts.map((p) => ({
    x: OFF_X + p.u * FIT_W,
    y: OFF_Y + p.v * FIT_H,
    a: p.accent,
    // Size factor 1.0 - 1.8 for crisp, readable dots
    s: 1.0 + p.weight * 0.8,
    layer: p.layer,
    spineS: p.s,
    hairDist: p.hairDist,
    weight: p.weight,
  }));
}
