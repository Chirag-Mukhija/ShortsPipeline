# Motion library

**Mandatory reading: [DIRECTION.md](DIRECTION.md)** (cinematography rules that sit above every theme; themes are skins).

Reusable motion graphics for the studio's videos, organised **by visual theme**. It grows with every video: each video reuses what fits perfectly, adds new pieces where nothing fits, and the creator promotes the good ones after the rough cut. Nothing here is a template a video is forced into.

```
library/
  core/                 theme-free: canvas size, timing, camera, transitions, catalog types
  themes/<slug>/        one visual language each, with its own fresh code
    theme.ts            palette, fonts, tokens
    *.tsx               primitives, doodles/icons, pieces
    catalog.tsx         one entry + demo per reusable item
    index.ts            exports
  index.ts              THEMES: every theme that has a catalog
  entry.tsx             gallery: one Remotion composition per entry (<theme>--<entry>)
```

## Rules
1. **Frame-driven only.** Every animation is a pure function of the frame (`useTime()` from `core/time`, `interpolate`, `spring`, `Easing`). No CSS transitions or keyframes, `requestAnimationFrame`, timers, or GSAP running on wall time: they don't render.
2. **Deterministic.** Randomness comes from seeds (`rng(seed)` in hand-drawn, or Remotion's `random(seed)`), never `Math.random()`.
3. **Themes don't borrow from each other.** A new theme gets fresh code, even for a similar idea. Only `core/` is shared. If something in a theme turns out to be genuinely theme-free, move it to `core/` with a catalog entry there.
4. **Pieces take their cue times as props** (seconds from the narration's word timings, e.g. `at={93.75}`), so a scene file is just layout plus times.
5. **Every reusable item gets a catalog entry** with `useFor`, `api`, `origin` and a demo that reads on its own in a still.
6. **One line at the top of each file says what it's for.** Other comments only explain non-obvious decisions.

## Using it in a video
Import from `library/core` and one theme, e.g. `import { Chain, Hand, wr } from "../library/themes/hand-drawn"`. `src/oneshot/Beats12.tsx` (video 001, Beats 1–2) is the worked example and the quality benchmark.

## Adding a theme
1. Start from its reference board in `data/references/themes/<slug>.md` (look, motion vocabulary, pieces to build).
2. Create `themes/<slug>/` with `theme.ts`, the pieces, `catalog.tsx` (`status: "draft"`) and `index.ts`.
3. Register it in `library/index.ts`.
4. Run `node scripts/library-previews.mjs <slug>` and look at `data/library/previews/<slug>/_sheet.jpg`. Fix anything clipped, crowded or unreadable.
5. A theme becomes `ready` once a real video used it and the creator approved the rough cut.

## Promoting new pieces after a video
After the rough-cut gate, the creator ticks which new pieces were good. For each one, the animator moves it into its theme folder, replaces hard-coded text and times with props, adds a catalog entry with a demo, and re-renders the theme's previews.

## Previews
`node scripts/library-previews.mjs [theme]` renders the last frame of every entry to `data/library/previews/<theme>/<entry>.png`, plus `_sheet.jpg` per theme. `npx remotion studio src/library/entry.tsx` (from `packages/video`) plays them all.
