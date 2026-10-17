"use client";

import { useEffect, useRef } from "react";
import {
  mulberry,
  hashKey,
  sampleShape,
  shapes,
  type Target,
} from "@/lib/shapes";
import {
  generateArtPoints,
  artPointsToTargets,
  spineNormalAt,
  DRAGON_SPINE,
  CLOUD_ELLIPSES,
  ART_BBOX,
  ART_W,
  ART_H,
  FIT_W,
  FIT_H,
  OFF_X,
  OFF_Y,
  type Layer,
} from "@/lib/art-points";

type FieldProps = {
  shape: string;
  className?: string;
};

type Engine = {
  setShape: (key: string) => void;
};

const MORPH_MS = 780;
const PORTRAIT_SRC = "/art/goku-shenron.png";

// Map Layer name to compact integer index
const LAYER_INDEX: Record<Layer, number> = {
  cloud0: 1,
  cloud1: 2,
  cloud2: 3,
  cloud3: 4,
  cloud4: 5,
  dragon_body: 6,
  dragon_head: 7,
  whisker_left: 8,
  whisker_right: 9,
  goku: 10,
  hair: 11,
  scarf: 12,
  staff: 13,
};

// Debug colors for ?debug=layers
const DEBUG_LAYER_COLORS = [
  "#94a3b8", // 0: none/other
  "#38bdf8", // 1: cloud0 (cyan)
  "#38bdf8", // 2: cloud1
  "#38bdf8", // 3: cloud2
  "#38bdf8", // 4: cloud3
  "#38bdf8", // 5: cloud4
  "#10b981", // 6: dragon_body (emerald)
  "#84cc16", // 7: dragon_head (lime)
  "#f59e0b", // 8: whisker_left (amber)
  "#f59e0b", // 9: whisker_right (amber)
  "#f97316", // 10: goku (orange)
  "#8b5cf6", // 11: hair (purple)
  "#ffffff", // 12: scarf (white)
  "#ef4444", // 13: staff (red)
];

// Per-cloud drift parameters (in art units at 600px canvas)
const CLOUD_PARAMS = [
  { A: 7, T: 12.0, phi: 0.0, T_bob: 6.2, phi_bob: 0.5, cx: 0.76, cy: 0.13 },
  { A: 8, T: 14.5, phi: 1.8, T_bob: 7.1, phi_bob: 2.1, cx: 0.16, cy: 0.26 },
  { A: 6, T: 11.0, phi: 3.5, T_bob: 5.8, phi_bob: 4.0, cx: 0.30, cy: 0.51 },
  { A: 7, T: 13.2, phi: 4.8, T_bob: 6.8, phi_bob: 1.2, cx: 0.81, cy: 0.53 },
  { A: 9, T: 15.5, phi: 2.4, T_bob: 7.5, phi_bob: 3.3, cx: 0.21, cy: 0.79 },
];

export function ParticleField({ shape, className }: FieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const shapeRef = useRef(shape);

  useEffect(() => {
    shapeRef.current = shape;
    engineRef.current?.setShape(shape);
  }, [shape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = window.innerWidth < 820 ? 3800 : 6000;

    // Check debug flag in development
    const isDebugLayers =
      process.env.NODE_ENV !== "production" &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "layers";

    const cache = new Map<string, Target[]>();
    const rnd = mulberry(hashKey("field"));

    let portraitTargets: Target[] | null = null;
    let disposed = false;

    const getTargets = (key: string): Target[] => {
      const isImage = key === "portrait";
      const cacheKey = `${key}:${count}:${isImage && portraitTargets ? "p" : "v"}`;
      const hit = cache.get(cacheKey);
      if (hit) return hit;
      const targets =
        isImage && portraitTargets
          ? portraitTargets
          : sampleShape(isImage ? "rest:neural" : key, count, isImage ? 0.9 : 0.94);
      cache.set(cacheKey, targets);
      return targets;
    };

    // particle state -------------------------------------------------------
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const vx = new Float32Array(count);
    const vy = new Float32Array(count);
    const tx = new Float32Array(count);
    const ty = new Float32Array(count);
    const baseTx = new Float32Array(count);
    const baseTy = new Float32Array(count);
    const acc = new Uint8Array(count);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);

    // Idle animation layer & metadata arrays
    const pLayer = new Uint8Array(count);
    const pSpineS = new Float32Array(count);
    const pSpineNx = new Float32Array(count);
    const pSpineNy = new Float32Array(count);
    const pHairDist = new Float32Array(count);
    const pWeight = new Float32Array(count);

    const apply = (targets: Target[], explode: boolean) => {
      const order = new Uint16Array(count);
      for (let i = 0; i < count; i++) order[i] = i;
      for (let i = count - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
      for (let i = 0; i < count; i++) {
        const t = targets[order[i]] ?? targets[i % targets.length];
        baseTx[i] = t.x;
        baseTy[i] = t.y;
        tx[i] = t.x;
        ty[i] = t.y;
        acc[i] = t.a ? 1 : 0;
        size[i] = t.s;
        pWeight[i] = t.weight ?? 0.5;

        if (t.layer) {
          pLayer[i] = LAYER_INDEX[t.layer] ?? 0;
          pSpineS[i] = t.spineS ?? -1;
          if (t.spineS !== undefined && t.spineS >= 0) {
            const n = spineNormalAt(t.spineS, DRAGON_SPINE);
            pSpineNx[i] = n.nx;
            pSpineNy[i] = n.ny;
          } else {
            pSpineNx[i] = 0;
            pSpineNy[i] = 0;
          }
          pHairDist[i] = t.hairDist ?? -1;
        } else {
          pLayer[i] = 0;
          pSpineS[i] = -1;
          pSpineNx[i] = 0;
          pSpineNy[i] = 0;
          pHairDist[i] = -1;
        }

        if (explode && !reduce) {
          const dx = x[i] - 0.5;
          const dy = y[i] - 0.5;
          const d = Math.hypot(dx, dy) || 1;
          const kick = 0.9 + rnd() * 1.5;
          vx[i] += (dx / d) * kick * 0.11 + (rnd() - 0.5) * 0.16;
          vy[i] += (dy / d) * kick * 0.11 + (rnd() - 0.5) * 0.16;
        }
      }
      morphStart = performance.now();
    };

    let morphStart = -1e9;
    let current = "";
    let desired = shapeRef.current;
    let currentTargets: Target[] = [];

    const setShape = (key: string) => {
      desired = key;
      if (key === current) return;
      current = key;
      currentTargets = getTargets(key);
      apply(currentTargets, true);
    };

    // seed from the rest shape so first paint is already formed
    const seedShape =
      desired === "portrait" && !portraitTargets ? "rest:neural" : desired;
    {
      const t0 = getTargets(seedShape);
      for (let i = 0; i < count; i++) {
        const t = t0[i % t0.length];
        x[i] = 0.5 + (rnd() - 0.5) * 0.9;
        y[i] = 0.5 + (rnd() - 0.5) * 0.9;
        baseTx[i] = t.x;
        baseTy[i] = t.y;
        tx[i] = t.x;
        ty[i] = t.y;
        acc[i] = t.a ? 1 : 0;
        size[i] = t.s;
        phase[i] = rnd() * Math.PI * 2;
        pWeight[i] = t.weight ?? 0.5;
        pLayer[i] = 0;
        pSpineS[i] = -1;
      }
      current = seedShape;
      currentTargets = t0;
      morphStart = performance.now();
    }

    // Load artwork and sample off the critical path via requestIdleCallback
    const img = new Image();
    img.decoding = "async";
    img.src = PORTRAIT_SRC;
    img.onload = () => {
      if (disposed) return;

      const runSampling = () => {
        if (disposed) return;
        const off = document.createElement("canvas");
        off.width = img.width;
        off.height = img.height;
        const octx = off.getContext("2d");
        if (!octx) return;
        octx.drawImage(img, 0, 0);
        const imgData = octx.getImageData(0, 0, img.width, img.height);

        const pts = generateArtPoints(imgData.data, img.width, img.height, {
          count,
          maxDim: 520,
          seed: 42,
        });
        portraitTargets = artPointsToTargets(pts);
        cache.clear();

        if (desired === "portrait") {
          current = "";
          setShape("portrait");
        }
      };

      setTimeout(runSampling, 0);
    };

    // viewport + theme -----------------------------------------------------
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let dot = "#e9e9e9";
    let accent = "#ef4a44";
    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      const d = cs.getPropertyValue("--dot").trim();
      const a = cs.getPropertyValue("--accent").trim();
      if (d) dot = d;
      if (a) accent = a;
    };
    readTheme();

    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // pointer --------------------------------------------------------------
    const pointer = { x: 0, y: 0, inside: false };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = (e.clientY - rect.top) / rect.height;
      pointer.inside =
        pointer.x > -0.35 && pointer.x < 1.35 && pointer.y > -0.35 && pointer.y < 1.35;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("blur", onLeave);

    let raf = 0;
    let last = performance.now();
    let spinAngle = 0;
    let running = false;

    // Fixed reference positions in normalised square units for rotations
    const staffGripX = OFF_X + 0.76 * FIT_W;
    const staffGripY = OFF_Y + 0.40 * FIT_H;
    const neckX = OFF_X + 0.65 * FIT_W;
    const neckY = OFF_Y + 0.79 * FIT_H;

    const frame = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const box = Math.min(cssW, cssH) * 0.98;
      const ox = (cssW - box) / 2;
      const oy = (cssH - box) / 2;
      const spin = !reduce ? (shapes[current]?.spin ?? 0) : 0;
      spinAngle += spin * dt;

      ctx.clearRect(0, 0, cssW, cssH);

      const u = Math.min(1, (now - morphStart) / MORPH_MS);
      const ease = 1 - Math.pow(1 - u, 3);
      const morphing = u < 1;
      const k = 9 + ease * 8;
      const damp = reduce ? 0 : Math.pow(0.0016, dt);
      const turb = morphing ? (1 - ease) * 1.5 : 0;

      // Settle factor: eases from 0 to 1 over 800 ms after morph completes
      let settle = 0;
      if (current === "portrait" && !reduce && now > morphStart + MORPH_MS) {
        const sTime = Math.min(1, (now - (morphStart + MORPH_MS)) / 800);
        settle = sTime * sTime * (3 - 2 * sTime);
      }

      // Compute idle animation offsets when settled
      if (settle > 0) {
        const t = now * 0.001; // seconds

        // Whole piece float: 3 units, period 7s
        const wholeFloatY = (3 / 600) * Math.sin((2 * Math.PI * t) / 7);

        // Precompute cloud drifts
        const cloudDriftX = new Float32Array(5);
        const cloudDriftY = new Float32Array(5);
        const cloudScale = new Float32Array(5);
        for (let c = 0; c < 5; c++) {
          const cp = CLOUD_PARAMS[c];
          cloudDriftX[c] = (cp.A / 600) * Math.sin((2 * Math.PI * t) / cp.T + cp.phi);
          cloudDriftY[c] = (2 / 600) * Math.sin((2 * Math.PI * t) / cp.T_bob + cp.phi_bob);
          cloudScale[c] = 1.0 + 0.015 * Math.sin((2 * Math.PI * t) / (cp.T * 0.8) + cp.phi);
        }

        // Goku bob: 2 units, period 5s
        const gokuBobY = (2 / 600) * Math.sin((2 * Math.PI * t) / 5);

        // Hair flutter: 2 units, period 3.2s
        const hairWave = (2 / 600) * Math.sin((2 * Math.PI * t) / 3.2);

        // Scarf flutter: 2 units, period 3.6s
        const scarfWave = (2 / 600) * Math.sin((2 * Math.PI * t) / 3.6 + 0.8);

        // Staff swing: +/-1.5 deg about grip, period 6s
        const staffAngle = (1.5 * Math.PI / 180) * Math.sin((2 * Math.PI * t) / 6 + 0.4);

        // Dragon head nod: +/-1.2 deg about neck joint, period 6s
        const headAngle = (1.2 * Math.PI / 180) * Math.sin((2 * Math.PI * t) / 6 + 1.2);

        // Body wave phase (5s cycle)
        const bodyWavePhase = (2 * Math.PI * t) / 5;

        for (let i = 0; i < count; i++) {
          const l = pLayer[i];
          let offX = 0;
          let offY = wholeFloatY;

          if (l >= 1 && l <= 5) {
            // Cloud 0..4
            const c = l - 1;
            const cp = CLOUD_PARAMS[c];
            const sc = cloudScale[c];
            const cX = OFF_X + cp.cx * FIT_W;
            const cY = OFF_Y + cp.cy * FIT_H;
            offX = cloudDriftX[c] + (baseTx[i] - cX) * (sc - 1);
            offY += cloudDriftY[c] + (baseTy[i] - cY) * (sc - 1);
          } else if (l === 6) {
            // dragon_body
            const s = pSpineS[i];
            if (s >= 0) {
              let amp = 0;
              if (s <= 0.5) amp = 5.0 * Math.pow((0.5 - s) / 0.5, 1.5);
              else if (s <= 0.85) amp = 2.5 * ((s - 0.5) / 0.35);
              else amp = 2.5 * (1 - (s - 0.85) / 0.15);
              const wave = (amp / 600) * Math.sin(bodyWavePhase - 2 * Math.PI * 1.2 * s);
              offX += wave * pSpineNx[i];
              offY += wave * pSpineNy[i];
            }
          } else if (l === 7) {
            // dragon_head
            const dx = baseTx[i] - neckX;
            const dy = baseTy[i] - neckY;
            offX += -dy * headAngle;
            offY += dx * headAngle;
          } else if (l === 8 || l === 9) {
            // whiskers (8 = left, 9 = right)
            const prog = l === 8 ? (1 - (baseTx[i] - OFF_X) / FIT_W) : (baseTx[i] - OFF_X) / FIT_W;
            const amp = 5.0 + 2.0 * prog;
            const disp = (amp / 600) * Math.sin(bodyWavePhase - 1.2 - 0.8 * prog);
            offX += disp * (l === 8 ? -0.7 : 0.8);
            offY += disp * 0.5;
          } else if (l === 10) {
            // goku body
            offY += gokuBobY;
          } else if (l === 11) {
            // hair
            offY += gokuBobY;
            const d = pHairDist[i];
            if (d > 0) {
              offX += hairWave * d * 0.7;
              offY += hairWave * d * 0.7;
            }
          } else if (l === 12) {
            // scarf
            offY += gokuBobY + scarfWave * 0.4;
            offX += scarfWave * 0.8;
          } else if (l === 13) {
            // staff
            offY += gokuBobY;
            const dx = baseTx[i] - staffGripX;
            const dy = baseTy[i] - staffGripY;
            offX += -dy * staffAngle;
            offY += dx * staffAngle;
          }

          tx[i] = baseTx[i] + offX * settle;
          ty[i] = baseTy[i] + offY * settle;
        }
      }

      const repelR = 0.17;
      const repel = !reduce && pointer.inside;

      for (let i = 0; i < count; i++) {
        if (reduce) {
          x[i] = tx[i];
          y[i] = ty[i];
          continue;
        }
        let ax = (tx[i] - x[i]) * k;
        let ay = (ty[i] - y[i]) * k;
        if (turb > 0) {
          const p = phase[i];
          ax += Math.sin(now * 0.004 + p * 3.1) * turb;
          ay += Math.cos(now * 0.0047 + p * 2.3) * turb;
        }
        if (repel) {
          const dx = x[i] - pointer.x;
          const dy = y[i] - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < repelR && d > 0.0001) {
            const f = (1 - d / repelR) ** 2 * 6.5;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        vx[i] = (vx[i] + ax * dt) * damp;
        vy[i] = (vy[i] + ay * dt) * damp;
        x[i] += vx[i] * dt;
        y[i] += vy[i] * dt;
        if (x[i] < -0.4) x[i] = -0.4;
        else if (x[i] > 1.4) x[i] = 1.4;
        if (y[i] < -0.4) y[i] = -0.4;
        else if (y[i] > 1.4) y[i] = 1.4;
      }

      const cos = spin ? Math.cos(spinAngle) : 1;
      const sin = spin ? Math.sin(spinAngle) : 0;
      const drift = 1.7 / box;

      // ─── Render dots ────────────────────────────────────────────────────────
      if (isDebugLayers) {
        // Debug mode: draw dots by layer color
        for (let l = 0; l <= 13; l++) {
          ctx.beginPath();
          let any = false;
          for (let i = 0; i < count; i++) {
            if (pLayer[i] !== l) continue;
            any = true;
            const sx = ox + x[i] * box;
            const sy = oy + y[i] * box;
            const r = Math.max(1.15 * size[i], 0.4);
            ctx.moveTo(sx + r, sy);
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
          }
          if (any) {
            ctx.fillStyle = DEBUG_LAYER_COLORS[l];
            ctx.globalAlpha = 0.85;
            ctx.fill();
          }
        }

        // Draw debug spine polyline
        ctx.beginPath();
        for (let j = 0; j < DRAGON_SPINE.length; j++) {
          const su = (DRAGON_SPINE[j][0] - ART_BBOX.x0) / ART_W;
          const sv = (DRAGON_SPINE[j][1] - ART_BBOX.y0) / ART_H;
          const sx = ox + (OFF_X + su * FIT_W) * box;
          const sy = oy + (OFF_Y + sv * FIT_H) * box;
          if (j === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.stroke();

        // Draw debug cloud ellipses
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        for (let c = 0; c < CLOUD_ELLIPSES.length; c++) {
          const ce = CLOUD_ELLIPSES[c];
          const cu = (ce.cx - ART_BBOX.x0) / ART_W;
          const cv = (ce.cy - ART_BBOX.y0) / ART_H;
          const csx = ox + (OFF_X + cu * FIT_W) * box;
          const csy = oy + (OFF_Y + cv * FIT_H) * box;
          const srx = (ce.rx / ART_W) * FIT_W * box;
          const sry = (ce.ry / ART_H) * FIT_H * box;
          ctx.beginPath();
          ctx.ellipse(csx, csy, srx, sry, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else {
        // Normal rendering
        const isPortrait = current === "portrait";

        if (isPortrait) {
          // Tiered opacity for stippled line art (light, mid, dark)
          // Bin 0: light (weight < 0.35)
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            if (acc[i] || pWeight[i] >= 0.35) continue;
            const sx = ox + x[i] * box;
            const sy = oy + y[i] * box;
            const r = Math.max(1.3 * size[i], 0.8);
            ctx.moveTo(sx + r, sy);
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
          }
          ctx.fillStyle = dot;
          ctx.globalAlpha = 0.55;
          ctx.fill();

          // Bin 1: mid (0.35 <= weight < 0.70)
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            if (acc[i] || pWeight[i] < 0.35 || pWeight[i] >= 0.70) continue;
            const sx = ox + x[i] * box;
            const sy = oy + y[i] * box;
            const r = Math.max(1.35 * size[i], 0.9);
            ctx.moveTo(sx + r, sy);
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
          }
          ctx.fillStyle = dot;
          ctx.globalAlpha = 0.78;
          ctx.fill();

          // Bin 2: dark outlines & details (weight >= 0.70)
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            if (acc[i] || pWeight[i] < 0.70) continue;
            const sx = ox + x[i] * box;
            const sy = oy + y[i] * box;
            const r = Math.max(1.45 * size[i], 1.0);
            ctx.moveTo(sx + r, sy);
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
          }
          ctx.fillStyle = dot;
          ctx.globalAlpha = 0.95;
          ctx.fill();
        } else {
          // Standard single-pass for wireframe shapes
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
            if (acc[i]) continue;
            let px = x[i];
            let py = y[i];
            if (turb === 0 && !reduce) {
              px += Math.sin(now * 0.00035 + phase[i]) * drift * 0.5;
              py += Math.cos(now * 0.00029 + phase[i] * 1.3) * drift * 0.5;
            }
            let sx: number;
            let sy: number;
            let r = 1.15 * size[i];
            if (spin) {
              const z = (px - 0.5) * sin;
              const persp = 1 / (1 + z * 0.7);
              sx = ox + (0.5 + (px - 0.5) * cos * persp) * box;
              sy = oy + (0.5 + (py - 0.5) * persp) * box;
              r *= persp;
            } else {
              sx = ox + px * box;
              sy = oy + py * box;
            }
            r = Math.max(r, 0.35);
            ctx.moveTo(sx + r, sy);
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
          }
          ctx.fillStyle = dot;
          ctx.globalAlpha = 0.62;
          ctx.fill();
        }

        // Accent dots pass
        ctx.beginPath();
        let anyAccent = false;
        for (let i = 0; i < count; i++) {
          if (!acc[i]) continue;
          anyAccent = true;
          let px = x[i];
          let py = y[i];
          if (turb === 0 && !reduce && !isPortrait) {
            px += Math.sin(now * 0.00035 + phase[i]) * drift * 0.5;
            py += Math.cos(now * 0.00029 + phase[i] * 1.3) * drift * 0.5;
          }
          let sx: number;
          let sy: number;
          let r = 1.25 * size[i];
          if (spin) {
            const z = (px - 0.5) * sin;
            const persp = 1 / (1 + z * 0.7);
            sx = ox + (0.5 + (px - 0.5) * cos * persp) * box;
            sy = oy + (0.5 + (py - 0.5) * persp) * box;
            r *= persp;
          } else {
            sx = ox + px * box;
            sy = oy + py * box;
          }
          r = Math.max(r, 0.35);
          ctx.moveTo(sx + r, sy);
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
        }
        if (anyAccent) {
          ctx.fillStyle = accent;
          // Very slow opacity pulse between 0.80 and 1.00 (period 4s) for portrait
          const pulse = 0.90 + 0.10 * Math.sin((2 * Math.PI * now * 0.001) / 4);
          ctx.globalAlpha = isPortrait ? pulse : 0.95;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      frame();
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    document.addEventListener("visibilitychange", onVisibility);
    start();

    engineRef.current = { setShape };

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("blur", onLeave);
      engineRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
