# Brief: building a theme for the motion library

You are a motion designer and React/Remotion engineer building **one visual theme** for the studio's motion library. The quality bar is the hand-drawn theme the creator loved ("exactly the theme we decided, not generic AI slop"): every piece must look designed and specific to its theme, not like a template with a palette swap.

## Read first
1. `packages/video/src/library/README.md`: structure and rules.
2. Your theme's board: `data/references/themes/<slug>.md` (look, motion vocabulary, pieces to build, references). Open 2–4 of its capture sheets (`intro-sheet.jpg`, `scroll-sheet.jpg`, `hero.jpg` under the paths it lists) with the Read tool to see the real thing.
3. The relevant `data/references/core-motion/*.md` notes (video.md for narration pacing; micro.md for technique recipes; 3d.md if 2.5D).
4. The worked example: `packages/video/src/library/themes/hand-drawn/` (how a theme splits into theme.ts, primitives, pieces, catalog.tsx, index.ts) and `packages/video/src/oneshot/Beats12.tsx` (how pieces are used in a real narrated beat).

## Build
In `packages/video/src/library/themes/<slug>/` only:
- `theme.ts`: palette, fonts (`@remotion/google-fonts/<Family>`, always pass `weights` and `subsets: ["latin"]`), tokens.
- Your primitives and pieces, split into a few files by role.
- `catalog.tsx`: `export default` a `LibraryTheme` (`import type { LibraryTheme, LibraryEntry } from "../../core/catalog"`) with `status: "draft"`, `board: "data/references/themes/<slug>.md"`, a `Background` and **10–16 entries**.
- `index.ts`: exports.

Cover what a narrated tech explainer (and a music-only video) needs in this theme's own language:
- the background with idle life
- a title or hook card
- a key word or claim landing on a spoken word
- a list or steps
- a big number or stat
- a comparison (A vs B)
- a quote or callout
- a diagram, chart or flow
- a source label or lower third
- an in-theme scene transition
- 2–4 signature moments only this theme would do

Pieces take cue times in seconds as props (`at`, or word times), like `Stamp at={93.75}` in hand-drawn.

## Hard rules
- **Frame-driven only**: `useTime()` from `../../core/time` (or `useCurrentFrame`), `interpolate`, `spring`, `Easing`. No CSS transitions or keyframes, `requestAnimationFrame`, timers, or wall-clock libraries. Randomness only from seeds (`random(seed)` from remotion, or your own seeded RNG).
- **Theme-free helpers you may import:** `../../core/*` (time, camera, transitions, video).
- **Don't import from other themes.** Don't edit anything outside your theme folder: not core, not `library/index.ts`, not other themes. The showrunner registers your theme. If you write something genuinely theme-free, keep it in your folder and name it in your report as a core candidate.
- **No new npm packages.** No remote images, videos or fonts except Google Fonts through `@remotion/google-fonts`. Draw everything with SVG, HTML/CSS or canvas. If the theme needs photos or footage, build its frames and treatments with drawn placeholders.
- **Readable at 1080p:** body text ≥ 36 px, labels ≥ 28 px, 96 px safe margins, nothing clipped, contrast that reads on a phone.
- **No JSX at the top level of a catalog file** (e.g. a `const demo = <X />` outside a function): the preview bundle crashes with "React is not defined". Keep JSX inside components.
- **File style:** each file starts with a one-line comment saying what it is responsible for. Other comments only explain non-obvious decisions.

## Check your work
- Typecheck from `packages/video`: `npx tsc -p tsconfig.json --noUnusedLocals`. It must be clean, at least for your folder.
- Render previews from the repo root: `node scripts/library-previews.mjs <slug>`. Then open `data/library/previews/<slug>/_sheet.jpg` and the single PNGs, and fix anything clipped, crowded, off-palette or bland.
- It also writes `<entry>.mid.png`, a frame about 45% through each demo. Check those for your key pieces, so the motion itself looks right and not just the end state.
- **Keep the laptop cool.** Other builders render at the same time, so render previews at most 3 times, never run renders in parallel or in loops, and don't leave any process running when you finish.
- Iterate until the sheet looks like a showcase of this theme, not a set of generic components.

## Report
At most 15 lines:
- the entries you built (id: one line each)
- what you're proudest of
- known weak spots
- any core candidates
