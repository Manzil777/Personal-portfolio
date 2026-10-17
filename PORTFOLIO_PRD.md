# PORTFOLIO_PRD — Dot-field portfolio (Manzil)

Pixel-faithful recreation of the reference portfolio page (devaryan.com), rebuilt with Manzil's own
content and original dot artwork. Reference provided as a screen recording + rendered HTML; where
visuals/motion are unclear the recording wins, where structure/class names are unclear the HTML wins.

## Stack

- Next.js (App Router, TypeScript), Tailwind CSS v4, Geist Sans via `next/font/google`.
- No UI libraries. Particle engine is hand-written Canvas 2D (no Three.js).
- Design tokens as CSS variables mapped into Tailwind: `bg`, `fg`, `muted`, `line`, `accent` (red),
  plus `dot` for particle ink.

## Layout

### Desktop (>=1024px)

- Wrapper: `relative mx-auto flex min-h-dvh max-w-[1920px] flex-col`, `px-16 py-6` (`px-5` mobile, `px-10` at sm).
- `main`: 3-column grid `minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr)`, `gap-10`, vertically centred.
- Left column (`max-w-sm`): muted "Hi, I'm"; huge semibold tight-tracking name with trailing period
  (`text-4xl sm:text-6xl lg:text-7xl`); two muted paragraphs (second hidden below `lg`); a row of
  underlined links with a muted `↗` (`border-b border-line`, hover `border-fg`), new tab + `rel noopener noreferrer`.
- Centre column: empty square (`aria-hidden`) defining where particle shapes draw — `h-72`, `sm:h-96`,
  `lg:aspect-square`, `max-w-[min(48rem,calc(100dvh-13rem))]`.
- Right column (`max-w-md`, right aligned): tab list with bottom border; tabs `text-sm` with tiny
  superscript count (10px, tabular-nums, muted); active tab has fg bottom border (`-mb-px`), inactive
  muted and brightens on hover.
- Header: circular 36px theme-toggle (sun icon, `border-line`, muted) at top right.
- Footer: "Write to me" pill bottom right (`rounded-full border-line bg-bg px-4 py-2 text-sm shadow-sm
  hover:border-fg`) and a centred muted tagline (`text-sm`, hidden below `lg`).

### Mobile

Single column; shape area between intro and lists; list rows are a 2-column grid showing only number
and title; no tagline.

## Lists

- All three tab panels stacked in the same grid cell (`[grid-area:1/1]`); inactive panels `invisible` + `inert`.
- Row: index `01` (`w-6`, xs, tabular-nums, muted), title, right-aligned muted xs detail (`lg` only);
  `border-b border-line`, `py-3` on lg; hover mutes the text.
- Projects rows are external links; the other two tabs' rows are buttons.
- Every row carries `data-shape="group:key"` (+ optional `data-summary`, `data-title`). Hover previews
  the shape; click/tap "pins" it (`data-pinned` on the row, title turns accent) until clicked again or
  another row is pinned. Switching tabs resets to the rest shape.
- GitHub, LinkedIn, LeetCode, Résumé and "Write to me" also have their own shapes.

## Tagline

Default line + hint ("Point at anything on the right to see it drawn in dots."). While a row with a
summary is hovered, show that summary instead. Fade/slide in on change (`aria-live="polite"`).

## Particle field

- One canvas, DPR-aware, `ResizeObserver`-driven, drawn into the centre square. ~3,000–5,000 small
  round white/grey dots; ~10–15% use the red accent for one focal detail per shape.
- Shapes live in a registry keyed by the `data-shape` string. Each returns target points
  (x, y, optional z, colour flag). Built from authored polyline/arc/curve primitives (sampled along
  length), or by sampling an image's pixels (offscreen canvas) for the portrait.
- A couple are 3D wireframes with slow rotation + perspective projection.
- Morph: particles break into a turbulent cloud, then settle into the next shape with spring easing
  (~600–900 ms), plus idle drift and a pointer repel radius.
- Rest shape: portrait image sampled to dots (`/portrait.webp`); fallback: procedural neural-network graph.
- Pause when tab hidden; honour `prefers-reduced-motion` (static dots, instant swaps).

## Theme

Dark by default; light variant; toggle persisted in `localStorage` with `system` support, applied by an
inline head script before paint (no flash).

## Write to me

Pressing the pill (`aria-expanded`) opens a small popover above it: name, email, message → prefilled
`mailto:` to Manzil's email. Esc and outside-click close.

## Extras

Custom 404 with the `broken-link` shape and a "Back home" link. Metadata: title, description, canonical,
Open Graph + Twitter cards, favicon set, JSON-LD `Person`. No analytics scripts.

## Content (Manzil)

- **Name:** Manzil. **Heading:** "Hi, I'm / Manzil."
- **Bio:** AI & Data Science student; ML meets engineering — pipelines, deployment, the mechanics that
  keep a model alive after the notebook closes. / Third year at CMRIT; Python, MLOps tooling, small experiments.
- **Links:** GitHub, LinkedIn, LeetCode, Résumé `/resume.pdf`.
- **Projects (6):** 01 AI-FORGE (multi-modal digital forensic investigation platform) · ProteinClassify ·
  Student Feedback Sentiment Analysis · SoleTrack · Weather Forecasting (LSTM) · Human Following Robot.
- **Tab 2 "Education":** CMRIT (AI & Data Science, 3rd year) + St. Xavier (Science, 12th).
- **Life (6):** Basketball, Football, Music, New places, RARE Club, Apticode Hackathon — no summaries.
- **Default tagline:** one friendly line about what I'll happily talk about.
- One dot-art metaphor per row: line-art silhouette plus one red detail, registered under its `data-shape` key.

## Hard constraints

Do not reuse the original author's name, copy, artwork, or any of their image files, and do not hotlink
their domain. Every shape is generated here. Structure, behaviour and styling are replicated only.

## Acceptance checklist

Lighthouse a11y 95+, no layout shift on tab change, keyboard-operable tabs (arrow keys) and rows,
smooth 60fps morphs on a mid laptop, works at 375 / 768 / 1440px, no console errors.
