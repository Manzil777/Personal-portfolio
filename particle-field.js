/**
 * Particle Animation Engine & Shape Library
 * Standalone 3D particle morphing, mouse repulsion physics, and procedural geometry.
 * Extracted and enhanced from devaryan.com.
 */

// Helper utility functions
const randomRange = (min, max) => min + Math.random() * (max - min);
const clamp = (val, min = 0, max = 1) => Math.min(max, Math.max(min, val));
const smoothstep = (t) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};
const flyTrajectory = (t) => -0.3 * t + 6 * t * t * t;

// 3D rotation helpers
const rotateZ = ([x, y, z], rad) => [
  x * Math.cos(rad) - y * Math.sin(rad),
  x * Math.sin(rad) + y * Math.cos(rad),
  z
];

const rotateX = ([x, y, z], rad) => [
  x,
  y * Math.cos(rad) - z * Math.sin(rad),
  y * Math.sin(rad) + z * Math.cos(rad)
];

const setVec3 = (target, x, y, z) => {
  target[0] = x;
  target[1] = y;
  target[2] = z;
};

const cyclicProgress = (t, period, offset = 0) => ((t / period + offset) % 1 + 1) % 1;

const arcInterpolate = (p1, p2, r, sag) => [
  p1[0] + (p2[0] - p1[0]) * r,
  p1[1] + (p2[1] - p1[1]) * r - sag * Math.sin(Math.PI * r),
  p1[2] + (p2[2] - p1[2]) * r
];

// Point sampling primitives
export function samplePointOnSegment(p1, p2, t, jitter = 0) {
  return [
    p1[0] + (p2[0] - p1[0]) * t + randomRange(-jitter, jitter),
    p1[1] + (p2[1] - p1[1]) * t + randomRange(-jitter, jitter),
    p1[2] + (p2[2] - p1[2]) * t + randomRange(-jitter, jitter)
  ];
}

export function sampleLine(addPoint, p1, p2, count, jitter = 0.012, isAccent = false) {
  for (let i = 0; i < count; i++) {
    const [x, y, z] = samplePointOnSegment(p1, p2, Math.random(), jitter);
    addPoint(x, y, z, isAccent);
  }
}

export function samplePolyline(addPoint, points, density, jitter = 0.012, isAccent = false, isClosed = false) {
  const numSegments = isClosed ? points.length : points.length - 1;
  for (let i = 0; i < numSegments; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
    const count = Math.max(1, Math.round(length * density));
    sampleLine(addPoint, p1, p2, count, jitter, isAccent);
  }
}

export function sampleArc(addPoint, center, radius, count, normalU, normalV, isAccent = false, jitter = 0.008) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    addPoint(
      center[0] + (normalU[0] * cosA + normalV[0] * sinA) * radius + randomRange(-jitter, jitter),
      center[1] + (normalU[1] * cosA + normalV[1] * sinA) * radius + randomRange(-jitter, jitter),
      center[2] + (normalU[2] * cosA + normalV[2] * sinA) * radius + randomRange(-jitter, jitter),
      isAccent
    );
  }
}

export function samplePolygonInterior(addPoint, polygon2D, count, zLevel, isAccent = false) {
  const isInside = (x, y) => {
    let inside = false;
    for (let i = 0, j = polygon2D.length - 1; i < polygon2D.length; j = i++) {
      const [xi, yi] = polygon2D[i];
      const [xj, yj] = polygon2D[j];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const xs = polygon2D.map((p) => p[0]);
  const ys = polygon2D.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  for (let generated = 0, attempts = 0; generated < count && attempts < 20 * count; attempts++) {
    const rx = randomRange(minX, maxX);
    const ry = randomRange(minY, maxY);
    if (isInside(rx, ry)) {
      addPoint(rx, ry, zLevel, isAccent);
      generated++;
    }
  }
}

// Shape constructor / builder
export function buildShape(totalCount, spinType, generatorFn, motionFn) {
  const positions = [];
  const accents = [];
  const motionParams = [];

  const addPoint = (x, y, z, isAccent = false, param = null) => {
    positions.push(x, y, z);
    accents.push(+!!isAccent);
    motionParams.push(param);
  };

  for (let pass = 0; accents.length < totalCount && pass < 400; pass++) {
    generatorFn(addPoint);
  }

  // Fill remainder with random ambient field if under quota
  while (accents.length < totalCount) {
    addPoint(randomRange(-0.6, 0.6), randomRange(-0.6, 0.6), randomRange(-0.6, 0.6));
  }

  const posArray = new Float32Array(3 * totalCount);
  const accentArray = new Uint8Array(totalCount);
  const motionIndices = [];
  const motionValues = [];
  const poolLen = accents.length;

  for (let i = 0; i < totalCount; i++) {
    const idx = Math.min(poolLen - 1, Math.floor((i / totalCount) * poolLen + (poolLen / totalCount) * Math.random()));
    posArray[3 * i] = positions[3 * idx];
    posArray[3 * i + 1] = positions[3 * idx + 1];
    posArray[3 * i + 2] = positions[3 * idx + 2];
    accentArray[i] = accents[idx];

    const p = motionParams[idx];
    if (motionFn && p) {
      motionIndices.push(i);
      motionValues.push(p);
    }
  }

  const shape = {
    pos: posArray,
    accent: accentArray,
    spin: spinType
  };

  if (motionFn && motionIndices.length > 0) {
    shape.motion = {
      ks: Uint32Array.from(motionIndices),
      params: motionValues,
      fn: motionFn
    };
  }

  return shape;
}

// Canvas 2D raster sampler for text or custom graphics
export function sampleRaster(totalCount, size, drawFn, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  drawFn(ctx);

  const imgData = ctx.getImageData(0, 0, size, size).data;
  const depth = options.depth ?? 0.08;

  return buildShape(totalCount, options.spin ?? false, (addPoint) => {
    for (let attempts = 0; attempts < 4000; attempts++) {
      const px = Math.floor(Math.random() * size);
      const py = Math.floor(Math.random() * size);
      const alpha = imgData[(py * size + px) * 4 + 3] / 255;
      if (alpha > Math.random()) {
        addPoint((px / size) * 2 - 1, (py / size) * 2 - 1, randomRange(-depth, depth));
      }
    }
  });
}

// Procedural text rasterizer (for user name or fallback)
export function sampleText(totalCount, text, fontFamily = "sans-serif") {
  return sampleRaster(totalCount, 400, (ctx) => {
    let fontSize = 120;
    ctx.font = `600 ${fontSize}px ${fontFamily}`;
    while (ctx.measureText(text).width > 360 && fontSize > 30) {
      fontSize -= 6;
      ctx.font = `600 ${fontSize}px ${fontFamily}`;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(text, 200, 200);
  });
}

// SVG path sampler for icons
export function sampleSvgPaths(totalCount, pathDescriptors) {
  return sampleRaster(totalCount, 240, (ctx) => {
    ctx.scale(10, 10);
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [tag, attr] of pathDescriptors) {
      if (tag === "path" && typeof attr.d === "string") {
        ctx.lineWidth = 1.6 * Number(attr.strokeWidth ?? 1.5);
        ctx.stroke(new Path2D(attr.d));
      }
    }
  });
}

// Vector shape generators
export const ShapeLibrary = {
  guitar(n) {
    const lower = { y: 0.45, r: 0.36 };
    const upper = { y: 0.05, r: 0.27 };
    const rot = (p) => rotateZ([0.85 * p[0], (p[1] - 0.15) * 0.85, p[2]], 0.6);
    const rotVec = rotateZ([1, 0, 0], 0.6);
    const soundHoleCenter = rot([0, 0.2, -0.07]);
    const soundHoleAngle = Math.atan2(-rotVec[1], -rotVec[0]);
    const isInsideBody = (x, y) =>
      Math.hypot(x, y - lower.y) < lower.r || Math.hypot(x, y - upper.y) < upper.r;

    return buildShape(
      n,
      "sway",
      (addPoint) => {
        const addRotPoint = (p, isAccent = false, param = null) => {
          const [rx, ry, rz] = rot(p);
          addPoint(rx, ry, rz, isAccent, param);
        };
        const rotPointDirect = (x, y, z, isAccent = false, param = null) =>
          addRotPoint([x, y, z], isAccent, param);

        for (let t = 0; t < 90; t++) {
          const pickLower = Math.random() < 0.6;
          const c1 = pickLower ? lower : upper;
          const c2 = pickLower ? upper : lower;
          const a = Math.random() * Math.PI * 2;
          const x = Math.cos(a) * c1.r;
          const y = c1.y + Math.sin(a) * c1.r;
          if (Math.hypot(x, y - c2.y) >= c2.r) {
            addRotPoint([x, y, -0.06]);
            addRotPoint([x, y, 0.06]);
            if (t % 3 === 0) addRotPoint([x, y, randomRange(-0.06, 0.06)]);
          }
        }

        for (let t = 0; t < 40; t++) {
          const x = randomRange(-0.36, 0.36);
          const y = randomRange(-0.22, 0.81);
          if (isInsideBody(x, y) && Math.hypot(x, y - 0.2) > 0.16) {
            addRotPoint([x, y, -0.06]);
          }
        }

        sampleArc(rotPointDirect, [0, 0.2, -0.065], 0.13, 16, [1, 0, 0], [0, 1, 0], false, 0.004);
        sampleArc(rotPointDirect, [0, 0.2, -0.065], 0.152, 16, [1, 0, 0], [0, 1, 0], false, 0.004);
        sampleArc(rotPointDirect, [0, 0.2, -0.07], 0.1, 26, [1, 0, 0], [0, 1, 0], true, 0.006);

        samplePolyline(
          rotPointDirect,
          [
            [0.09, 0.27, -0.065],
            [0.21, 0.31, -0.065],
            [0.25, 0.41, -0.065],
            [0.17, 0.48, -0.065],
            [0.08, 0.42, -0.065]
          ],
          60,
          0.004,
          false,
          true
        );

        samplePolyline(
          rotPointDirect,
          [
            [-0.12, 0.56, -0.07],
            [0.12, 0.56, -0.07],
            [0.12, 0.61, -0.07],
            [-0.12, 0.61, -0.07]
          ],
          70,
          0.004,
          false,
          true
        );

        for (let t = 0; t < 6; t++) addRotPoint([-0.05 + 0.02 * t, 0.585, -0.075]);

        for (const t of [-0.045, 0.045]) {
          sampleLine(rotPointDirect, [t, -0.21, -0.06], [t, -0.92, -0.06], 30, 0.005);
        }

        for (let t = 0; t < 10; t++) {
          sampleLine(
            rotPointDirect,
            [-0.045, -0.25 - 0.068 * t, -0.06],
            [0.045, -0.25 - 0.068 * t, -0.06],
            3,
            0.003
          );
        }

        for (const t of [2, 4, 6, 8]) {
          addRotPoint([0, -0.25 - (t + 0.5) * 0.068, -0.062]);
        }

        samplePolyline(
          rotPointDirect,
          [
            [-0.05, -0.92, -0.06],
            [-0.075, -1.14, -0.06],
            [0.075, -1.14, -0.06],
            [0.05, -0.92, -0.06]
          ],
          60,
          0.005,
          false,
          true
        );

        for (const t of [-1, 1]) {
          for (let e = 0; e < 3; e++) {
            const r = -0.97 - 0.06 * e;
            sampleLine(rotPointDirect, [0.07 * t, r, -0.06], [0.11 * t, r, -0.06], 2, 0.003);
            sampleArc(rotPointDirect, [0.125 * t, r, -0.06], 0.018, 4, [1, 0, 0], [0, 1, 0], false, 0.003);
          }
        }

        for (let t = 0; t < 6; t++) {
          for (let e = 0; e < 10; e++) {
            const frac = Math.random();
            addRotPoint(
              [-0.05 + 0.02 * t + (-0.035 + 0.014 * t - (-0.05 + 0.02 * t)) * frac, 0.585 - 1.505 * frac, -0.075],
              false,
              [0, frac, t]
            );
          }
        }

        for (let e = 0; e < 3; e++) {
          for (let r = 0; r < 16; r++) {
            addPoint(soundHoleCenter[0], soundHoleCenter[1], soundHoleCenter[2], true, [
              1,
              soundHoleAngle + randomRange(-0.6, 0.6),
              e / 3
            ]);
          }
        }
      },
      (param, x, y, z, time, target) => {
        if (param[0] === 0) {
          const n = 0.011 * Math.sin(Math.PI * param[1]) * Math.sin(38 * time + 1.7 * param[2]);
          setVec3(target, x + rotVec[0] * n, y + rotVec[1] * n, z);
        } else {
          const prog = cyclicProgress(time, 1.8, param[2]);
          const radius = 0.3 + 0.5 * prog;
          setVec3(
            target,
            soundHoleCenter[0] + Math.cos(param[1]) * radius,
            soundHoleCenter[1] + Math.sin(param[1]) * radius,
            soundHoleCenter[2] - 0.1 + prog * prog * 0.9
          );
        }
      }
    );
  },

  cricket(n) {
    const pStart = [0.95, -0.3, 1.5];
    const pBounce = [0.3, 0.59, 0.3];
    const pBat = [-0.3, 0.26, -0.14];
    const pBoundary = [-1.4, -1.3, 2.2];

    const ballTrajectory = (t) => {
      if (t < 0.45) return arcInterpolate(pStart, pBounce, t / 0.45, 0.12);
      if (t < 0.68) return arcInterpolate(pBounce, pBat, (t - 0.45) / 0.23, 0.12);
      return arcInterpolate(pBat, pBoundary, (t - 0.68) / 0.32, 0.3);
    };

    return buildShape(
      n,
      "sway",
      (addPoint) => {
        const addRotBatPoint = (x, y, z, isAccent = false) => {
          const [rx, ry, rz] = rotateZ([x, y, z], 0.45);
          addPoint(rx - 0.3, ry, rz, isAccent);
        };

        const batContour = [
          [-0.13, -0.05, 0],
          [0.13, -0.05, 0],
          [0.13, 0.66, 0],
          [0.09, 0.74, 0],
          [-0.09, 0.74, 0],
          [-0.13, 0.66, 0]
        ];

        for (const z of [-0.04, 0.04]) {
          samplePolyline(addRotBatPoint, batContour.map(([x, y]) => [x, y, z]), 60, 0.006, false, true);
        }

        for (let t = 0; t < 26; t++) {
          addRotBatPoint(randomRange(-0.12, 0.12), randomRange(-0.03, 0.72), -0.04);
        }

        sampleLine(addRotBatPoint, [0, 0, 0.06], [0, 0.62, 0.07], 12, 0.02);
        for (const x of [-0.035, 0.035]) {
          sampleLine(addRotBatPoint, [x, -0.05, 0], [x, -0.55, 0], 18, 0.005);
        }

        for (let t = 0; t < 8; t++) {
          sampleLine(
            addRotBatPoint,
            [-0.035, -0.1 - 0.055 * t, 0],
            [0.035, -0.07 - 0.055 * t, 0],
            3,
            0.004
          );
        }

        // Stumps
        for (const sx of [0.3, 0.42, 0.54]) {
          for (let r = 0; r < 26; r++) {
            const a = Math.random() * Math.PI * 2;
            addPoint(sx + 0.016 * Math.cos(a), randomRange(-0.3, 0.66), 0.45 + 0.016 * Math.sin(a));
          }
        }

        // Bails
        sampleLine(addPoint, [0.3, -0.32, 0.45], [0.42, -0.32, 0.45], 6, 0.008);
        sampleLine(addPoint, [0.42, -0.32, 0.45], [0.54, -0.32, 0.45], 6, 0.008);

        // Pitch crease lines
        sampleLine(addPoint, [-0.9, 0.66, 0.45], [0.95, 0.66, 0.45], 26, 0.004);
        sampleLine(addPoint, [-0.95, 0.66, -0.3], [0.9, 0.66, -0.3], 26, 0.004);
        for (const cx of [-0.75, 0.75]) {
          sampleLine(addPoint, [cx, 0.66, -0.6], [cx, 0.66, 0.45], 10, 0.004);
        }

        // Cricket ball particles
        const initBall = ballTrajectory(0);
        for (let e = 0; e < 60; e++) {
          const a = Math.random() * Math.PI * 2;
          const polar = Math.acos(randomRange(-1, 1));
          const offset = [
            Math.sin(polar) * Math.cos(a) * 0.07,
            0.07 * Math.cos(polar),
            Math.sin(polar) * Math.sin(a) * 0.07
          ];
          addPoint(initBall[0] + offset[0], initBall[1] + offset[1], initBall[2] + offset[2], true, [0, ...offset]);
        }

        // Wake / trailing particles
        for (let e = 0; e < 14; e++) {
          addPoint(initBall[0], initBall[1], initBall[2], true, [
            1,
            randomRange(0.01, 0.07),
            randomRange(-0.02, 0.02),
            randomRange(-0.02, 0.02)
          ]);
        }
      },
      (param, x, y, z, time, target) => {
        const prog = cyclicProgress(time, 2.6);
        if (param[0] === 0) {
          const ballPos = ballTrajectory(prog);
          const spin = 9 * time;
          const rotatedY = param[2] * Math.cos(spin) - param[3] * Math.sin(spin);
          const rotatedZ = param[2] * Math.sin(spin) + param[3] * Math.cos(spin);
          setVec3(target, ballPos[0] + param[1], ballPos[1] + rotatedY, ballPos[2] + rotatedZ);
        } else {
          const delayedPos = ballTrajectory(Math.max(0, prog - param[1]));
          setVec3(target, delayedPos[0] + param[2], delayedPos[1] + param[3], delayedPos[2] + 0.03);
        }
      }
    );
  },

  badminton(n) {
    const racketTransform = (p) => {
      const [rx, ry, rz] = rotateZ(p, -0.5);
      return [rx - 0.32, ry + 0.02, rz];
    };
    const racketCenter = racketTransform([0, -0.3, -0.08]);
    const pApex = [0.5, 0.05, 1.1];
    const flightCurve = (t) => {
      if (t < 0.55) {
        const e = t / 0.55;
        return arcInterpolate(racketCenter, pApex, 1 - (1 - e) * (1 - e), 0.95);
      }
      const e = (t - 0.55) / 0.45;
      return arcInterpolate(pApex, racketCenter, e * e, 0.4);
    };

    return buildShape(
      n,
      "sway",
      (addPoint) => {
        const addRotRacket = (x, y, z, isAccent = false) => {
          const [rx, ry, rz] = racketTransform([x, y, z]);
          addPoint(rx, ry, rz, isAccent);
        };

        sampleArc(addRotRacket, [0, -0.3, 0], 1, 100, [0.28, 0, 0], [0, 0.38, 0], false, 0.006);
        sampleArc(addRotRacket, [0, -0.3, 0], 1, 70, [0.28 + 0.03, 0, 0], [0, 0.38 + 0.03, 0], false, 0.006);

        for (let t = -5; t <= 5; t++) {
          const e = (t / 6) * 0.28;
          const a = 0.38 * Math.sqrt(Math.max(0, 1 - (e / 0.28) ** 2));
          sampleLine(addRotRacket, [e, -0.3 - a, 0], [e, -0.3 + a, 0], 7, 0.002);
          const o = (t / 6) * 0.38;
          const n = 0.28 * Math.sqrt(Math.max(0, 1 - (o / 0.38) ** 2));
          sampleLine(addRotRacket, [-n, -0.3 + o, 0], [n, -0.3 + o, 0], 6, 0.002);
        }

        samplePolyline(
          addRotRacket,
          [
            [-0.12, -0.3 + 0.33, 0],
            [0, -0.3 + 0.52, 0],
            [0.12, -0.3 + 0.33, 0]
          ],
          50,
          0.005
        );
        sampleLine(addRotRacket, [-0.1, 0.06, 0], [0.1, 0.06, 0], 6, 0.004);
        sampleLine(addRotRacket, [0, -0.3 + 0.52, 0], [0, 0.62, 0], 22, 0.005);
        for (const t of [-0.032, 0.032]) {
          sampleLine(addRotRacket, [t, 0.62, 0], [t, 0.95, 0], 10, 0.005);
        }

        for (let t = 0; t < 7; t++) {
          sampleLine(addRotRacket, [-0.032, 0.66 + 0.042 * t, 0], [0.032, 0.69 + 0.042 * t, 0], 3, 0.003);
        }
        sampleArc(addRotRacket, [0, 0.96, 0], 0.035, 8, [1, 0, 0], [0, 0, 1], false, 0.004);

        // Shuttlecock sampled relative to flightCurve(0)
        const initShuttle = flightCurve(0);
        const addShuttlePoint = (dx, dy, dz, isAccent = false) =>
          addPoint(initShuttle[0] + dx, initShuttle[1] + dy, initShuttle[2] + dz, isAccent, [dx, dy, dz]);

        // Cork tip dome
        for (let t = 0; t < 26; t++) {
          const a = Math.random() * Math.PI * 2;
          const e = Math.random() * Math.PI * 0.5;
          addShuttlePoint(
            Math.cos(a) * Math.sin(e) * 0.06,
            -0.06 * Math.cos(e),
            Math.sin(a) * Math.sin(e) * 0.06,
            true
          );
        }

        // Feather cone
        for (let t = 0; t < 16; t++) {
          const a = (t / 16) * Math.PI * 2;
          for (let k = 0; k < 4; k++) {
            const frac = Math.random();
            const r = 0.055 + 0.13 * frac;
            addShuttlePoint(Math.cos(a) * r, 0.02 + 0.3 * frac, Math.sin(a) * r);
          }
        }

        // Feather bands
        for (const [y, r, count] of [
          [0.16, 0.12, 12],
          [0.32, 0.185, 22]
        ]) {
          for (let a = 0; a < count; a++) {
            const angle = Math.random() * Math.PI * 2;
            addShuttlePoint(Math.cos(angle) * r, y, Math.sin(angle) * r);
          }
        }
      },
      (param, x, y, z, time, target) => {
        const prog = cyclicProgress(time, 2.4);
        const p1 = flightCurve(prog);
        const p2 = flightCurve(prog + 0.004);
        let tx = p1[0] - p2[0];
        let ty = p1[1] - p2[1];
        let tz = p1[2] - p2[2];
        const tLen = Math.hypot(tx, ty, tz) || 1;
        tx /= tLen;
        ty /= tLen;
        tz /= tLen;

        let nx = ty;
        let ny = -tx;
        const nLen = Math.hypot(nx, ny) || 1;
        nx /= nLen;
        ny /= nLen;

        const bx = -tz * ny;
        const by = tz * nx;
        const bz = tx * ny - ty * nx;

        setVec3(
          target,
          p1[0] + nx * param[0] + tx * param[1] + bx * param[2],
          p1[1] + ny * param[0] + ty * param[1] + by * param[2],
          p1[2] + tz * param[1] + bz * param[2]
        );
      }
    );
  },

  weekends(n) {
    const transform = (t) => {
      const [rx, ry, rz] = rotateX([t[0], t[1], 0], 0.2);
      return [rx - 0.25, ry + 0.3, rz - 0.2];
    };
    const lakePoint = [0.1, -0.7, 0.45];

    return buildShape(
      n,
      "sway",
      (addPoint) => {
        // Mountain background ridges
        samplePolyline(
          addPoint,
          [
            [-1, 0.05, 0.85],
            [-0.7, -0.35, 0.85],
            [-0.45, -0.15, 0.85],
            [-0.2, -0.45, 0.85],
            [0.35, -0.2, 0.85],
            [0.6, -0.5, 0.85],
            [1, -0.05, 0.85]
          ],
          40,
          0.01
        );

        samplePolyline(
          addPoint,
          [
            [-1, 0.35, 0.45],
            [-0.62, -0.25, 0.45],
            [-0.38, 0.05, 0.45],
            lakePoint,
            [0.55, 0, 0.45],
            [0.75, -0.2, 0.45],
            [1, 0.25, 0.45]
          ],
          55,
          0.01
        );

        samplePolyline(
          addPoint,
          [
            [-0.04, -0.5, 0.45],
            [0.05, -0.46, 0.45],
            [0.12, -0.53, 0.45],
            [0.21, -0.48, 0.45]
          ],
          50,
          0.005
        );

        samplePolyline(
          addPoint,
          [
            [-0.7, -0.14, 0.45],
            [-0.64, -0.1, 0.45],
            [-0.58, -0.17, 0.45]
          ],
          50,
          0.005
        );

        // Tree lines
        for (let e = 0; e < 5; e++) {
          sampleLine(
            addPoint,
            [0.2 + 0.06 * e, -0.55 + 0.1 * e, 0.45],
            [0.15 + 0.06 * e, -0.45 + 0.1 * e, 0.45],
            3,
            0.003
          );
        }

        // Trail
        const trail = [
          [-0.25, 0.3, 0.42],
          [-0.05, 0.12, 0.42],
          [-0.2, -0.05, 0.42],
          [0.02, -0.22, 0.42],
          [-0.08, -0.4, 0.42],
          [0.08, -0.6, 0.42]
        ];
        for (let e = 0; e < trail.length - 1; e++) {
          const p1 = trail[e];
          const p2 = trail[e + 1];
          const steps = Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.035);
          for (let s = 0; s < steps; s++) {
            addPoint(
              p1[0] + ((p2[0] - p1[0]) * s) / steps,
              p1[1] + ((p2[1] - p1[1]) * s) / steps,
              p1[2]
            );
          }
        }

        // Lake shoreline
        sampleLine(addPoint, lakePoint, [lakePoint[0], -0.95, 0.45], 10, 0.004);

        // Undulating lake waves
        for (let e = 0; e < 30; e++) {
          let u = Math.random();
          let v = Math.random();
          if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
          }
          addPoint(lakePoint[0] + 0.2 * u, -0.95 + 0.075 * u + 0.15 * v, 0.45, true, [0, u, v]);
        }

        // Clouds
        for (const [cloudY, offset] of [
          [-0.62, 0],
          [-0.3, 0.55]
        ]) {
          for (let a = 0; a < 22; a++) {
            const puff = Math.floor(3 * Math.random());
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * (puff === 1 ? 0.08 : 0.06);
            const puffX = (puff - 1) * 0.09 + Math.cos(angle) * radius;
            addPoint(
              puffX,
              cloudY + Math.sin(angle) * radius * 0.7 - (puff === 1 ? 0.03 : 0),
              0.65,
              false,
              [1, offset, puffX]
            );
          }
        }

        // Cabin / tent
        samplePolyline(
          addPoint,
          [
            [-0.45, -0.32, 0],
            [0.45, -0.32, 0],
            [0.45, 0.22, 0],
            [-0.45, 0.22, 0]
          ].map(transform),
          60,
          0.007,
          false,
          true
        );

        samplePolyline(
          addPoint,
          [
            [-0.41, -0.29, 0],
            [0.41, -0.29, 0],
            [0.41, 0.19, 0],
            [-0.41, 0.19, 0]
          ].map(transform),
          40,
          0.004,
          false,
          true
        );

        [0, 1, 1, 2, 1].forEach((rVal, idx) => {
          const o = -0.36 + 0.08 * rVal;
          const n = -0.22 + 0.075 * idx;
          sampleLine(addPoint, transform([o, n, 0]), transform([o + randomRange(0.15, 0.4), n, 0]), 6, 0.005);
        });

        // Trail path points & moving hiker / vehicle
        for (let r = 0; r < 14; r++) {
          const frac = Math.random();
          const pos = transform([-0.36 + 0.62 * frac, 0.155, 0]);
          addPoint(pos[0], pos[1], pos[2], false, [2, frac]);
        }

        for (let r = 0; r < 8; r++) {
          const jx = randomRange(0, 0.025);
          const jy = randomRange(-0.03, 0.03);
          const pos = transform([-0.36 + jx, 0.155 + jy, 0]);
          addPoint(pos[0], pos[1], pos[2], true, [3, jx, jy]);
        }

        // Boardwalk
        samplePolyline(
          addPoint,
          [
            [-0.5, 0.52, -0.2],
            [0.5, 0.52, -0.2],
            [0.58, 0.66, -0.45],
            [-0.58, 0.66, -0.45]
          ].map(([x, y, z]) => [x - 0.25, y, z]),
          60,
          0.007,
          false,
          true
        );

        for (let e = 0; e < 3; e++) {
          for (let r = 0; r < 9; r++) {
            const a = 0.15 + 0.22 * e;
            const o = -0.25 + (r / 8 - 0.5) * 0.8 * (1 + 0.16 * a);
            sampleLine(
              addPoint,
              [o - 0.03, 0.52 + 0.14 * a * 0.5, -0.2 - 0.25 * a * 0.5],
              [o + 0.03, 0.52 + 0.14 * a * 0.5, -0.2 - 0.25 * a * 0.5],
              2,
              0.003
            );
          }
        }

        samplePolyline(
          addPoint,
          [
            [-0.4, 0.625, -0.37],
            [-0.1, 0.625, -0.37],
            [-0.08, 0.65, -0.43],
            [-0.42, 0.65, -0.43]
          ],
          50,
          0.003,
          false,
          true
        );
      },
      (param, x, y, z, time, target) => {
        if (param[0] === 0) {
          const wave = 0.03 * Math.sin(5 * time - 6 * param[1]) * param[1];
          setVec3(target, x, y + wave, z + 0.6 * wave);
        } else if (param[0] === 1) {
          setVec3(target, -1.25 + 2.5 * cyclicProgress(time, 16, param[1]) + param[2], y, z);
        } else {
          const prog = Math.min(1, 1.4 * cyclicProgress(time, 3.4));
          const pathX =
            -0.36 +
            (param[0] === 2 ? Math.min(param[1], prog) : prog) * 0.62 +
            (param[0] === 3 ? param[1] : 0);
          const pathY = 0.155 + (param[0] === 3 ? param[2] : 0);
          const pos = transform([pathX, pathY, 0]);
          setVec3(target, pos[0], pos[1], pos[2]);
        }
      }
    );
  },

  goal(n) {
    const scale = (x, y, z) => [0.84 * x - 0.14, 0.84 * y, 0.84 * z];

    return buildShape(
      n,
      "sway",
      (addPoint) => {
        const addScaled = (x, y, z, isAccent = false, param = null) => {
          const [sx, sy, sz] = scale(x, y, z);
          addPoint(sx, sy, sz, isAccent, param);
        };

        // Static vault frame
        samplePolyline(
          addScaled,
          [
            [-0.82, -0.82, 0.08],
            [0.82, -0.82, 0.08],
            [0.82, 0.82, 0.08],
            [-0.82, 0.82, 0.08]
          ],
          60,
          0.006,
          false,
          true
        );

        samplePolyline(
          addScaled,
          [
            [-0.82 + 0.05, -0.82 + 0.05, 0.08],
            [0.82 - 0.05, -0.82 + 0.05, 0.08],
            [0.82 - 0.05, 0.82 - 0.05, 0.08],
            [-0.82 + 0.05, 0.82 - 0.05, 0.08]
          ],
          30,
          0.004,
          false,
          true
        );

        sampleArc(addScaled, [0, 0, 0.08], 0.62, 60, [1, 0, 0], [0, 1, 0], false, 0.005);
        sampleArc(addScaled, [0, 0, 0.3], 0.58 - 0.02, 30, [1, 0, 0], [0, 1, 0], false, 0.006);

        // Vault door points tagged with [0]
        const addDoorPoint = (x, y, z) => addScaled(x, y, z, false, [0]);
        for (const z of [-0.06, 0.06]) {
          sampleArc(addDoorPoint, [0, 0, z], 0.58, 60, [1, 0, 0], [0, 1, 0], false, 0.005);
        }

        for (let t = 0; t < 24; t++) {
          const a = Math.random() * Math.PI * 2;
          addDoorPoint(0.58 * Math.cos(a), 0.58 * Math.sin(a), randomRange(-0.06, 0.06));
        }

        sampleArc(addDoorPoint, [0, 0, -0.065], 0.46, 40, [1, 0, 0], [0, 1, 0], false, 0.004);
        for (const hingeY of [-0.3, 0.3]) {
          samplePolyline(
            addDoorPoint,
            [
              [0.66 - 0.08, hingeY - 0.06, -0.06],
              [0.68, hingeY - 0.06, -0.06],
              [0.68, hingeY + 0.06, -0.06],
              [0.66 - 0.08, hingeY + 0.06, -0.06]
            ],
            80,
            0.004,
            false,
            true
          );
        }

        // Combination dial points tagged with [1, angle, radius]
        for (let t = 0; t < 18; t++) {
          const a = Math.random() * Math.PI * 2;
          addScaled(0.07 * Math.cos(a), 0.07 * Math.sin(a), -0.11, false, [1, a, 0.07]);
        }

        for (let t = 0; t < 5; t++) {
          const spokeAngle = (t / 5) * Math.PI * 2;
          for (let s = 0; s < 10; s++) {
            const r = randomRange(0.07, 0.3);
            addScaled(Math.cos(spokeAngle) * r, Math.sin(spokeAngle) * r, -0.11, false, [
              1,
              spokeAngle + randomRange(-0.03, 0.03),
              r
            ]);
          }
          for (let s = 0; s < 6; s++) {
            const handleA = Math.random() * Math.PI * 2;
            addScaled(
              0.31 * Math.cos(spokeAngle) + 0.025 * Math.cos(handleA),
              0.31 * Math.sin(spokeAngle) + 0.025 * Math.sin(handleA),
              -0.11,
              false,
              [1, spokeAngle + (0.025 * Math.cos(handleA)) / 0.31, 0.31 + 0.025 * Math.sin(handleA)]
            );
          }
        }

        // Locking bolts tagged with [2, angle, radius, jitter]
        for (let t = 0; t < 8; t++) {
          const boltAngle = ((t + 0.5) / 8) * Math.PI * 2;
          for (let s = 0; s < 12; s++) {
            const boltR = randomRange(0, 0.14);
            const boltJitter = randomRange(-0.025, 0.025);
            addScaled(
              Math.cos(boltAngle) * (0.58 - 0.02 + boltR) - Math.sin(boltAngle) * boltJitter,
              Math.sin(boltAngle) * (0.58 - 0.02 + boltR) + Math.cos(boltAngle) * boltJitter,
              0,
              false,
              [2, boltAngle, boltR, boltJitter]
            );
          }
        }

        // Interior gold shimmer bullion tagged with [3, angle, radiusFrac, phase]
        for (let t = 0; t < 70; t++) {
          addScaled(0, 3, 0.25, true, [
            3,
            Math.random() * Math.PI * 2,
            Math.sqrt(Math.random()),
            Math.random()
          ]);
        }
      },
      (param, x, y, z, time, target) => {
        const cycle = cyclicProgress(time, 7);
        const openFactor = smoothstep((cycle - 0.3) / 0.2) * (1 - smoothstep((cycle - 0.68) / 0.18));
        let pos;

        if (param[0] === 0) {
          pos = [(x - -0.14) / 0.84, y / 0.84, z / 0.84];
        } else if (param[0] === 1) {
          const turn =
            param[1] +
            (smoothstep(cycle / 0.2) * Math.PI * 1.5 - smoothstep((cycle - 0.88) / 0.1) * Math.PI * 1.5);
          pos = [Math.cos(turn) * param[2], Math.sin(turn) * param[2], -0.11];
        } else if (param[0] === 2) {
          const retract =
            0.58 - 0.02 + param[2] - 0.13 * (smoothstep((cycle - 0.2) / 0.1) * (1 - smoothstep((cycle - 0.86) / 0.06)));
          pos = [
            Math.cos(param[1]) * retract - Math.sin(param[1]) * param[3],
            Math.sin(param[1]) * retract + Math.cos(param[1]) * param[3],
            0
          ];
        } else {
          if (openFactor < 0.05) {
            setVec3(target, x, y, z);
            return;
          }
          const shimmer =
            0.52 *
            param[2] *
            openFactor *
            (0.85 + 0.15 * Math.sin(3 * time + 9 * param[3]));
          const [gx, gy, gz] = scale(
            Math.cos(param[1]) * shimmer,
            Math.sin(param[1]) * shimmer,
            0.25 - 0.15 * param[2]
          );
          setVec3(target, gx, gy, gz);
          return;
        }

        const hingeX = 0.66;
        const relX = pos[0] - hingeX;
        const doorAngle = 1.3 * openFactor;
        const rotatedX = hingeX + relX * Math.cos(doorAngle) - pos[2] * Math.sin(doorAngle);
        const rotatedY = pos[1];
        const rotatedZ = relX * Math.sin(doorAngle) + pos[2] * Math.cos(doorAngle);
        const [fx, fy, fz] = scale(rotatedX, rotatedY, rotatedZ);
        setVec3(target, fx, fy, fz);
      }
    );
  },

  bonfire(n) {
    return buildShape(
      n,
      "sway",
      (addPoint) => {
        // Fire pit ground ring embers
        for (let e = 0; e < 70; e++) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.5 * Math.sqrt(Math.random());
          addPoint(Math.cos(a) * r, 0.55 - 0.14 * (1 - (r / 0.5) ** 2), Math.sin(a) * r * 0.8);
        }

        // Stone embers
        for (let e = 0; e < 10; e++) {
          const a = (e / 10) * Math.PI * 2 + randomRange(-0.1, 0.1);
          sampleArc(
            addPoint,
            [0.56 * Math.cos(a), 0.53, 0.45 * Math.sin(a)],
            0.045,
            7,
            [1, 0, 0],
            [0, 0.6, 0],
            false,
            0.008
          );
        }

        // Radial campfire logs
        for (const [angle, length] of [
          [0.4, 0.62],
          [2.0, 0.55],
          [3.3, 0.6],
          [4.9, 0.5]
        ]) {
          const lx = Math.cos(angle) * length * 0.5;
          const lz = Math.sin(angle) * length * 0.4;
          for (const off of [-0.025, 0.025]) {
            sampleLine(addPoint, [-lx, 0.55 - 0.06 + off, -lz], [lx, 0.55 - 0.1 + off, lz], 12, 0.008);
          }
        }

        // Coiled sword
        const addRotSword = (x, y, z, isAccent = false) => {
          const [rx, ry, rz] = rotateZ([x, y, z], 0.08);
          addPoint(rx, ry, rz, isAccent);
        };
        const groundY = 0.55 - 0.08;

        for (const side of [-1, 1]) {
          sampleLine(addRotSword, [0.03 * side, groundY, 0], [0.05 * side, -0.36, 0], 26, 0.004);
        }
        sampleLine(addRotSword, [0, groundY, -0.01], [0, -0.36, -0.01], 14, 0.003);

        // Twisted spiral blade
        for (let t = 0; t < 70; t++) {
          const y = randomRange(groundY, -0.05);
          const spiralAngle = 38 * y;
          addRotSword(0.065 * Math.cos(spiralAngle), y, 0.065 * Math.sin(spiralAngle));
        }

        // Crossguard
        samplePolyline(
          addRotSword,
          [
            [-0.17, -0.36 + 0.02, 0],
            [-0.19, -0.38, 0],
            [0.19, -0.38, 0],
            [0.17, -0.36 + 0.02, 0]
          ],
          70,
          0.005,
          false,
          true
        );

        // Hilt
        for (const hx of [-0.025, 0.025]) {
          sampleLine(addRotSword, [hx, -0.39, 0], [hx, -0.6, 0], 10, 0.004);
        }
        for (let t = 0; t < 6; t++) {
          sampleLine(addRotSword, [-0.025, -0.41 - 0.04 * t, 0], [0.025, -0.39 - 0.04 * t, 0], 2, 0.003);
        }

        // Pommel
        sampleArc(addRotSword, [0, -0.64, 0], 0.035, 12, [1, 0, 0], [0, 1, 0], false, 0.004);

        // Flame particles
        for (let e = 0; e < 70; e++) {
          const a = Math.random() * Math.PI * 2;
          const r = 0.2 * Math.sqrt(Math.random());
          const rx = Math.cos(a) * r;
          const rz = Math.sin(a) * r * 0.8;
          addPoint(rx, 0.55 - 0.1, Math.sin(a) * r, true, [0, rx, rz, Math.random(), randomRange(0.35, 0.65)]);
        }

        // Smoke spark particles
        for (let e = 0; e < 10; e++) {
          addPoint(0, 0.55 - 0.2, 0, true, [1, randomRange(-0.18, 0.18), randomRange(-0.15, 0.15), Math.random()]);
        }
      },
      (param, x, y, z, time, target) => {
        if (param[0] === 0) {
          const prog = cyclicProgress(time, 0.8 + param[4], param[3]);
          const r = Math.pow(1 - prog, 0.8);
          setVec3(
            target,
            param[1] * r + 0.035 * Math.sin(6 * time + 20 * param[3]) * prog,
            0.55 - 0.1 - prog * param[4],
            param[2] * r + 0.03 * Math.cos(5 * time + 17 * param[3]) * prog + 0.5 * prog
          );
        } else {
          const prog = cyclicProgress(time, 3.2, param[3]);
          setVec3(
            target,
            param[1] + 0.12 * Math.sin(1.5 * time + 9 * param[3]) * prog + 0.15 * prog,
            0.55 - 0.2 - 1.15 * prog,
            param[2] + 0.6 * prog
          );
        }
      }
    );
  },

  zuno(n) {
    return buildShape(n, "sway", (addPoint) => {
      // Browser window frame
      samplePolyline(
        addPoint,
        [
          [-0.9, -0.62, 0],
          [0.9, -0.62, 0],
          [0.9, 0.62, 0],
          [-0.9, 0.62, 0]
        ],
        70,
        0.01,
        false,
        true
      );

      // Window tabs
      for (let t = 0; t < 3; t++) {
        const tx = -0.9 + 0.06 + 0.34 * t;
        const h = t === 0 ? 0.13 : 0.1;
        samplePolyline(
          addPoint,
          [
            [tx, -0.62, 0],
            [tx, -0.62 - h, 0],
            [tx + 0.3, -0.62 - h, 0],
            [tx + 0.3, -0.62, 0]
          ],
          60,
          0.008
        );
      }

      // URL bar
      samplePolyline(
        addPoint,
        [
          [-0.45, -0.5, 0],
          [0.65, -0.5, 0],
          [0.65, -0.4, 0],
          [-0.45, -0.4, 0]
        ],
        50,
        0.008,
        false,
        true
      );

      // Window control dots (close, min, max)
      for (let d = 0; d < 3; d++) {
        sampleArc(addPoint, [-0.8 + 0.08 * d, -0.45, 0], 0.025, 12, [1, 0, 0], [0, 1, 0], d === 0, 0.004);
      }

      // Web content layout lines
      for (let l = 0; l < 6; l++) {
        const ly = -0.25 + 0.12 * l;
        sampleLine(addPoint, [-0.75, ly, 0], [0.45 - 0.15 * (l % 3), ly, 0], 25, 0.006);
      }
    });
  },

  resume(n) {
    const docOutline = [
      [[-0.62, -0.85, 0], [0.42, -0.85, 0]],
      [[0.42, -0.85, 0], [0.62, -0.65, 0]],
      [[0.62, -0.65, 0], [0.62, 0.85, 0]],
      [[0.62, 0.85, 0], [-0.62, 0.85, 0]],
      [[-0.62, 0.85, 0], [-0.62, -0.85, 0]],
      [[0.42, -0.85, 0], [0.42, -0.65, 0]],
      [[0.42, -0.65, 0], [0.62, -0.65, 0]]
    ];

    return buildShape(n, false, (addPoint) => {
      for (const [p1, p2] of docOutline) {
        sampleLine(addPoint, p1, p2, 28, 0.012);
      }
      // Content lines
      for (let l = 0; l < 9; l++) {
        const y = -0.4 + 0.12 * l;
        const w = l === 0 ? 0.45 : l % 3 === 0 ? 0.75 : 0.95;
        sampleLine(addPoint, [-0.48, y, 0], [-0.48 + w, y, 0], 22, 0.008, l === 0);
      }
    });
  },

  github(n) {
    return sampleSvgPaths(n, [
      ["path", { d: "M10 20.5675C6.57143 21.7248 3.71429 20.5675 2 17", strokeWidth: "1.5" }],
      ["path", { d: "M10 22V18.7579C10 18.1596 10.1839 17.6396 10.4804 17.1699C10.6838 16.8476 10.5445 16.3904 10.1771 16.2894C7.13394 15.4528 5 14.1077 5 9.64606C5 8.48611 5.38005 7.39556 6.04811 6.4464C6.21437 6.21018 6.29749 6.09208 6.31748 5.9851C6.33746 5.87813 6.30272 5.73852 6.23322 5.45932C5.95038 4.32292 5.96871 3.11619 6.39322 2.02823C6.39322 2.02823 7.27042 1.74242 9.26698 2.98969C9.72282 3.27447 9.95075 3.41686 10.1515 3.44871C10.3522 3.48056 10.6206 3.41384 11.1573 3.28041C11.8913 3.09795 12.6476 3 13.5 3C14.3524 3 15.1087 3.09795 15.8427 3.28041C16.3794 3.41384 16.6478 3.48056 16.8485 3.44871C17.0492 3.41686 17.2772 3.27447 17.733 2.98969C19.7296 1.74242 20.6068 2.02823 20.6068 2.02823C21.0313 3.11619 21.0496 4.32292 20.7668 5.45932C20.6973 5.73852 20.6625 5.87813 20.6825 5.9851C20.7025 6.09208 20.7856 6.21018 20.9519 6.4464C21.62 7.39556 22 8.48611 22 9.64606C22 14.1203 19.8519 15.4604 16.7918 16.2917C16.4262 16.391 16.2878 16.8454 16.4897 17.1672C16.7997 17.6611 17 18.2046 17 18.8415V22", strokeWidth: "1.5" }]
    ]);
  },

  linkedin(n) {
    return sampleSvgPaths(n, [
      ["path", { d: "M7 10V17", strokeWidth: "1.5" }],
      ["path", { d: "M11 13V17M11 13C11 11.3431 12.3431 10 14 10C15.6569 10 17 11.3431 17 13V17M11 13V10", strokeWidth: "1.5" }],
      ["path", { d: "M7.00801 7L6.99902 7", strokeWidth: "2" }],
      ["path", { d: "M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z", strokeWidth: "1.5" }]
    ]);
  },

  x(n) {
    return sampleSvgPaths(n, [
      ["path", { d: "M3 21L10.5484 13.4516M21 3L13.4516 10.5484M13.4516 10.5484L8 3H3L10.5484 13.4516M13.4516 10.5484L21 21H16L10.5484 13.4516", strokeWidth: "1.5" }]
    ]);
  },

  "the-foots-nepal"(n) {
    return buildShape(n, "sway", (addPoint) => {
      const addShoePoint = (x, y, z, isAccent = false, param = 1) => {
        addPoint(x, y, z, isAccent, param);
      };

      // 1. Sole & Midsole Assembly
      for (const zSide of [-0.12, 0.12]) {
        // Outsole bottom contour
        const outsole = [
          [-0.48, 0.18, zSide],
          [-0.44, 0.24, zSide],
          [-0.36, 0.28, zSide],
          [-0.18, 0.28, zSide],
          [-0.06, 0.24, zSide],
          [0.10, 0.28, zSide],
          [0.32, 0.28, zSide],
          [0.44, 0.22, zSide],
          [0.48, 0.15, zSide]
        ];
        samplePolyline(addShoePoint, outsole, 45, 0.006, false);

        // Midsole top contour (cushion line)
        const midsoleTop = [
          [-0.48, 0.12, zSide],
          [-0.42, 0.16, zSide],
          [-0.18, 0.18, zSide],
          [-0.06, 0.15, zSide],
          [0.12, 0.18, zSide],
          [0.32, 0.18, zSide],
          [0.44, 0.14, zSide],
          [0.48, 0.11, zSide]
        ];
        samplePolyline(addShoePoint, midsoleTop, 40, 0.006, false);

        // Heel and toe vertical caps
        sampleLine(addShoePoint, [-0.48, 0.18, zSide], [-0.48, 0.12, zSide], 5, 0.005);
        sampleLine(addShoePoint, [0.48, 0.15, zSide], [0.48, 0.11, zSide], 5, 0.005);
      }

      // Outsole transverse tread ribs
      const treadXs = [-0.42, -0.36, -0.30, -0.24, 0.12, 0.18, 0.24, 0.30, 0.36];
      for (const tx of treadXs) {
        let ty = 0.28;
        if (tx < -0.36) ty = 0.24 + (tx + 0.42) * (0.04 / 0.06);
        else if (tx < 0.10) ty = 0.24 + 0.04 * Math.sin(10 * (tx + 0.06));
        else if (tx > 0.32) ty = 0.28 - 0.7 * (tx - 0.32);
        sampleLine(addShoePoint, [tx, ty, -0.12], [tx, ty, 0.12], 12, 0.005);
      }

      // 2. Upper Sneaker Silhouette
      for (const zSide of [-0.11, 0.11]) {
        const heelCounter = [
          [-0.48, 0.12, zSide],
          [-0.47, 0.02, zSide],
          [-0.44, -0.10, zSide],
          [-0.38, -0.22, zSide]
        ];
        samplePolyline(addShoePoint, heelCounter, 35, 0.006, false);

        const collarRim = [
          [-0.38, -0.22, zSide],
          [-0.26, -0.18, zSide],
          [-0.14, -0.22, zSide]
        ];
        samplePolyline(addShoePoint, collarRim, 30, 0.006, false);

        const eyestay = [
          [-0.14, -0.22, zSide * 0.8],
          [-0.06, -0.15, zSide * 0.8],
          [0.04, -0.08, zSide * 0.8],
          [0.15, -0.01, zSide * 0.8]
        ];
        samplePolyline(addShoePoint, eyestay, 35, 0.006, false);

        const toeBox = [
          [0.15, -0.01, zSide * 0.8],
          [0.28, 0.04, zSide],
          [0.42, 0.08, zSide],
          [0.48, 0.11, zSide]
        ];
        samplePolyline(addShoePoint, toeBox, 40, 0.006, false);
      }

      // Collar rim rear connector
      sampleLine(addShoePoint, [-0.38, -0.22, -0.11], [-0.38, -0.22, 0.11], 12, 0.006);

      // Tongue contour and padding
      const tonguePts = [
        [-0.14, -0.25, 0.0],
        [-0.05, -0.21, 0.0],
        [0.05, -0.14, 0.0],
        [0.15, -0.04, 0.0]
      ];
      samplePolyline(addShoePoint, tonguePts, 35, 0.008, false);
      for (const tz of [-0.04, 0.04]) {
        sampleLine(addShoePoint, [-0.14, -0.25, tz], [0.15, -0.04, tz], 25, 0.006, false);
      }

      // Perforated toe box surface
      for (let i = 0; i < 45; i++) {
        const tx = randomRange(0.20, 0.46);
        const wz = 0.10 * (1.0 - 0.6 * ((tx - 0.20) / 0.26));
        const tz = randomRange(-wz, wz);
        const ty = 0.05 + 0.06 * ((tx - 0.20) / 0.26) + 0.02 * (tz / wz) ** 2;
        addShoePoint(tx, ty, tz, false, 1);
      }

      // 3. Life-Section Matching Accents (isAccent = true)
      // 3A. Dynamic Athletic Side Wave / Stripe
      for (const zSide of [-0.115, 0.115]) {
        const wave1 = [
          [-0.38, 0.02, zSide],
          [-0.26, 0.08, zSide],
          [-0.10, 0.10, zSide],
          [0.08, 0.06, zSide],
          [0.20, 0.01, zSide]
        ];
        samplePolyline(addShoePoint, wave1, 50, 0.005, true);

        const wave2 = [
          [-0.34, -0.01, zSide],
          [-0.22, 0.05, zSide],
          [-0.08, 0.07, zSide],
          [0.06, 0.04, zSide],
          [0.18, 0.00, zSide]
        ];
        samplePolyline(addShoePoint, wave2, 45, 0.005, true);
      }

      // 3B. Lacing System: 4 eyelet pairs with criss-cross laces
      const eyeletsL = [
        [-0.12, -0.20, -0.08],
        [-0.04, -0.14, -0.08],
        [0.04, -0.08, -0.07],
        [0.12, -0.02, -0.07]
      ];
      const eyeletsR = [
        [-0.12, -0.20, 0.08],
        [-0.04, -0.14, 0.08],
        [0.04, -0.08, 0.07],
        [0.12, -0.02, 0.07]
      ];

      for (let k = 0; k < 4; k++) {
        addShoePoint(eyeletsL[k][0], eyeletsL[k][1], eyeletsL[k][2], true, 1);
        addShoePoint(eyeletsR[k][0], eyeletsR[k][1], eyeletsR[k][2], true, 1);
        sampleLine(addShoePoint, eyeletsL[k], eyeletsR[k], 10, 0.004, true);
        if (k < 3) {
          sampleLine(addShoePoint, eyeletsL[k], eyeletsR[k + 1], 12, 0.004, true);
          sampleLine(addShoePoint, eyeletsR[k], eyeletsL[k + 1], 12, 0.004, true);
        }
      }

      // 3C. Heel Pull-Tab Reflector Loop
      const pullTab = [
        [-0.38, -0.18, 0.0],
        [-0.43, -0.23, 0.0],
        [-0.44, -0.28, 0.0],
        [-0.40, -0.30, 0.0],
        [-0.37, -0.25, 0.0]
      ];
      samplePolyline(addShoePoint, pullTab, 35, 0.005, true);

      // 3D. Touchdown Dust / Impact Sparks
      for (let i = 0; i < 25; i++) {
        const dx = randomRange(-0.06, 0.06);
        const dy = randomRange(-0.02, 0.03);
        const dz = randomRange(-0.14, 0.14);
        addShoePoint(-0.42 + dx, 0.28 + dy, dz, true, [1, dx, dy, dz]);
      }
    }, (param, bx, by, bz, time, target) => {
      const u = cyclicProgress(time, 1.4);

      if (Array.isArray(param) && param[0] === 1) {
        if (u < 0.20) {
          const prog = u / 0.20;
          setVec3(
            target,
            (bx + 0.22) - 0.14 * prog + param[1] * (1.0 + 2.0 * prog),
            by - 0.05 * Math.sin(prog * Math.PI) + param[2] * prog,
            bz * (1.0 + 1.8 * prog)
          );
          return;
        }
        setVec3(target, bx, by + 3.0, bz);
        return;
      }

      let dx = 0;
      let dy = 0;
      let pitch = 0;
      let pivotX = 0;
      let pivotY = 0;

      if (u < 0.5) {
        const s = u / 0.5;
        dx = 0.22 - 0.44 * s;
        if (s < 0.25) {
          const pr = s / 0.25;
          pitch = 0.28 * (1.0 - pr);
          pivotX = -0.38;
          pivotY = 0.28;
        } else if (s < 0.70) {
          pitch = 0;
          pivotY = 0.28;
        } else {
          const pr = (s - 0.70) / 0.30;
          pitch = -0.32 * pr;
          pivotX = 0.25;
          pivotY = 0.28;
          dy = -0.04 * pr;
          if (bx > 0.20) {
            pitch *= 1.0 - 0.55 * ((bx - 0.20) / 0.28);
          }
        }
      } else {
        const s = (u - 0.5) / 0.5;
        const ease = 0.5 - 0.5 * Math.cos(Math.PI * s);
        dx = -0.22 + 0.44 * ease;
        dy = -0.19 * Math.sin(Math.PI * s);
        pitch = -0.32 + 0.60 * ease;
      }

      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const rx = bx - pivotX;
      const ry = by - pivotY;

      setVec3(
        target,
        pivotX + rx * cp - ry * sp + dx,
        pivotY + rx * sp + ry * cp + dy,
        bz
      );
    });
  },

  thefootsnepal(n) {
    return this["the-foots-nepal"](n);
  },

  shoe(n) {
    return this["the-foots-nepal"](n);
  },

  slidegen(n) {
    const e = (t, e, r) => (t > 0.9 ? 0 : Math.min(1, Math.max(0, (t - e) / r)));
    return buildShape(n, "sway", (addPoint) => {
      samplePolyline(
        addPoint,
        [
          [-0.62, -0.65, 0],
          [0.62, -0.65, 0],
          [0.62, 0.05, 0],
          [-0.62, 0.05, 0]
        ],
        60,
        0.008,
        false,
        true
      );
      const addLine = (minX, maxX, y, count, jitter, paramT) => {
        for (let l = 0; l < count; l++) {
          addPoint(randomRange(minX, maxX), y + randomRange(-jitter, jitter), 0, false, [0, paramT, minX]);
        }
      };
      addLine(-0.5, 0, -0.52, 14, 0.014, 0.5);
      for (let t = 0; t < 3; t++) {
        addLine(-0.5, -0.1 - randomRange(0, 0.12), -0.36 + 0.1 * t, 6, 0.006, 0.56 + 0.04 * t);
      }
      const barBaseY = -0.05;
      [0.12, 0.22, 0.32].forEach((h, a) => {
        const x = 0.12 + 0.14 * a;
        for (let k = 0; k < 10; k++) {
          addPoint(x + randomRange(-0.04, 0.04), barBaseY - randomRange(0, h), 0, false, [1, 0.66 + 0.05 * a, barBaseY]);
        }
      });
      samplePolyline(
        addPoint,
        [
          [-0.62, 0.55, 0],
          [0.62, 0.55, 0],
          [0.62, 0.75, 0],
          [-0.62, 0.75, 0]
        ],
        60,
        0.006,
        false,
        true
      );
      for (let k = 0; k < 16; k++) {
        const rnd = Math.random();
        addPoint(-0.54 + 0.74 * rnd, 0.65 + randomRange(-0.01, 0.01), 0, false, [2, rnd]);
      }
      sampleLine((x, y, z, acc) => addPoint(x, y, z, acc, [3]), [0.26, 0.59, 0], [0.26, 0.71, 0], 6, 0.006, true);
      [
        [[0, 0.3, -0.1], 0.12, 24],
        [[0.22, 0.38, -0.05], 0.06, 8],
        [[-0.2, 0.4, -0.05], 0.05, 6]
      ].forEach(([center, radius, count], idx) => {
        const param = [4, center[0], center[1], center[2], 1.9 * idx];
        const pts = [];
        for (let t = 0; t < 8; t++) {
          const a = (t * Math.PI) / 4 - Math.PI / 2;
          const r = t % 2 ? 0.28 * radius : radius;
          pts.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r]);
        }
        samplePolyline((x, y, z, acc) => addPoint(x, y, z, acc, param), pts.map(([x, y]) => [x, y, center[2]]), 80, 0.006, true, true);
        samplePolygonInterior((x, y, z, acc) => addPoint(x, y, z, acc, param), pts, count, center[2], true);
      });
    }, (param, x, y, z, time, target) => {
      const l = cyclicProgress(time, 5.5);
      const i = e(l, 0.02, 0.28);
      switch (param[0]) {
        case 0:
          setVec3(target, param[2] + (x - param[2]) * e(l, param[1], 0.06), y, z);
          return;
        case 1:
          setVec3(target, x, param[2] + (y - param[2]) * e(l, param[1], 0.1), z);
          return;
        case 2:
          setVec3(target, -0.54 + 0.74 * Math.min(param[1], i), y, z);
          return;
        case 3:
          setVec3(target, -0.54 + 0.74 * i + 0.04, y, z);
          return;
        default: {
          const interp = e(l, 0.3, 0.15);
          const s = interp * (0.35 + 0.65 * Math.abs(Math.sin(2.6 * time + param[4])));
          const f = param[2] + (1 - interp) * 0.3;
          setVec3(target, param[1] + (x - param[1]) * s, f + (y - param[2]) * s, param[3] + (z - param[3]) * s);
        }
      }
    });
  },

  "sentiment-analysis"(n) {
    return this.slidegen(n);
  },

  sentimentanalysis(n) {
    return this.slidegen(n);
  },

  duaarr(n) {
    const tiers = [
      [0.18, 0.40, [[0, 0.45, false], [0.47, 0.70, false], [0.72, 0.88, false], [0.90, 0.98, false]]],
      [0.42, 0.62, [[0, 0.28, false], [0.30, 0.43, false], [0.47, 0.60, false], [0.62, 0.68, false], [0.72, 0.84, false]]],
      [0.64, 0.80, [[0, 0.15, true], [0.17, 0.25, false], [0.30, 0.36, false], [0.47, 0.55, false], [0.74, 0.80, false]]]
    ];
    const project3D = (angle, radius, z) => {
      const cosA = Math.cos(angle) * radius;
      const sinA = Math.sin(angle) * radius;
      return [
        cosA,
        0.7316888688738209 * sinA - (-0.6816387600233341) * z,
        -0.6816387600233341 * sinA + 0.7316888688738209 * z
      ];
    };
    return buildShape(n, "sway", (addPoint) => {
      const emit = (angle, radius, z, isAccent) => {
        const [px, py, pz] = project3D(angle, radius, z);
        addPoint(px, py, pz, isAccent, [angle, radius, z, isAccent ? 1 : 0]);
      };
      tiers.forEach(([rInner, rOuter, sectors], tierIdx) => {
        sectors.forEach(([startAngleFrac, endAngleFrac, isAccent]) => {
          const zDepth = 0.05 + 0.035 * (3 - tierIdx) + 0.12 * (isAccent ? 1 : 0);
          const angleStart = startAngleFrac * Math.PI * 2 + 0.03;
          const angleEnd = endAngleFrac * Math.PI * 2 - 0.03;
          const count = Math.round((angleEnd - angleStart) * (rOuter + rInner) * 40);
          for (let k = 0; k < count; k++) {
            const randAngle = randomRange(angleStart, angleEnd);
            emit(randAngle, rInner, -zDepth, isAccent);
            emit(randAngle, rOuter, -zDepth, isAccent);
            emit(randAngle, randomRange(rInner, rOuter), -zDepth, isAccent);
            emit(randAngle, rOuter, randomRange(-zDepth, 0), isAccent);
          }
          for (const boundaryAngle of [angleStart, angleEnd]) {
            for (let k = 0; k < 6; k++) {
              emit(boundaryAngle, randomRange(rInner, rOuter), -zDepth, isAccent);
            }
          }
        });
      });
      for (let k = 0; k < 16; k++) {
        emit(Math.random() * Math.PI * 2, 0.12, -0.04, false);
      }
    }, (param, x, y, z, time, target) => {
      const l = param[3] ? param[2] * (1 + 0.35 * Math.sin(1.6 * time)) : param[2];
      const [i, s, f] = project3D(param[0] + 0.35 * time, param[1], l);
      setVec3(target, i, s, f);
    });
  },

  soletrack(n) {
    return this.duaarr(n);
  },

  proteinclassify(n) {
    const rDna = 0.22;
    const pitch = 0.62;
    const omega = (2 * Math.PI) / pitch;
    return buildShape(n, false, (addPoint) => {
      // 1. DNA Double Helix strands (primary ink, 3D helical coordinates)
      for (let e = 0; e < 110; e++) {
        const u = randomRange(-0.9, 0.9);
        const phi = omega * u;
        const sy = rDna * Math.sin(phi);
        const sz = rDna * Math.cos(phi);
        addPoint(u + randomRange(-0.008, 0.008), -0.08 + sy + randomRange(-0.008, 0.008), sz + randomRange(-0.008, 0.008), false, [0, u, sy, sz]);
        addPoint(u + randomRange(-0.008, 0.008), -0.08 - sy + randomRange(-0.008, 0.008), -sz + randomRange(-0.008, 0.008), false, [0, u, -sy, -sz]);
      }
      // 2. DNA Base pairs / rungs connecting the two strands
      for (let k = 0; k < 26; k++) {
        const u_k = -0.85 + k * (1.70 / 25);
        const phi = omega * u_k;
        const sy = rDna * Math.sin(phi);
        const sz = rDna * Math.cos(phi);
        for (let s = 0; s < 7; s++) {
          const v = -0.85 + s * (1.70 / 6);
          const py = v * sy;
          const pz = v * sz;
          // Color palette from life section: alternating accent red vs ink nucleotides
          const isAcc = (k % 2 === 0 ? v > 0 : v < 0);
          addPoint(u_k + randomRange(-0.006, 0.006), -0.08 + py + randomRange(-0.006, 0.006), pz + randomRange(-0.006, 0.006), isAcc, [0, u_k, py, pz]);
        }
      }
      // 3. Magnifier glass rim (accent red, param [1])
      for (let e = 0; e < 70; e++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.42 + randomRange(-0.035, 0.035);
        addPoint(0.18 + Math.cos(a) * r, -0.08 + Math.sin(a) * r, -0.25 + randomRange(-0.04, 0.04), true, [1]);
      }
      // 4. Magnifier lens glint / optical highlight (accent red, param [1])
      for (let e = 0; e < 12; e++) {
        const a = 0.7 * Math.PI + randomRange(-0.15, 0.15);
        const r = 0.32 + randomRange(-0.015, 0.015);
        addPoint(0.18 + Math.cos(a) * r, -0.08 + Math.sin(a) * r, -0.26 + randomRange(-0.02, 0.02), true, [1]);
      }
      // 5. Magnifier handle (accent red, param [1])
      sampleLine((x, y, z, acc) => addPoint(x, y, z, acc, [1]), [0.48, -0.08 + 0.3, -0.25], [0.18 + 0.72, 0.64, -0.25], 24, 0.04, true);
    }, (param, x, y, z, time, target) => {
      // Moving lens center
      const h = 0.18 + 0.42 * Math.sin(0.55 * time);
      const l = -0.08 + 0.22 * Math.sin(0.9 * time + 1);

      // Magnifier glass itself
      if (param[0] === 1) {
        setVec3(target, x + h - 0.18, y + l - (-0.08), z);
        return;
      }

      // DNA continuous 3D rotation
      let curX = x, curY = y, curZ = z;
      if (param.length >= 4) {
        const u = param[1], sy = param[2], sz = param[3];
        const rot = 0.45 * time;
        const cosR = Math.cos(rot), sinR = Math.sin(rot);
        curX = u;
        curY = -0.08 + sy * cosR - sz * sinR;
        curZ = sy * sinR + sz * cosR;
      }

      // Parabolic fisheye convex lens magnification
      const dx = curX - h;
      const dy = curY - l;
      const dist = Math.hypot(dx, dy);
      if (dist >= 0.42) {
        setVec3(target, curX, curY, curZ);
        return;
      }

      const mag = 1 + 0.45 * (1 - (dist / 0.42) ** 2);
      setVec3(target, h + dx * mag, l + dy * mag, curZ - 0.14 * (1 - dist / 0.42));
    });
  },

  "protein-classify"(n) {
    return this.proteinclassify(n);
  },
};

/**
 * Core ParticleEngine
 * High-performance batched 3D particle renderer with Hermite arc morphing and spring physics.
 */
export class ParticleEngine {
  constructor(canvas, particleCount = 4800) {
    this.canvas = canvas;
    this.n = particleCount;
    this.ctx = canvas.getContext("2d");

    this.shape = null;
    this.animFrom = 0;
    this.animTmp = new Float32Array(3);
    this.animOff = new Float32Array(3 * particleCount);

    this.morphStart = -1;
    this.morphDur = 1.1;
    this.pending = null;

    this.spin = false;
    this.yaw = 0;
    this.swayPhase = 0;
    this.lean = { x: 0, y: 0 };
    this.pointer = null;
    this.fly = null;

    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.colours = {
      ink: "#141413",
      accent: "#d23a22"
    };
    this.reduceMotion = false;

    // High performance typed array buffers
    this.from = new Float32Array(3 * particleCount);
    this.to = new Float32Array(3 * particleCount);
    this.cur = new Float32Array(3 * particleCount);
    this.delay = new Float32Array(particleCount);
    this.accent = new Uint8Array(particleCount);
    this.nextAccent = new Uint8Array(particleCount);
    this.inv = new Int32Array(particleCount);
    this.push = new Float32Array(2 * particleCount);
    this.pushV = new Float32Array(2 * particleCount);

    // Initial random disperse in unit cube
    for (let i = 0; i < 3 * particleCount; i++) {
      this.cur[i] = (2 * Math.random() - 1) * 1.4;
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  setPointer(pos) {
    this.pointer = this.reduceMotion ? null : pos;
  }

  morphTo(targetShape, time, duration = 1.1) {
    if (!targetShape) return;
    this.from.set(this.cur);
    for (let i = 0; i < 3 * this.n; i++) {
      this.from[i] += this.animOff[i];
    }
    this.animOff.fill(0);

    // Handle paper plane flight departure if active
    if (this.fly) {
      const [fx, fy, fz] = this.fly.dir.map((d) => d * flyTrajectory(time - this.fly.start));
      const proj = 2.6 / (2.6 + fz);
      for (let i = 0; i < this.n; i++) {
        this.from[3 * i] = fx * proj + randomRange(-0.03, 0.03);
        this.from[3 * i + 1] = fy * proj + randomRange(-0.03, 0.03);
        this.from[3 * i + 2] = randomRange(-0.03, 0.03);
      }
    }

    // Fisher-Yates shuffle of target particle indices
    const indices = Array.from({ length: this.n }, (_, i) => i);
    for (let i = this.n - 1; i > 0; i--) {
      const pick = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[pick]] = [indices[pick], indices[i]];
    }

    // Map targets to shuffled indices
    for (let i = 0; i < this.n; i++) {
      const srcIdx = indices[i];
      this.inv[srcIdx] = i;
      this.to[3 * i] = targetShape.pos[3 * srcIdx];
      this.to[3 * i + 1] = targetShape.pos[3 * srcIdx + 1];
      this.to[3 * i + 2] = targetShape.pos[3 * srcIdx + 2];
      this.nextAccent[i] = targetShape.accent[srcIdx];
      this.delay[i] = 0.35 * Math.random();
    }

    this.spin = !this.reduceMotion && targetShape.spin;
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
    this.morphStart = time;
    this.fly = null;
    this.shape = targetShape;
    this.morphDur = duration;
    this.pending = null;
    this.animFrom = time + 0.6 * duration;
  }

  reassemble(time) {
    const shape = this.shape;
    if (!shape || this.reduceMotion) return;

    for (let i = 0; i < 3 * this.n; i++) {
      this.from[i] = this.cur[i] + this.animOff[i];
    }
    this.animOff.fill(0);

    for (let i = 0; i < this.n; i++) {
      const base = 3 * i;
      const factor = 1.5 + 0.8 * Math.random();
      for (let c = 0; c < 3; c++) {
        this.to[base + c] = this.from[base + c] * factor + (Math.random() - 0.5) * 0.5;
      }
      this.nextAccent[i] = this.accent[i];
      this.delay[i] = 0.35 * Math.random();
    }

    this.fly = null;
    this.morphStart = time;
    this.morphDur = 0.45;
    this.pending = {
      shape,
      at: time + 0.5
    };
  }

  frame(time, dt) {
    const { n, cur, from, to } = this;

    // Hermite smoothstep + arc trajectory morphing
    if (this.morphStart >= 0) {
      const progress = (time - this.morphStart) / this.morphDur;
      let completed = true;

      for (let i = 0; i < n; i++) {
        let r = (progress - this.delay[i]) / 0.65;
        if (r < 1) completed = false;
        r = clamp(r);

        const h = r * r * (3 - 2 * r);
        const arc = 0.32 * Math.sin(Math.PI * r);
        const idx = 3 * i;

        const fx = from[idx], fy = from[idx + 1], fz = from[idx + 2];
        const tx = to[idx], ty = to[idx + 1], tz = to[idx + 2];

        cur[idx] = fx + (tx - fx) * h - (tz - fz) * arc * 0.5;
        cur[idx + 1] = fy + (ty - fy) * h;
        cur[idx + 2] = fz + (tz - fz) * h + (tx - fx) * arc * 0.5;

        if (r > 0.5) {
          this.accent[i] = this.nextAccent[i];
        }
      }

      if (completed) {
        this.morphStart = -1;
      }
    }

    if (this.pending && time >= this.pending.at) {
      this.morphTo(this.pending.shape, time);
    }

    // Continuous spin vs sinusoidal sway
    if (this.spin === true) {
      this.yaw += 0.045 * dt * Math.PI * 2;
    } else {
      this.swayPhase += 0.45 * dt;
      const targetYaw = this.spin === "sway" ? 0.55 * Math.sin(this.swayPhase) : 0;
      this.yaw += (targetYaw - this.yaw) * Math.min(1, 2.5 * dt);
    }

    // Pointer lean damping
    const targetLean = this.pointer
      ? {
          x: 0.17 * clamp((this.pointer.x / this.w) * 2 - 1, -1, 1),
          y: 0.17 * clamp((this.pointer.y / this.h) * 2 - 1, -1, 1)
        }
      : { x: 0, y: 0 };

    const decay = 1 - Math.exp(-4 * dt);
    this.lean.x += (targetLean.x - this.lean.x) * decay;
    this.lean.y += (targetLean.y - this.lean.y) * decay;

    const ctx = this.ctx;
    const viewScale = 0.42 * Math.min(this.w, this.h);
    const centerX = this.w / 2;
    const centerY = this.h / 2;

    const rotYaw = this.yaw + this.lean.x;
    const rotPitch = -this.lean.y;
    const cosY = Math.cos(rotYaw), sinY = Math.sin(rotYaw);
    const cosX = Math.cos(rotPitch), sinX = Math.sin(rotPitch);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // 16 Buckets: 8 depth bands for ink, 8 depth bands for accent
    const buckets = Array.from({ length: 16 }, () => []);

    // Procedural shape-specific motion update
    const motion = this.reduceMotion ? undefined : this.shape?.motion;
    if (motion && !this.fly && !this.pending) {
      const factor = smoothstep((time - this.animFrom) / 0.6);
      const { ks, params, fn } = motion;
      const basePos = this.shape.pos;
      const tmp = this.animTmp;
      const offsets = this.animOff;

      for (let i = 0; i < ks.length; i++) {
        const k = ks[i];
        const srcOffset = 3 * k;
        const invOffset = 3 * this.inv[k];
        fn(params[i], basePos[srcOffset], basePos[srcOffset + 1], basePos[srcOffset + 2], time, tmp);
        offsets[invOffset] = (tmp[0] - basePos[srcOffset]) * factor;
        offsets[invOffset + 1] = (tmp[1] - basePos[srcOffset + 1]) * factor;
        offsets[invOffset + 2] = (tmp[2] - basePos[srcOffset + 2]) * factor;
      }
    }

    const offsets = this.animOff;
    for (let i = 0; i < n; i++) {
      const idx = 3 * i;
      let px = cur[idx] + offsets[idx];
      let py = cur[idx + 1] + offsets[idx + 1];
      let pz = cur[idx + 2] + offsets[idx + 2];

      // Rotate around Y (yaw)
      const rx = px * cosY + pz * sinY;
      const rz1 = -px * sinY + pz * cosY;

      // Rotate around X (pitch)
      const ry = py * cosX - rz1 * sinX;
      const rz = py * sinX + rz1 * cosX;

      px = rx;
      py = ry;
      pz = rz;

      // 3D perspective projection
      const proj = 2.6 / (2.6 + pz);
      let sx = centerX + px * viewScale * proj;
      let sy = centerY + py * viewScale * proj;

      // Spring-damper mouse repulsion
      const pushIdx = 2 * i;
      let forceX = 0;
      let forceY = 0;

      if (this.pointer) {
        const dx = sx - this.pointer.x;
        const dy = sy - this.pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 90 && dist > 0.01) {
          const mag = (1 - dist / 90) * 26;
          forceX = (dx / dist) * mag;
          forceY = (dy / dist) * mag;
        }
      }

      const pushV = this.pushV;
      const push = this.push;
      pushV[pushIdx] += ((forceX - push[pushIdx]) * 60 - 11 * pushV[pushIdx]) * dt;
      pushV[pushIdx + 1] += ((forceY - push[pushIdx + 1]) * 60 - 11 * pushV[pushIdx + 1]) * dt;
      push[pushIdx] += pushV[pushIdx] * dt;
      push[pushIdx + 1] += pushV[pushIdx + 1] * dt;

      sx += push[pushIdx];
      sy += push[pushIdx + 1];

      // Depth classification into 8 bands
      const depthNorm = clamp((pz + 1) / 2);
      const band = Math.min(7, Math.floor((1 - 0.8 * depthNorm) * 8));
      const dotSize = (1.4 + 1.4 * (1 - depthNorm)) * proj;

      buckets[8 * this.accent[i] + band].push(sx, sy, dotSize);
    }

    // Render each bucket in a single batched path
    for (let b = 0; b < buckets.length; b++) {
      const bucket = buckets[b];
      if (!bucket.length) continue;

      const isAccent = b >= 8;
      ctx.fillStyle = isAccent ? this.colours.accent : this.colours.ink;
      const bandFrac = ((b % 8) + 1) / 8;
      ctx.globalAlpha = isAccent ? 0.55 + 0.45 * bandFrac : 0.2 + 0.8 * bandFrac;

      ctx.beginPath();
      for (let i = 0; i < bucket.length; i += 3) {
        const size = bucket[i + 2];
        ctx.rect(bucket[i] - size / 2, bucket[i + 1] - size / 2, size, size);
      }
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }
}

/**
 * Controller helper to initialize and wire up a particle canvas with event listeners
 */
export function createParticleSystem(container, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = options.canvasClass || "block h-full w-full";
  container.appendChild(canvas);

  const particleCount = options.particleCount || (window.matchMedia("(max-width: 1023px)").matches ? 2600 : 4800);
  const engine = new ParticleEngine(canvas, particleCount);

  // Sync colors with CSS variables
  const updateColors = () => {
    const style = getComputedStyle(document.documentElement);
    engine.colours = {
      ink: style.getPropertyValue("--fg").trim() || options.inkColor || "#141413",
      accent: style.getPropertyValue("--accent").trim() || options.accentColor || "#d23a22"
    };
  };

  updateColors();
  engine.resize();

  // Cache for instantiated shapes
  const shapeCache = new Map();
  let defaultShape = null;
  let currentKey = "";
  let revertTimer = 0;

  // Resolves a shape key like "guitar", "life:cricket", "github"
  const resolveShape = (key) => {
    if (shapeCache.has(key)) return shapeCache.get(key);

    const parts = key.split(":");
    const name = parts.length > 1 ? parts[1] : parts[0];

    const normalized = name.replace(/[-_]/g, "");
    let shape = null;
    if (typeof ShapeLibrary[name] === "function") {
      shape = ShapeLibrary[name].call(ShapeLibrary, engine.n);
    } else if (typeof ShapeLibrary[normalized] === "function") {
      shape = ShapeLibrary[normalized].call(ShapeLibrary, engine.n);
    } else {
      shape = sampleText(engine.n, name);
    }

    shapeCache.set(key, shape);
    return shape;
  };

  // Set default initial shape (e.g. user name or home shape)
  let defaultKey = options.initialShape || "Manzil";
  defaultShape = resolveShape(defaultKey);
  engine.morphTo(defaultShape, performance.now() / 1000);
  currentKey = defaultKey;

  const morphToKey = (key, makeDefault = false) => {
    if (key === currentKey && !makeDefault) return;
    const target = resolveShape(key);
    if (target) {
      currentKey = key;
      if (makeDefault) {
        defaultShape = target;
        defaultKey = key;
      }
      engine.morphTo(target, performance.now() / 1000);
    }
  };

  const revertToDefault = () => {
    if (defaultShape && currentKey !== defaultKey) {
      currentKey = defaultKey;
      engine.morphTo(defaultShape, performance.now() / 1000);
    }
  };

  // Delegated event listeners for [data-shape]
  const handlePointerOver = (e) => {
    if (e.pointerType !== "mouse") return;
    const target = e.target.closest?.("[data-shape]");
    if (target) {
      window.clearTimeout(revertTimer);
      morphToKey(target.dataset.shape);
    } else {
      window.clearTimeout(revertTimer);
      revertTimer = window.setTimeout(revertToDefault, 160);
    }
  };

  const handlePointerLeave = () => {
    window.clearTimeout(revertTimer);
    revertTimer = window.setTimeout(revertToDefault, 160);
  };

  const handleFocusIn = (e) => {
    const target = e.target.closest?.("[data-shape]");
    if (target) {
      window.clearTimeout(revertTimer);
      morphToKey(target.dataset.shape);
    }
  };

  const handleFocusOut = () => {
    window.clearTimeout(revertTimer);
    revertTimer = window.setTimeout(revertToDefault, 160);
  };

  const handlePointerMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    engine.setPointer({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCanvasLeave = () => {
    engine.setPointer(null);
  };

  document.addEventListener("pointerover", handlePointerOver);
  document.addEventListener("pointerleave", handlePointerLeave);
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerleave", handleCanvasLeave);

  // Resize and theme observers
  const resizeObserver = new ResizeObserver(() => engine.resize());
  resizeObserver.observe(container);

  const themeObserver = new MutationObserver(() => {
    const prevInk = engine.colours.ink;
    updateColors();
    if (engine.colours.ink !== prevInk) {
      engine.reassemble(performance.now() / 1000);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  });

  // Reduced motion media query
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handleMotionChange = (e) => {
    engine.reduceMotion = e.matches;
  };
  motionQuery.addEventListener("change", handleMotionChange);

  // Render loop with IntersectionObserver visibility pause
  let animId = 0;
  let lastTime = performance.now();
  let isVisible = true;

  const tick = (now) => {
    animId = requestAnimationFrame(tick);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    engine.frame(now / 1000, dt);
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible && !animId) {
      lastTime = performance.now();
      animId = requestAnimationFrame(tick);
    } else if (!isVisible && animId) {
      cancelAnimationFrame(animId);
      animId = 0;
    }
  });
  visibilityObserver.observe(canvas);
  animId = requestAnimationFrame(tick);

  // Cleanup destroyer
  return {
    engine,
    morphTo: morphToKey,
    revert: revertToDefault,
    destroy() {
      cancelAnimationFrame(animId);
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handleCanvasLeave);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      visibilityObserver.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      canvas.remove();
    }
  };
}
