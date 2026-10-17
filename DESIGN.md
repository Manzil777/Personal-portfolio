# Design Brief

## Brief

Manzil Shrestha needs a portfolio that helps recruiters and collaborators understand his AI/data work quickly. The local-only phase prioritizes a composed homepage, readable project evidence, and an original interactive signal-field illustration. The supplied devaryan.com reference informs structural qualities only: an airy tri-column composition, restrained monochrome treatment, compact tabular index, and a center visual that changes with selection.

Stack: Next.js App Router with TypeScript, Tailwind CSS, Geist, GSAP, and Canvas. This most closely matches the reference's Next/React/Tailwind architecture while keeping the artwork light and local-first.

## Concepts Considered

| Concept | Signature | Anchor | Originality | Fit | Feasibility | Portability |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Signal field | A point cloud settles into project-specific data and scientific shapes. | Manzil builds machine-learning pipelines from embeddings, feedback, and inventory data. | 4 | 5 | 5 | 2 |
| Lab notebook | Project pages behave like numbered experimental observations and findings. | ProteinClassify and sentiment analysis are experimental ML systems. | 3 | 4 | 4 | 3 |
| Decision flow | A requirements graph routes each visitor through project, experience, and interest nodes. | His The FOOT's Nepal role involved requirements analysis and system design. | 3 | 4 | 4 | 3 |

Selected: **Signal field**. It is the strongest fit, can power the home interaction without visual noise, and is distinct from the reference's subject matter.

## Concept Card

Idea: A field of data points continually settles into the systems Manzil has built.

Metaphor: Raw data becomes a clear signal after it is sampled, classified, and interpreted.

Signature: Selecting an index entry morphs an original canvas point cloud into a project-specific signal shape.

Emotion: Precise, curious, and quietly capable.

Motion verb: Settle. Points drift with low-energy noise, then converge with a spring when a visitor changes focus.

Screenshot: A sharp, three-column dark portfolio with Manzil's name on the left, a luminous protein-ribbon point field in the center, and ProteinClassify highlighted at right.

Genericness test: A generic AI site would default to gradient cards and abstract neural-network art. This design instead makes data sampling and project-specific shapes the one repeated rule, uses an index rather than cards, and ties every visible signal to a real portfolio item.

## Art Direction System

### Palette

- `ground`: `#0b0d10`, an instrument-panel graphite.
- `ink`: `#f1f4f7`, clear measurement-paper white.
- `muted`: `#9aa5b1`, subdued annotation text.
- `line`: `#2a3038`, low-contrast structural rule.
- `accent`: `#79f2c0`, a sparing readout signal used only for active focus.
- `curtain`: `#10151b`, transition and overlay tone.

Light mode inverts ground/ink and slightly deepens the line and muted tokens for contrast.

### Typography

- Geist Sans through `next/font/google` is the single UI and display family, matching the reference's technical clarity.
- Geist Mono is reserved for indexes, dates, and compact project metadata.
- Display: `clamp(3rem, 7vw, 7rem)`, -0.055em tracking, 0.9 line-height.
- Body: 16 px to 18 px, 1.55 line-height, max 38rem.
- Metadata: 12 px to 14 px, tabular figures, no ornamental labels.

### Grid and Rhythm

- 12-column desktop grid with outer gutters `clamp(1.25rem, 4vw, 4rem)`.
- Bio aligns at columns 1-3, artwork at 4-9, index at 10-12; all content follows those three anchors.
- Mobile collapses intentionally: header, bio, artwork, index, contact.
- The home remains a single-screen poster at desktop dimensions; case studies use asymmetric narrative pairs.

### Shape and Motion

- Radius: 999 px only for pills; all other components have 0 radius.
- Ease: `cubic-bezier(0.16, 1, 0.3, 1)` with 180 ms interaction transitions and 650 ms artwork settling.
- Canvas points use low-opacity fills, with accent applied only to the selected shape's leading points.

## Composition

```text
Desktop home
┌─────────────────────────────────────────────────────────────────────┐
│                                                      [theme]        │
│ Intro/bio              Original signal field            Index tabs  │
│ Name                   project shape                    item rows   │
│ social links                                           meta         │
│                                                                     │
│ selected summary                              hint     [write me]  │
└─────────────────────────────────────────────────────────────────────┘

Mobile home
┌──────────────────────┐
│ Name        [theme]  │
│ concise bio          │
│ social links         │
│                      │
│ original artwork     │
│                      │
│ tabs                 │
│ selected index list  │
│ summary / write me   │
└──────────────────────┘
```

## Routes

- `/`: portfolio home.
- `/work/proteinclassify`, `/work/student-feedback-sentiment-analysis`, `/work/soletrack`: real-content case-study routes.
- `/about`: concise biography and skills.
- `404`: a sparse unresolved signal field with a route home.

## Content Principles

- Use real claims from the resume: 321 protein families, 1,000+ feedback entries, 88% classification accuracy, and Top 3 exhibition recognition.
- No invented clients, images, metrics, or awards.
- Keep each project title, summary, and metadata editable in `src/data/site.ts`.
- Do not publish sensitive resume fields or claim unverified project URLs.

## Accessibility and Performance

- The canvas has `aria-hidden`; selection state and summaries remain semantic HTML.
- Tabs support ArrowLeft/ArrowRight, Home, End, and activation by Enter/Space.
- Reduced motion shows a static selected shape and all text content, without smoothing or morphing.
- The signature visual must not be the LCP element and must be device-pixel-ratio capped.
- Build and test first on localhost. Deployment is explicitly out of scope until approval.
