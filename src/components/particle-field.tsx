"use client";

import { useEffect, useRef } from "react";
import { mulberry, hashKey, sampleShape, shapes, type Target } from "@/lib/shapes";
import { generateArtPoints, artPointsToTargets } from "@/lib/art-points";

type FieldProps = {
  shape: string;
  className?: string;
};

type Engine = {
  setShape: (key: string) => void;
};

const MORPH_MS = 780;
const PORTRAIT_SRC = "/art/kakashi.png";

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

    // particle state
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

    // seed from rest shape
    const seedShape = desired === "portrait" && !portraitTargets ? "rest:neural" : desired;
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
      }
      current = seedShape;
      currentTargets = t0;
      morphStart = performance.now();
    }

    // Load artwork
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
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const pointer = { x: 0, y: 0, inside: false };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width;
      pointer.y = (e.clientY - rect.top) / rect.height;
      pointer.inside = pointer.x > -0.35 && pointer.x < 1.35 && pointer.y > -0.35 && pointer.y < 1.35;
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

      let settle = 0;
      if (current === "portrait" && !reduce && now > morphStart + MORPH_MS) {
        const sTime = Math.min(1, (now - (morphStart + MORPH_MS)) / 800);
        settle = sTime * sTime * (3 - 2 * sTime);
      }

      if (settle > 0) {
        const t = now * 0.001;
        const floatY = (3 / 600) * Math.sin((2 * Math.PI * t) / 7);
        const breath = 1.0 + 0.01 * Math.sin((2 * Math.PI * t) / 5);
        for (let i = 0; i < count; i++) {
          const amp = floatY * (0.6 + pWeight[i] * 0.4);
          tx[i] = baseTx[i] + amp * 0.5;
          ty[i] = baseTy[i] + amp;
          const sx = 1 + (breath - 1) * (0.3 + pWeight[i] * 0.7) * 0.12;
          tx[i] = baseTx[i] + (tx[i] - baseTx[i]) * sx;
          ty[i] = baseTy[i] + (ty[i] - baseTy[i]) * sx;
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

      const isPortrait = current === "portrait";

      if (isPortrait) {
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

        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (acc[i] || pWeight[i] < 0.35 || pWeight[i] >= 0.7) continue;
          const sx = ox + x[i] * box;
          const sy = oy + y[i] * box;
          const r = Math.max(1.35 * size[i], 0.9);
          ctx.moveTo(sx + r, sy);
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
        }
        ctx.fillStyle = dot;
        ctx.globalAlpha = 0.78;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          if (acc[i] || pWeight[i] < 0.7) continue;
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
        const pulse = 0.9 + 0.1 * Math.sin((2 * Math.PI * now * 0.001) / 4);
        ctx.globalAlpha = isPortrait ? pulse : 0.95;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
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
