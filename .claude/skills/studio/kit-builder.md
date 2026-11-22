# Kit builder: one scene template per run

You build ONE template for the studio's kit: a reusable, data-driven scene that a planner can drop into any video's timeline by writing props. You are building a product that will be used in hundreds of segments, so the bar is "a motion designer would put this in a showreel", and it must behave the same on every render.

Tools: read files with Read, Glob and Grep (never `cat`/`cd` in Bash). Bash runs only `pnpm --filter @clipforge/video typecheck`, `node scripts/kit-preview.mjs …`, `node scripts/motion-qa.mjs …` and `ls`, exactly as written, from the repo root; anything else is blocked.

## Read first, in this order
1. Your brief: `data/library/kit/briefs/<id>.md` (purpose, direction, props sketch, credit).
2. `packages/video/src/kit/contract.ts`: the contract. Follow it exactly.
3. `packages/video/src/kit/motion.tsx`: `useT`, `enter`, `cueAt`, `MediaFill`. Use them.
4. `packages/video/src/kit/templates/footage-reveal.tsx`: the worked example of structure, schema, cues and style use.
5. `packages/video/src/library/DIRECTION.md`: camera and pacing rules.
6. If `data/library/kit/refs/<id>.jpg` exists, it is a contact sheet of the reference motion: study it.
7. For inspiration only, the library themes in `packages/video/src/library/themes/`: look at one or two relevant catalog files if useful. Don't import from them; the kit must stay theme-free.

## Build
- File: `packages/video/src/kit/templates/<id>.tsx`, default export `defineTemplate({...})`. First line: a one-line comment saying what it is.
- Register it: add one import and one entry to `KIT` in `packages/video/src/kit/index.ts`. Touch nothing else in other templates.
- **Data in, video out.** Every word, number, label and list on screen comes from props. Strings get `.max()` lengths that fit at the template's sizes; arrays get `.max()` counts. Describe every field with `.describe()`: that text is all the planner sees.
- **Style tokens only.** Colours, fonts, radius and motion temperament come from `style`. No hex colours or font names in the template. The template must look right in all four presets (`studio`, `hand-drawn`, `night`, `film`).
- **Canvas from props.** Lay out from `width` and `height`. If you list `"split"` in `layouts`, it must look designed at 1000×1080 too, not squashed.
- **Time.** Fill `duration` exactly; land beats on spoken words through `cueAt(cues, props.xWord, fallback)` with fallbacks spread proportionally over the duration; be fully settled and readable for the last 0.6 s. Animations are pure functions of the frame (`useT`, `enter`, `interpolate`, `spring`): no CSS transitions, no timers, no `Math.random()` (seed it).
- **Motion that reads on video:** one focal action at a time, anticipation and follow-through, eased or sprung. Hand temperament may boil lines, but only on lines, never the whole frame. **No constant whole-frame motion** (shake, wobble, drifting everything): the motion check flags 2 s of it as red.
- **Media is material.** Templates that take footage mask it, move it, grade it toward the style and put graphics on it. A clip in a plain box is not acceptable.
- Size text for 1080p video watched on a phone: body ≥ 40 px, labels ≥ 30 px, nothing under 26 px.
- Give the example realistic content (dev, DSA, system design or storytelling topics) and `exampleCues` that exercise every cue prop.

## Verify (you must, before finishing)
1. `pnpm --filter @clipforge/video typecheck` → clean.
2. `node scripts/kit-preview.mjs <id>` → read the printed motion check and look at `data/library/kit/previews/<id>.jpg`.
3. `node scripts/kit-preview.mjs <id> --style night` and `--style hand-drawn` → look at both sheets. If it lists "split": also `--split`.
4. Fix every red flag, anything clipped, overlapping, unreadable or empty, and anything that looks templated or cheap. At most 4 preview rounds in total; then stop and report what's left.

## Report
Write `data/library/kit/reports/<id>.md`: what it does in two lines, the props, the motion check result per preview, what you'd improve next. Then end the run with one sentence. Don't edit any other file, don't commit, don't start other templates.
