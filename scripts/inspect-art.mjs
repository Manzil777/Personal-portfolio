#!/usr/bin/env node
/**
 * Inspect goku-shenron.png and print measured regions.
 * Uses sharp (available via next).
 */
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imgPath = resolve(__dirname, "../public/art/goku-shenron.png");

const img = sharp(imgPath);
const { width, height, channels } = await img.metadata();
console.log(`Image: ${width}x${height}, channels=${channels}`);

const raw = await img.ensureAlpha().raw().toBuffer();
const W = width, H = height;

// Helper: get RGBA at (x, y)
function px(x, y) {
  const i = (y * W + x) * 4;
  return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]];
}

// 1. Alpha bounding box
let aMinX = W, aMinY = H, aMaxX = 0, aMaxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (raw[(y * W + x) * 4 + 3] > 10) {
      if (x < aMinX) aMinX = x;
      if (x > aMaxX) aMaxX = x;
      if (y < aMinY) aMinY = y;
      if (y > aMaxY) aMaxY = y;
    }
  }
}
console.log(`\nAlpha bbox: (${aMinX}, ${aMinY}) - (${aMaxX}, ${aMaxY})`);

// 2. Detect the yellow frame: find pixels that are strongly yellow (R>180, G>160, B<100, A>200)
function isYellow(r, g, b, a) {
  return a > 200 && r > 180 && g > 160 && b < 100;
}

// Scan for yellow frame rectangle - find the inner edge of the frame
// by scanning from each side
let frameLeft = W, frameRight = 0, frameTop = H, frameBottom = 0;
let yellowPixels = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = px(x, y);
    if (isYellow(r, g, b, a)) {
      yellowPixels++;
      if (x < frameLeft) frameLeft = x;
      if (x > frameRight) frameRight = x;
      if (y < frameTop) frameTop = y;
      if (y > frameBottom) frameBottom = y;
    }
  }
}
console.log(`\nYellow frame outer bbox: (${frameLeft}, ${frameTop}) - (${frameRight}, ${frameBottom})`);
console.log(`Yellow pixel count: ${yellowPixels}`);

// Find inner edge by scanning inward from each side at the center
function findInnerEdge(axis, fixed, dir, isStart) {
  if (axis === "h") {
    // horizontal scan at row=fixed
    let x = isStart ? frameLeft : frameRight;
    const step = isStart ? 1 : -1;
    let lastYellow = x;
    for (let i = 0; i < 100; i++) {
      const [r, g, b, a] = px(x, fixed);
      if (isYellow(r, g, b, a)) lastYellow = x;
      else if (a > 200) break; // hit non-yellow content
      x += step;
    }
    return lastYellow;
  } else {
    // vertical scan at col=fixed
    let y = isStart ? frameTop : frameBottom;
    const step = isStart ? 1 : -1;
    let lastYellow = y;
    for (let i = 0; i < 100; i++) {
      const [r, g, b, a] = px(fixed, y);
      if (isYellow(r, g, b, a)) lastYellow = y;
      else if (a > 200) break;
      y += step;
    }
    return lastYellow;
  }
}

const midX = Math.round((frameLeft + frameRight) / 2);
const midY = Math.round((frameTop + frameBottom) / 2);
const innerLeft = findInnerEdge("h", midY, 1, true);
const innerRight = findInnerEdge("h", midY, -1, false);
const innerTop = findInnerEdge("v", midX, 1, true);
const innerBottom = findInnerEdge("v", midX, -1, false);
console.log(`Frame inner edge: (${innerLeft}, ${innerTop}) - (${innerRight}, ${innerBottom})`);

// 3. Sky blue detection: (R<120, G<100, B>130, A>200)
function isSkyBlue(r, g, b, a) {
  return a > 200 && r < 140 && g < 120 && b > 130;
}

let blueCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = px(x, y);
    if (isSkyBlue(r, g, b, a)) blueCount++;
  }
}
console.log(`\nSky-blue pixel count: ${blueCount}`);

// 4. Red blobs (R>180, G<80, B<80, A>200)
function isRed(r, g, b, a) {
  return a > 200 && r > 160 && g < 100 && b < 100;
}

let redMinX = W, redMinY = H, redMaxX = 0, redMaxY = 0, redCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = px(x, y);
    if (isRed(r, g, b, a)) {
      redCount++;
      if (x < redMinX) redMinX = x;
      if (x > redMaxX) redMaxX = x;
      if (y < redMinY) redMinY = y;
      if (y > redMaxY) redMaxY = y;
    }
  }
}
console.log(`\nRed pixels bbox: (${redMinX}, ${redMinY}) - (${redMaxX}, ${redMaxY}), count=${redCount}`);

// 5. Find clusters of red pixels (connected component labeling - simple)
// Just report bounding boxes of vertically-connected red runs
const redRegions = [];
const visited = new Uint8Array(W * H);
function floodRed(sx, sy) {
  const stack = [[sx, sy]];
  let minX = sx, maxX = sx, minY = sy, maxY = sy, cnt = 0;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const idx = cy * W + cx;
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
    if (visited[idx]) continue;
    const [r, g, b, a] = px(cx, cy);
    if (!isRed(r, g, b, a)) continue;
    visited[idx] = 1;
    cnt++;
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
    stack.push([cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]);
  }
  return { minX, minY, maxX, maxY, count: cnt };
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (visited[y * W + x]) continue;
    const [r, g, b, a] = px(x, y);
    if (isRed(r, g, b, a)) {
      const region = floodRed(x, y);
      if (region.count > 20) { // filter noise
        redRegions.push(region);
      }
    }
  }
}
console.log(`\nRed regions (>20px):`);
for (const r of redRegions) {
  console.log(`  (${r.minX}, ${r.minY}) - (${r.maxX}, ${r.maxY})  count=${r.count}`);
}

// 6. White blobs (cloud candidates: R>220, G>220, B>220, A>200)
function isWhite(r, g, b, a) {
  return a > 200 && r > 220 && g > 220 && b > 220;
}

const whiteVisited = new Uint8Array(W * H);
function floodWhite(sx, sy) {
  const stack = [[sx, sy]];
  let minX = sx, maxX = sx, minY = sy, maxY = sy, cnt = 0;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    const idx = cy * W + cx;
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
    if (whiteVisited[idx]) continue;
    const [r, g, b, a] = px(cx, cy);
    if (!isWhite(r, g, b, a)) continue;
    whiteVisited[idx] = 1;
    cnt++;
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
    stack.push([cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]);
  }
  return { minX, minY, maxX, maxY, count: cnt };
}

const whiteRegions = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (whiteVisited[y * W + x]) continue;
    const [r, g, b, a] = px(x, y);
    if (isWhite(r, g, b, a)) {
      const region = floodWhite(x, y);
      if (region.count > 200) {
        whiteRegions.push(region);
      }
    }
  }
}
console.log(`\nWhite regions (>200px, potential clouds/scarf/eyes):`);
for (const r of whiteRegions) {
  console.log(`  (${r.minX}, ${r.minY}) - (${r.maxX}, ${r.maxY})  count=${r.count}  center=(${Math.round((r.minX+r.maxX)/2)}, ${Math.round((r.minY+r.maxY)/2)})`);
}

// 7. Green blobs (dragon body: G > R+30, G > B+30, G > 100, A>200)
function isGreen(r, g, b, a) {
  return a > 200 && g > 100 && g > r + 20 && g > b + 20;
}

let greenMinX = W, greenMinY = H, greenMaxX = 0, greenMaxY = 0, greenCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = px(x, y);
    if (isGreen(r, g, b, a)) {
      greenCount++;
      if (x < greenMinX) greenMinX = x;
      if (x > greenMaxX) greenMaxX = x;
      if (y < greenMinY) greenMinY = y;
      if (y > greenMaxY) greenMaxY = y;
    }
  }
}
console.log(`\nGreen (dragon body) bbox: (${greenMinX}, ${greenMinY}) - (${greenMaxX}, ${greenMaxY}), count=${greenCount}`);

// 8. Black blobs (hair: R<60, G<60, B<60, A>200)
function isBlack(r, g, b, a) {
  return a > 200 && r < 60 && g < 60 && b < 60;
}

let blackMinX = W, blackMinY = H, blackMaxX = 0, blackMaxY = 0, blackCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = px(x, y);
    if (isBlack(r, g, b, a)) {
      blackCount++;
      if (x < blackMinX) blackMinX = x;
      if (x > blackMaxX) blackMaxX = x;
      if (y < blackMinY) blackMinY = y;
      if (y > blackMaxY) blackMaxY = y;
    }
  }
}
console.log(`\nBlack (hair/outlines) bbox: (${blackMinX}, ${blackMinY}) - (${blackMaxX}, ${blackMaxY}), count=${blackCount}`);

// 9. Orange/tan (Goku's gi: R>180, G>120, G<180, B<100, A>200 - distinguish from yellow frame)
function isOrange(r, g, b, a) {
  return a > 200 && r > 180 && g > 100 && g < 180 && b < 100 && (r - g) > 20;
}

let orangeMinX = W, orangeMinY = H, orangeMaxX = 0, orangeMaxY = 0, orangeCount = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b, a] = px(x, y);
    if (isOrange(r, g, b, a)) {
      orangeCount++;
      if (x < orangeMinX) orangeMinX = x;
      if (x > orangeMaxX) orangeMaxX = x;
      if (y < orangeMinY) orangeMinY = y;
      if (y > orangeMaxY) orangeMaxY = y;
    }
  }
}
console.log(`\nOrange (gi) bbox: (${orangeMinX}, ${orangeMinY}) - (${orangeMaxX}, ${orangeMaxY}), count=${orangeCount}`);

// 10. Sample some specific pixels to calibrate thresholds
const samples = [
  [400, 100, "sky blue area"],
  [50, 50, "yellow frame corner"],
  [420, 350, "Goku mouth area"],
  [650, 200, "staff area"],
  [400, 250, "Goku hair"],
  [500, 700, "dragon head"],
  [100, 500, "dragon body left"],
  [600, 150, "cloud top-right"],
  [150, 250, "cloud left"],
  [500, 450, "Goku gi"],
  [270, 350, "wristband area"],
  [50, 100, "tail tip area"],
  [700, 850, "dragon head lower"],
  [350, 650, "whisker area"],
];

console.log(`\nPixel samples:`);
for (const [x, y, label] of samples) {
  if (x < W && y < H) {
    const [r, g, b, a] = px(x, y);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    console.log(`  (${x}, ${y}) ${label}: rgba(${r}, ${g}, ${b}, ${a}) lum=${lum.toFixed(1)}`);
  }
}
