# Personal Portfolio PRD

## Overview

Build a local-first personal portfolio for Manzil Shrestha, an AI and Data Science student. The home page should closely follow the information architecture and restrained interaction style of the supplied devaryan.com reference: introduction at left, a responsive point-field illustration in the center, and a tabbed Projects, Experience, and Life index at right. The implementation must use TypeScript.

## Problem Statement

Manzil has credible AI, data-analysis, and full-stack project work spread across several resume variants. Recruiters and collaborators need a concise, memorable way to understand that work and reach him without reading a conventional resume first.

## Goals

- Create an original, polished TypeScript portfolio that communicates Manzil's AI/data focus within three seconds.
- Match the reference's layout behavior: desktop three-column composition, mobile-first reflow, light/dark theme switch, accessible tabs, list interaction, and contact affordance.
- Create original center artwork that morphs between data/AI-related point-cloud shapes as visitors select index items.
- Derive all public content from the supplied resume material and exclude sensitive personal details.
- Make the project runnable on localhost before any deployment work.
- Include routes for project case studies and a designed 404 page.

## Non-Goals

- Copying devaryan.com's artwork, code, branding, visual assets, or text.
- Publishing or deploying the site in this phase.
- Collecting, storing, or sending user submissions through a backend.
- Including home address, date of birth, nationality, or other sensitive resume details.

## Users

- Recruiters seeking an ML, applied AI, data analyst, or software internship candidate.
- Technical collaborators evaluating projects and code.
- Peers who want a concise view of Manzil's interests and contact links.

## User Stories

- As a recruiter, I can immediately see Manzil's role, focus, projects, and contact links.
- As a visitor, I can select Projects, Experience, or Life and understand each entry from its label, summary, and responsive visual.
- As a keyboard or reduced-motion user, I can access every control and all content without relying on hover or animation.
- As Manzil, I can update visible content in one typed TypeScript data file.
- As a visitor, I can open a project page with its context, implementation details, and outcome.

## Content Sources and Scope

Use the resume files under `/home/kangura/Manzil/S/TYL/Resumes` as the source of truth.

- Identity: Manzil Shrestha, Bengaluru, India.
- Positioning: AI and Data Science student building end-to-end machine-learning systems and data products.
- Projects: ProteinClassify, Student Feedback Sentiment Analysis, SoleTrack.
- Experience: The FOOT's Nepal, Design and Requirements Analyst, Aug-Nov 2025.
- Public links: LinkedIn, GitHub, LeetCode, email, and a resume download only when the final public URL/file is confirmed.
- Life items: Basketball, football, music, exploring new places, RARE Club, and Apticode Hackathon. These are intentionally secondary.

## Requirements

### Technology

- Next.js App Router, React, and TypeScript with strict checking.
- Tailwind CSS for layout and tokens, with small global CSS where canvas and motion need it.
- `next/font` Geist for the primary UI typeface to align with the reference's technical stack.
- GSAP for transitions and micro-interactions. The particle simulation is canvas-based and uses the GSAP ticker rather than a standalone animation loop.
- `next-themes` or an equivalent hydration-safe class-based theme controller.

### Home Page

- A skip link, semantic header, main, footer, one H1, and visible keyboard focus states.
- Light/dark toggle persisted locally and respecting system preference before hydration.
- Desktop: three responsive columns for bio, illustration, and index. The visual should remain balanced from 1024 to 1920 px.
- Mobile/tablet: stacked bio, adapted canvas illustration, then tabs and an inline index. No interaction may rely on hover.
- Tabs: Projects, Experience, and Life, with keyboard navigation and ARIA tab roles.
- Desktop hover/focus or mobile selection updates the selected entry, accessible live summary, and canvas target shape.
- A mailto-based Write to me action. No server endpoint in phase one.

### Artwork System

- Original vector/path definitions authored in the codebase for each state. Do not use any reference-site artwork or assets.
- Shapes include an idle neural-signal field, a protein ribbon, a sentiment chart, a retail inventory grid, a requirements flow, and personal-interest shapes.
- Normalize paths to point sets with equal point counts, then spring-interpolate points between selected states.
- Support device-pixel ratio, resize, pointer influence, canvas fallback, and `prefers-reduced-motion` static rendering.
- Canvas is decorative only. The corresponding project title and summary remain real DOM text.

### Data and Case Studies

- Place all visible content in `src/data/site.ts` with TypeScript types.
- Create `/work/[slug]` pages for the three projects from actual resume claims only.
- Create `/not-found` in the same visual language.
- Mark any unknown project URLs or visual media as explicit placeholders rather than inventing them.

### SEO and Quality

- Page metadata, canonical placeholders, Open Graph image, Twitter metadata, Person JSON-LD, robots, sitemap, favicon, and descriptive titles.
- Respect reduced-motion and color-scheme preferences.
- No serious or critical axe accessibility violations; no horizontal overflow at 390, 768, 1024, 1440, or 1920 px.
- Production-build QA through browser screenshots, keyboard checks, and accessibility audit before handoff.

## UX Flow

1. Land on the homepage and understand the portfolio owner's name and focus.
2. Read the bio and use social/resume links.
3. Browse a tab. Desktop visitors hover or focus an item; touch visitors tap it.
4. The center signal field transitions to a distinct, original shape and the item summary is exposed.
5. Open a project to read a concise case study, then navigate to the next project or back home.
6. Use Write to me to compose an email.

## Technical Approach

```text
src/data/site.ts
  -> typed personal, project, experience, life, social data
  -> Home route and dynamic project routes

src/components/portfolio-shell.tsx
  -> responsive three-column layout and selected-item state
  -> accessible tab/index components

src/components/signal-canvas.tsx
  -> shape sampler + point-cloud renderer + GSAP ticker lifecycle

src/app/work/[slug]/page.tsx
  -> statically generated project case-study pages
```

## Edge Cases

- JavaScript unavailable: server-rendered identity, links, index labels, and project content remain readable; canvas is non-essential.
- Reduced motion: display the selected static point artwork; no cursor interpolation or animated morphing.
- Canvas/WebGL unavailable: preserve layout and selected-entry summary.
- Long project titles: truncate only in compact desktop cells and show full label elsewhere.
- Theme preference unavailable: default to dark, as in the reference.
- Unknown social URL/resume public asset: omit or label locally rather than publish broken links.

## Testing and Validation

- `npm run lint`, `npm run typecheck`, and `npm run build` must pass.
- Run the production build locally, not only the development server.
- Capture desktop, phone, keyboard-focus, and reduced-motion screenshots for home, one case study, and 404.
- Test mouse, touch-sized interaction, keyboard tab/arrow navigation, Escape where relevant, theme persistence, and mailto link behavior.
- Run axe audit and inspect visual output for clipping, theme contrast, overflow, and artwork fallback.

## Open Questions and Assumptions

- A local development URL is the only canonical URL in this phase; production domain is intentionally deferred.
- Email and social URLs will be taken from resumes where full URLs exist; placeholder markers will be used when a URL is not available.
- The artwork is original and inspired only by the interaction pattern of the reference. Exact third-party artwork/assets are excluded.
- Localhost approval does not authorize deployment; deployment needs a separate explicit confirmation.
