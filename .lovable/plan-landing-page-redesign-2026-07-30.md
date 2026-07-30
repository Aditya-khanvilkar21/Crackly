# Landing Page Redesign

Modernize `/landing` only. No changes to auth, dashboard, admin, tests, or backend.

## Direction (from your picks)

- Palette: Navy Trust — deep navy `#0f1b3d` base, mid navy `#1e3a5f`, steel blue `#3b6fa0`, near-white `#e8edf3`. Orange `#FF6A00` stays reserved for the logo glow and one CTA highlight so the brand still reads.
- Typography: Outfit for headings, Figtree for body.
- Layout: split hero — copy and CTAs on the left, a visual "result preview" card on the right.
- Existing light/dark toggle keeps working; navy becomes the dark-mode base and a light navy-tinted surface for light mode.

## New page structure

1. Sticky header — logo (existing hover glow kept), theme toggle, Login, "Get Started".
2. Split hero
   - Left: eyebrow chip ("JEE • NEET • CET"), H1 "Crackly — JEE, NEET & CET", subline "Crack Your Limits, Unlock Your Future.", short supporting line, primary "Get Started" + secondary "I'm a tuition class" CTA.
   - Right: a mocked score-report card (score out of 200, subject-wise bars, accuracy ring) built with existing tokens — static presentation, no real data.
3. Stats / proof strip — 4 figures directly under the hero. Placeholders until you give real numbers: tests available, questions, exams covered, tuition classes.
4. How it works — 3 numbered steps: Sign up and get your CRACKLY ID → Join your tuition class → Take tests and track analytics.
5. Why Choose Crackly — the existing 6 features, restyled as a tighter modern grid (icon, title, one line), not the current tall cards.
6. For tuition classes — dedicated band: class branding on result PDFs, class analytics, weak-topic detection, parent reports; CTA to the signup page.
7. FAQ — 6 accordion questions (what Crackly is, exams covered, is it free, how a class joins, mock vs chapter tests, do results have my class logo).
8. Footer — logo, quote line, copyright.

The inspirational quote moves into a compact line rather than its own large section.

## SEO

- Keep `SeoHead` with the same title/description and `/landing` path.
- Add FAQPage JSON-LD for the FAQ section.
- Single H1, semantic sections, alt text and lazy loading preserved.

## Technical notes

- `src/index.css`: retheme the existing semantic tokens (`--background`, `--primary`, `--accent`, gradients, shadows) to the Navy Trust values in HSL; add Outfit + Figtree via Google Fonts in `index.html` and wire `font-heading` / body font in `tailwind.config.ts`. Because these are the shared tokens, other pages inherit the new navy accent — no per-page rewrites.
- `src/pages/Index.tsx`: rewritten for the new section order; feature data array reused.
- New presentation-only components under `src/components/landing/`: `HeroSplit`, `StatsStrip`, `HowItWorks`, `FeatureGrid`, `ForClasses`, `LandingFaq`, `LandingFooter`.
- FAQ uses the existing shadcn `accordion`. Motion via the already-installed framer-motion; existing logo glow/light-ray keyframes retained.
- Mobile-first: hero stacks to single column, stats to 2x2, features to one column.
- No hardcoded color utilities — semantic tokens only.

## Open item

Give me real stats for the proof strip when you have them; otherwise I'll use conservative, clearly generic labels rather than invented numbers.
