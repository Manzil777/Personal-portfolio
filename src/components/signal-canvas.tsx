"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

type Point = { x: number; y: number; tx: number; ty: number; phase: number };
const hash = (word: string) => [...word].reduce((n, c) => n + c.charCodeAt(0), 0);
function target(shape: string, i: number, count: number): [number, number] {
  const t = i / count * Math.PI * 2;
  const seed = hash(shape); const wave = Math.sin(t * ((seed % 5) + 2));
  if (shape === "protein") return [0.5 + Math.sin(t * 3) * .28, .5 + Math.cos(t * 2) * .2 + Math.sin(t * 6) * .05];
  if (shape === "sentiment") return [.16 + i / count * .7, .72 - Math.abs(Math.sin(t * 1.6)) * .42 + Math.sin(t * 7) * .025];
  if (shape === "inventory") { const col = i % 8; const row = Math.floor(i / 8); return [.18 + col * .09 + (row % 2) * .01, .2 + row * .095]; }
  if (shape === "flow") return [.13 + i / count * .74, .5 + Math.sin(t * 2) * .22];
  if (shape === "ball") return [.5 + Math.cos(t) * .28, .5 + Math.sin(t) * .28];
  if (shape === "wave") return [.1 + i / count * .8, .5 + Math.sin(t * 5) * .18];
  if (shape === "map") return [.5 + Math.cos(t * 1.5) * (.25 + .08 * Math.sin(t * 3)), .5 + Math.sin(t * 1.5) * (.25 + .08 * Math.sin(t * 3))];
  if (shape === "trophy") return [.5 + Math.cos(t) * (.18 + .1 * Math.sin(t * 2)), .54 + Math.sin(t) * .26];
  return [.5 + Math.cos(t * 2.3) * (.25 + .06 * wave), .5 + Math.sin(t * 1.7) * (.23 + .04 * wave)];
}

export function SignalCanvas({ shape }: { shape: string }) {
  const canvas = useRef<HTMLCanvasElement>(null); const shapeRef = useRef(shape);
  useEffect(() => { shapeRef.current = shape; }, [shape]);
  useEffect(() => {
    const el = canvas.current; if (!el) return; const context = el.getContext("2d"); if (!context) return;
    const points: Point[] = Array.from({ length: 112 }, (_, i) => ({ x: .5, y: .5, tx: .5, ty: .5, phase: i * .37 }));
    let width = 0, height = 0, lastShape = "";
    const resize = () => { const box = el.getBoundingClientRect(); const dpr = Math.min(devicePixelRatio, 2); width = box.width; height = box.height; el.width = width * dpr; el.height = height * dpr; context.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); const observer = new ResizeObserver(resize); observer.observe(el);
    const draw = () => {
      const active = shapeRef.current;
      if (active !== lastShape) { points.forEach((p, i) => { const [x, y] = target(active, i, points.length); p.tx = x; p.ty = y; }); lastShape = active; }
      context.clearRect(0, 0, width, height);
      const styles = getComputedStyle(document.documentElement); const ink = styles.getPropertyValue("--canvas-ink").trim() || "#f1f4f7"; const accent = styles.getPropertyValue("--accent").trim() || "#79f2c0";
      points.forEach((p, i) => { p.x += (p.tx - p.x) * .052; p.y += (p.ty - p.y) * .052; const n = Math.sin(Date.now() / 900 + p.phase) * .003; const x = (p.x + n) * width; const y = (p.y + n) * height; context.fillStyle = i % 13 === 0 ? accent : ink; context.globalAlpha = i % 13 === 0 ? .85 : .46; context.beginPath(); context.arc(x, y, i % 13 === 0 ? 2 : 1.25, 0, Math.PI * 2); context.fill(); });
      context.globalAlpha = .16; context.strokeStyle = ink; context.lineWidth = .7; context.beginPath(); points.forEach((p, i) => { if (i % 8 === 0) { const q = points[(i + 8) % points.length]; context.moveTo(p.x * width, p.y * height); context.lineTo(q.x * width, q.y * height); } }); context.stroke(); context.globalAlpha = 1;
    };
    gsap.ticker.add(draw); return () => { gsap.ticker.remove(draw); observer.disconnect(); };
  }, []);
  return <canvas ref={canvas} className="signal-canvas" aria-hidden="true" />;
}
