#!/usr/bin/env node
/**
 * Headless check for goku-shenron art points.
 * Runs the generator via sharp pixel data and prints diagnostics.
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// We need to import from the TS source — use tsx or compile first.
// For simplicity, inline the generator logic by loading it dynamically.
// But since this is a .mjs and the source is .ts, we use tsx.

// Alternatively, we can just copy-paste the compiled output.
// Let's use a simpler approach: call tsx to run a TS helper.

import { execSync } from "child_process";

// Write a small TS script that does the actual work
import { writeFileSync } from "fs";

const helperPath = resolve(__dirname, "_check-helper.ts");
writeFileSync(
  helperPath,
  `
import sharp from "sharp";
import { generateArtPoints, CLOUD_ELLIPSES, DRAGON_SPINE, ART_BBOX } from "../src/lib/art-points";
import type { ArtPoint, Layer } from "../src/lib/art-points";

const imgPath = "${resolve(__dirname, "../public/art/goku-shenron.png").replace(/\\/g, "\\\\")}";

async function main() {
  const img = sharp(imgPath);
  const { width, height } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();
  const pixels = new Uint8Array(raw.buffer, raw.byteOffset, raw.length);

  console.log(\`Source image: \${width}x\${height}\`);
  console.log("Generating points...");

  const points = generateArtPoints(pixels, width!, height!, {
    count: 6000,
    maxDim: 520,
    seed: 42,
  });

  console.log(\`\\nTotal points: \${points.length}\`);

  // Layer counts
  const layerCounts = new Map<string, number>();
  let redCount = 0;
  for (const p of points) {
    layerCounts.set(p.layer, (layerCounts.get(p.layer) || 0) + 1);
    if (p.accent) redCount++;
  }

  console.log("\\nLayer counts:");
  for (const [layer, count] of [...layerCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(\`  \${layer}: \${count}\`);
  }

  const redRatio = redCount / points.length;
  console.log(\`\\nRed accent dots: \${redCount} (\${(redRatio * 100).toFixed(1)}%)\`);

  // Bounding box
  let minU = 1, maxU = 0, minV = 1, maxV = 0;
  for (const p of points) {
    if (p.u < minU) minU = p.u;
    if (p.u > maxU) maxU = p.u;
    if (p.v < minV) minV = p.v;
    if (p.v > maxV) maxV = p.v;
  }
  console.log(\`\\nBounding box: u[\${minU.toFixed(3)}, \${maxU.toFixed(3)}] v[\${minV.toFixed(3)}, \${maxV.toFixed(3)}]\`);

  // Minimum nearest-neighbour distance (at 600px scale)
  const SCALE = 600;
  let minDist = Infinity;
  // Use a grid to speed this up
  const gridSize = 10; // px cells
  const gridW = Math.ceil(SCALE / gridSize) + 1;
  const gridH = Math.ceil(SCALE / gridSize) + 1;
  const grid = new Map<number, number[]>();
  const scaledPts = points.map(p => ({ x: p.u * SCALE, y: p.v * SCALE }));

  for (let i = 0; i < scaledPts.length; i++) {
    const gx = (scaledPts[i].x / gridSize) | 0;
    const gy = (scaledPts[i].y / gridSize) | 0;
    const key = gy * gridW + gx;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }

  for (let i = 0; i < scaledPts.length; i++) {
    const px = scaledPts[i].x, py = scaledPts[i].y;
    const gx = (px / gridSize) | 0;
    const gy = (py / gridSize) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = (gy + dy) * gridW + (gx + dx);
        const cell = grid.get(key);
        if (!cell) continue;
        for (const j of cell) {
          if (j <= i) continue;
          const ddx = scaledPts[j].x - px;
          const ddy = scaledPts[j].y - py;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < minDist) minDist = d;
        }
      }
    }
  }
  console.log(\`Min nearest-neighbour distance (at 600px): \${minDist.toFixed(3)}px\`);

  // ASCII density preview (100x60)
  const COLS = 100, ROWS = 60;
  const density = new Float32Array(COLS * ROWS);
  const redDensity = new Float32Array(COLS * ROWS);

  for (const p of points) {
    const col = Math.min(COLS - 1, (p.u * COLS) | 0);
    const row = Math.min(ROWS - 1, (p.v * ROWS) | 0);
    density[row * COLS + col]++;
    if (p.accent) redDensity[row * COLS + col]++;
  }

  console.log("\\n=== DENSITY PREVIEW ===");
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      const d = density[r * COLS + c];
      const rd = redDensity[r * COLS + c];
      if (rd > 0 && rd >= d * 0.5) line += "R";
      else if (d >= 4) line += "#";
      else if (d >= 2) line += "o";
      else if (d >= 1) line += ".";
      else line += " ";
    }
    console.log(line);
  }

  // ASCII layer preview (100x60)
  const layerMap: Record<string, string> = {
    cloud0: "C", cloud1: "C", cloud2: "C", cloud3: "C", cloud4: "C",
    dragon_body: "B", dragon_head: "H",
    whisker_left: "W", whisker_right: "W",
    goku: "G", hair: "A", scarf: "F", staff: "S",
  };

  const layerGrid = new Array(COLS * ROWS).fill(" ");
  // Track which layer dominates each cell
  const layerCellCounts = new Array(COLS * ROWS).fill(null).map(() => new Map<string, number>());

  for (const p of points) {
    const col = Math.min(COLS - 1, (p.u * COLS) | 0);
    const row = Math.min(ROWS - 1, (p.v * ROWS) | 0);
    const key = p.layer;
    const m = layerCellCounts[row * COLS + col];
    m.set(key, (m.get(key) || 0) + 1);
  }

  for (let i = 0; i < COLS * ROWS; i++) {
    const m = layerCellCounts[i];
    if (m.size === 0) continue;
    let best = "";
    let bestCount = 0;
    for (const [k, v] of m) {
      if (v > bestCount) { best = k; bestCount = v; }
    }
    layerGrid[i] = layerMap[best] || "?";
  }

  console.log("\\n=== LAYER PREVIEW ===");
  console.log("C=cloud B=dragon_body H=dragon_head W=whisker G=goku A=hair F=scarf S=staff");
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      line += layerGrid[r * COLS + c];
    }
    console.log(line);
  }

  // ── Assertions ──
  let failures = 0;
  function assert(cond: boolean, msg: string) {
    if (!cond) {
      console.error(\`FAIL: \${msg}\`);
      failures++;
    } else {
      console.log(\`PASS: \${msg}\`);
    }
  }

  console.log("\\n=== ASSERTIONS ===");
  assert(redRatio >= 0.06 && redRatio <= 0.14, \`Red ratio \${(redRatio*100).toFixed(1)}% in [6%, 14%]\`);
  assert(points.length >= 5500 && points.length <= 7000, \`Total points \${points.length} in [5500, 7000]\`);

  const requiredLayers: Layer[] = [
    "cloud0", "cloud1", "cloud2", "cloud3", "cloud4",
    "dragon_body", "dragon_head",
    "whisker_left", "whisker_right",
    "goku", "hair", "scarf", "staff",
  ];
  for (const layer of requiredLayers) {
    const c = layerCounts.get(layer) || 0;
    assert(c >= 60, \`Layer \${layer} has \${c} points (>= 60)\`);
  }

  for (const p of points) {
    if (p.u < 0 || p.u > 1 || p.v < 0 || p.v > 1) {
      assert(false, \`Point outside art bbox: u=\${p.u}, v=\${p.v}\`);
      break;
    }
  }
  assert(true, "All points within art bounding box");

  assert(minDist >= 0.6, \`Min nearest-neighbour distance \${minDist.toFixed(3)}px >= 0.6px\`);

  if (failures > 0) {
    console.error(\`\\n\${failures} assertion(s) FAILED\`);
    process.exit(1);
  } else {
    console.log("\\nAll assertions passed!");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
`,
);

// Run with tsx
try {
  const result = execSync(`npx tsx ${helperPath}`, {
    cwd: resolve(__dirname, ".."),
    stdio: "pipe",
    maxBuffer: 1024 * 1024 * 10,
    timeout: 60000,
  });
  process.stdout.write(result);
} catch (e) {
  if (e.stdout) process.stdout.write(e.stdout);
  if (e.stderr) process.stderr.write(e.stderr);
  process.exit(1);
} finally {
  // Clean up helper
  import("fs").then(fs => {
    try { fs.unlinkSync(helperPath); } catch {}
  });
}
