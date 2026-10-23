# Interactive 3D Particle Animation Engine & Portfolio Replica

A modular, high-performance 3D particle animation system extracted and reconstructed from [devaryan.com](https://devaryan.com/). It renders thousands of interactive particles with Hermite arc morphing, spring-damper cursor repulsion physics, and 3D procedural vector shapes at a locked 60 FPS.

---

## Deliverables in this Directory

| File | Description |
|---|---|
| `particle-field.js` | **Core Standalone Engine**: Unminified, dependency-free ES module containing `ParticleEngine`, shape library, vector sampling primitives, and DOM controller. |
| `ParticleField.jsx` | **React / Next.js Component**: Clean wrapper component ready for drop-in use in any React or Next.js portfolio. |
| `demo.html` | **Interactive Standalone Showcase**: Single-file demonstration with light/dark theme toggling, hover list cards, and real-time custom text morphing. |
| `server.py` | **Development Server**: Multi-threaded Python server with automatic Next.js chunk routing and asset rewrites. |

---

## 1. Quick Start

### Running the Standalone Demo
Start the dev server (or any static HTTP server):
```bash
python3 server.py 3000
```
Open your browser to:
- **Standalone Demo**: `http://localhost:3000/demo.html`
- **Reconstructed Portfolio**: `http://localhost:3000/`

---

## 2. Core Architecture & Physics (`particle-field.js`)

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
- **16-Bucket Batched Rendering**: Particles are grouped into 8 depth bands $\times$ 2 color states (ink & accent). Draw calls are batched into single path rectangles (`ctx.rect(...)`), capping canvas draw calls $\le 16$ per frame for consistent 60 FPS.

---

## 3. How to Use in Your Portfolio

### Option A: Vanilla JavaScript / HTML
Include `particle-field.js` as an ES module:

```html
<div id="particle-container" style="width: 500px; height: 500px;"></div>

<!-- Add items with data-shape attributes -->
<ul>
  <li data-shape="guitar">Guitar</li>
  <li data-shape="cricket">Cricket</li>
  <li data-shape="badminton">Badminton</li>
  <li data-shape="weekends">Weekends</li>
  <li data-shape="goal">The Goal</li>
</ul>

<script type="module">
  import { createParticleSystem } from "./particle-field.js";

  const container = document.getElementById("particle-container");
  const system = createParticleSystem(container, {
    initialShape: "MyName", // Any name or shape key
    canvasClass: "block h-full w-full"
  });

  // Programmatic morphing:
  // system.morphTo("guitar");
  // system.morphTo("Alex", true); // Sets new default shape
</script>
```

### Option B: React / Next.js
Import `ParticleField.jsx`:

```jsx
import ParticleField from "./ParticleField";

export default function PortfolioHero() {
  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      {/* 3D Particle Canvas */}
      <div className="w-full lg:w-1/2 aspect-square">
        <ParticleField initialShape="Aryan" />
      </div>

      {/* Hoverable Navigation / Portfolio Items */}
      <ul className="space-y-4">
        <li data-shape="guitar" className="cursor-pointer hover:text-red-500">
          Guitar — Music
        </li>
        <li data-shape="cricket" className="cursor-pointer hover:text-red-500">
          Cricket — Sport
        </li>
        <li data-shape="badminton" className="cursor-pointer hover:text-red-500">
          Badminton — Sport
        </li>
        <li data-shape="weekends" className="cursor-pointer hover:text-red-500">
          Weekends — Code & Treks
        </li>
        <li data-shape="goal" className="cursor-pointer hover:text-red-500">
          The Goal — Safe Vault
        </li>
      </ul>
    </div>
  );
}
```

---

## 4. Built-in Shape Library

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

## 5. Adding New Custom 3D Shapes

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
