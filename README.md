# Interactive 3D Particle Animation Engine & Portfolio Replica

A modular, high-performance 3D particle animation personal website. It renders thousands of interactive particles with Hermite arc morphing, spring-damper cursor repulsion physics, and 3D procedural vector shapes at a locked 60 FPS.

---

## Deliverables in this Directory

| File | Description |
|---|---|
| `particle-field.js` | **Core Standalone Engine**: Unminified, dependency-free ES module containing `ParticleEngine`, shape library, vector sampling primitives, and DOM controller. |
| `ParticleField.jsx` | **React / Next.js Component**: Clean wrapper component ready for drop-in use in any React or Next.js portfolio. |
| `demo.html` | **Interactive Standalone Showcase**: Single-file demonstration with light/dark theme toggling, hover list cards, and real-time custom text morphing. |
| `server.py` | **Development Server**: Multi-threaded Python server with automatic Next.js chunk routing and asset rewrites. |

## 1. Core Architecture & Physics (`particle-field.js`)

The engine is built around high-performance WebGL-grade data structures using Canvas 2D:

### Memory & Typed Arrays
- `Float32Array(3 * n)` buffers for `from`, `to`, `cur`, and `animOff` coordinates `[x, y, z]`.
- `Float32Array(2 * n)` buffers for `push` and `pushV` 2D spring-damper cursor repulsion.
- `Uint8Array(n)` for `accent` color flags (0 = ink/white, 1 = accent/red).
- `Int32Array(n)` for inverse mapping indices.
- Default particle density: `4,800` (desktop) / `2,600` (mobile `< 1024px`).

### Interpolation & Trajectory Physics
- **Fisher-Yates Shuffle on Morph**: Particles disperse organically rather than sliding along linear paths.
- **Staggered Delays**: Per-particle randomized delay `delay[i] = 0.35 * Math.random()`.
- **Hermite Smoothstep Easing**: $h = r^2 \cdot (3 - 2r)$, where $r = \text{clamp}((t - \text{delay}) / 0.65)$.
- **3D Arc Trajectory**: Curved lateral offset `arc = 0.32 * Math.sin(Math.PI * r)` applied across lateral coordinates.

### Perspective Projection & Pointer Physics
- **3D Rotation**: Yaw continuous spin or sinusoidal sway $\text{yaw} = 0.55 \cdot \sin(\text{phase})$ + mouse lean pitch/yaw damping.
- **Perspective Scale**: $\text{proj} = \frac{2.6}{2.6 + z}$.
- **Spring-Damper Repulsion**: Acceleration $a = (F_{\text{target}} - x) \cdot 60 - 11 \cdot v$.

## 2. Built-in Shape Library

The following shapes are bundled in `ShapeLibrary`:

| Key | Description |
|---|---|
| `guitar` | 3D acoustic guitar soundboard, rosette sound hole, bridge, fretboard, and 6 vibrating strings |
| `cricket` | 3D cricket bat with grip, crease lines, 3 wickets/stumps with bails, and red ball in flight |
| `badminton` | Oval racket with grid cross-strings, handle shaft, and angled shuttlecock with red cork |
| `weekends` | Open laptop keyboard and screen displaying code lines backed by mountain peaks |
| `goal` | 3D bank safe / vault door with 4-spoke turning dial and side locking bolts |
| `bonfire` | Campfire radial logs with flickering flame cone particles |
| `zuno` | Browser window frame with address bar, tabs, and window dots |
| `resume` | Document sheet with folded corner and content lines |
| `github` | GitHub Octocat logo SVG vector paths |
| `linkedin` | LinkedIn logo SVG vector paths |
| `x` | X (Twitter) cross logo SVG vector paths |
| `<custom>` | Any string passed to `morphTo(text)` dynamically generates dot text using the built-in canvas rasterizer |

---

## 3. Adding New Custom 3D Shapes

You can create new procedural shapes using the exported sampling primitives in `particle-field.js`:

```javascript
import { buildShape, sampleLine, samplePolyline, sampleArc, samplePolygonInterior } from "./particle-field.js";

function myCustomShape(particleCount) {
  return buildShape(particleCount, "sway", (addPoint) => {
    // 1. Line sampling
    sampleLine(addPoint, [0, 0, 0], [1, 1, 0], 50, 0.01, /* isAccent */ false);

    // 2. 3D Arc / Ring sampling
    sampleArc(addPoint, [0, 0, 0], 0.4, 60, [1, 0, 0], [0, 1, 0], /* isAccent */ true);

    // 3. Polyline sampling
    samplePolyline(addPoint, [[-0.5, -0.5, 0], [0.5, -0.5, 0], [0, 0.5, 0]], 40, 0.01, false, true);

    // 4. Solid polygon interior sampling (Ray-casting point-in-polygon)
    samplePolygonInterior(addPoint, [[-0.4, -0.4], [0.4, -0.4], [0, 0.4]], 100, /* z */ 0);
  });
}
```
