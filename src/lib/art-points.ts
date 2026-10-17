/**
 * Stippled dot-field sampler for the hero portrait.
 *
 * Pure function: raw RGBA pixel buffer + dimensions -> sampled points in
 * normalised art coordinates [0,1], together with the ink bounding box they
 * were normalised against.
 *
 * Works identically in Node (fed by sharp) and in the browser (fed by an
 * offscreen canvas getImageData), so any artwork can be inspected headlessly
 * with scripts/check-art.mjs.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ArtPoint = {
  /** Normalised x in [0,1] across the artwork bounding box, origin top-left. */
  u: number;
  /** Normalised y in [0,1] across the artwork bounding box, origin top-left. */
  v: number;
  /** True when the pixel belongs to the artwork's saturated accent colour. */
  accent: boolean;
  /** Visual weight 0–1, controls dot radius and opacity. */
  weight: number;
};

/** Ink bounding box in source-pixel coordinates. */
export type ArtBBox = { x0: number; y0: number; x1: number; y1: number };

export type ArtSample = {
  points: ArtPoint[];
  bbox: ArtBBox;
};

export type GeneratorConfig = {
  count?: number;
  maxDim?: number;
  seed?: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// ─── Pixel rules (artwork-agnostic) ─────────────────────────────────────────

/**
 * Paper. Anything transparent, or light and desaturated — which covers both a
 * plain white page and a transparency checkerboard flattened into the file.
 */
function isBackground(r: number, g: number, b: number, a: number): boolean {
  if (a < 60) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return luminance(r, g, b) > 0.894 && max - min < 16;
}

/**
 * The artwork's single saturated accent. These pixels always land in the
 * accent pass (red ink) regardless of how dark they are.
 */
function isAccentColour(r: number, g: number, b: number, a: number): boolean {
  if (a < 60) return false;
  return r > 95 && r > g * 1.2 && r > b * 1.2;
}

// ─── Bounding box ────────────────────────────────────────────────────────────

function inkBoundingBox(
  pixels: Uint8Array | Uint8ClampedArray,
  srcW: number,
  srcH: number,
): ArtBBox {
  let x0 = srcW;
  let y0 = srcH;
  let x1 = 0;
  let y1 = 0;
  let found = false;

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const p = (y * srcW + x) * 4;
      if (isBackground(pixels[p], pixels[p + 1], pixels[p + 2], pixels[p + 3])) continue;
      found = true;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  if (!found) return { x0: 0, y0: 0, x1: srcW, y1: srcH };
  return { x0, y0, x1, y1 };
}

// ─── Main generator ──────────────────────────────────────────────────────────

export function generateArtPoints(
  pixels: Uint8Array | Uint8ClampedArray,
  srcW: number,
  srcH: number,
  config: GeneratorConfig = {},
): ArtSample {
  const { count = 6000, maxDim = 520, seed = 42 } = config;

  const rand = mulberry32(seed);
  const bbox = inkBoundingBox(pixels, srcW, srcH);

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

  // ── Step 2: Luminance & Sobel edge strength ──
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const a = downscaled[p + 3] / 255;
    lum[i] = luminance(downscaled[p], downscaled[p + 1], downscaled[p + 2]) * a;
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

  // ── Step 3: Weight each pixel ──
  const weight = new Float32Array(w * h);
  const isAccent = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const p = idx * 4;
      const r = downscaled[p], g = downscaled[p + 1], b = downscaled[p + 2], a = downscaled[p + 3];

      if (isBackground(r, g, b, a)) continue;

      const L = lum[idx];
      const E = clamp(edge[idx], 0, 1);
      const darkness = 1 - L;

      // Stippled line art: lines, edges, and solid fills carry the picture.
      let wt = 0;
      if (E > 0.08 || darkness > 0.55) {
        wt = clamp(0.45 * darkness + 1.1 * E, 0, 1);
        wt = Math.pow(wt, 1.15);
      } else if (darkness > 0.25 && E > 0.04) {
        wt = clamp(0.2 * (darkness - 0.25) + 0.6 * E, 0, 1);
        wt = Math.pow(wt, 1.3);
      }

      if (isAccentColour(r, g, b, a)) {
        wt = Math.max(wt, 0.85);
        isAccent[idx] = 1;
      }

      weight[idx] = wt;
    }
  }

  // ── Step 4: Variable-radius Poisson-disc sampling ──
  const minR = 1.48;
  const maxR = 4.0;
  const cellSize = minR / Math.SQRT2;
  const gridW = Math.ceil(w / cellSize);
  const gridH = Math.ceil(h / cellSize);
  const grid = new Int32Array(gridW * gridH).fill(-1);
  const points: { x: number; y: number; srcX: number; srcY: number; wt: number; accent: boolean }[] = [];
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
    const idx = iy * w + ix;
    const wt = weight[idx];
    if (wt < 0.04) return false;

    const minDist = minR + (1 - wt) * (maxR - minR);
    if (!canPlace(px, py, minDist)) return false;

    points.push({
      x: px,
      y: py,
      srcX: px / scale,
      srcY: py / scale,
      wt,
      accent: isAccent[idx] === 1,
    });

    const gx = (px / cellSize) | 0;
    const gy = (py / cellSize) | 0;
    if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH) {
      grid[gy * gridW + gx] = points.length - 1;
    }
    activeList.push(points.length - 1);
    return true;
  }

  // 1. Initial random seeds across the artwork
  for (let i = 0; i < 3000; i++) {
    const sx = rand() * w, sy = rand() * h;
    const ix = Math.round(sx), iy = Math.round(sy);
    if (iy < h && ix < w && weight[iy * w + ix] > 0.15) addPoint(sx, sy);
  }

  // 2. Poisson dart throwing with automatic replenishment
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

  // ── Step 5: Normalise to the ink bounding box ──
  const bw = Math.max(1, bbox.x1 - bbox.x0);
  const bh = Math.max(1, bbox.y1 - bbox.y0);

  const result: ArtPoint[] = points.map((pt) => ({
    u: clamp((pt.srcX - bbox.x0) / bw, 0, 1),
    v: clamp((pt.srcY - bbox.y0) / bh, 0, 1),
    accent: pt.accent,
    weight: pt.wt,
  }));

  return { points: result, bbox };
}

// ─── Target conversion for the particle field ────────────────────────────────

/**
 * Scale the artwork to fill 98% of the square canvas along whichever axis is
 * constraining, then centre it.
 */
export function artPointsToTargets(art: ArtSample) {
  const bw = Math.max(1, art.bbox.x1 - art.bbox.x0);
  const bh = Math.max(1, art.bbox.y1 - art.bbox.y0);
  const aspect = bw / bh;

  const fitH = aspect <= 1 ? 0.98 : 0.98 / aspect;
  const fitW = aspect <= 1 ? 0.98 * aspect : 0.98;
  const offX = (1 - fitW) / 2;
  const offY = (1 - fitH) / 2;

  return art.points.map((p) => ({
    x: offX + p.u * fitW,
    y: offY + p.v * fitH,
    a: p.accent,
    // Size factor 1.0 - 1.8 for crisp, readable dots
    s: 1.0 + p.weight * 0.8,
    weight: p.weight,
  }));
}
