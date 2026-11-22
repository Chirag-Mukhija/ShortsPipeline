# Direction: the cinematography rulebook

Binding for every motion designer. Read it before building any beat. **Themes are skins** (palette, type, objects, pieces). **Direction is cinematography**: what the camera does, how shots connect, what the background is doing, how text arrives, how the cut follows the voice or the music. Direction sits above themes. If a theme piece breaks a rule here, change the piece's use, not the rule.

Frame-driven only (see README rules). 30 fps, 1920x1080 (vertical 1080x1920). Seeded randomness only.

## 1. The one idea

A slide is a list of things placed on a page. A video is **one world with a camera, where things happen to the subject**. A slide is only a layout.

Ask three questions of every beat before touching a theme piece:
1. **Where is the camera, and at what shot size?** (not "which card goes here")
2. **What is the subject doing now, and what did it do one beat ago?** (a noun and a verb, not a layout)
3. **What is moving that is not the content?** (background life, camera drift, light)

A beat is: `shot` (size, move, focus) + `subject` + `action` + `surface` + `text` (<= 8 words, one level) + `transition-in`, drawn in the theme's skin.

### Anti-slide laws (violation -> fix)

| # | Violation | Fix |
|---|---|---|
| 1 | Beat is a themed card (title, stat, three tiles, quote) on a flat or looped background | Beat is a subject doing something in a world. A stat is a number sitting ON an object (battery, price tag, screen), counted up, passed by the camera |
| 2 | Scenes are separate sequences joined by crossfade or blur-fade | The camera or world moves between scenes (push-through, pull-back, whip, match cut, mask), or an object carries the change. At most one plain fade per video, only at a chapter break |
| 3 | Three text levels (eyebrow + title + body) | Max two: one big line/number plus one world label. A tiny metadata pill is allowed, never alongside a body line |
| 4 | Lists as rows that fade in one by one | Each item is a distinct visual event: word swap in one sentence, object A->B, cards dealt, items placed and the camera glides item to item |
| 5 | Slow Ken Burns zoom on every still | Constant slow zoom is only the base drift (1-4 %/s). The shot must also change size on beats, or hold while something happens |
| 6 | Same motion on every beat | Vary the camera action (section 2 variety rules) |
| 7 | Flat colour or gentle gradient with a card popping over it | >= 2 surface layers plus a life layer (section 4) |
| 8 | All text identical: centred, same size, same entrance, same case | Sentence case, three sizes, rotated entry doors, one emphasis form; consecutive beats differ in size, entry direction and position |
| 9 | Glow/shadow soup on titles, glass cards over busy backgrounds | Clean title + thin shadow; glow only on objects; text pocket behind text |
| 10 | Component look: rounded card + icon + 2 lines | Topic objects with material and depth at 25-35 % of frame height, text beside them |
| 11 | Real material shrunk into a tile | Real material is the main picture (>= 80-90 % of frame); the camera moves inside it |
| 12 | Opener skeleton: hook, feature, feature, promise, logo, CTA | Pick a concept, write a structural fingerprint, never reuse a skeleton |
| 13 | Ending on a centred quote or CTA card | End on an action (object lands, pull-back reveals the world, door shuts). CTA card only when the brief asks |
| 14 | Same transition at every cut | >= 2 kinds per video, >= 1 with depth, derived from content where possible |
| 15 | Text or stat appears before the object it is about | Order: sentence, main object, detail. Text arrives after the camera has arrived |
| 16 | Hold where nothing happens while narration goes on | Every hold has an event (object acts, line draws, number counts, particles drift, slow sine push). Stillness is fine when the picture itself moves or the viewer is reading |

### Four frame tests (run on every still)
1. Could this frame be a corporate slide unchanged? If yes, fail.
2. Does the eye know where to go in 0.2 s? If not, remove elements.
3. Hide all text: is the background interesting but calm? Both must be yes.
4. Is something moving because of the camera, not only because an element animates itself? Required at every transition.

## 2. Shot grammar

### 2.1 Shot sizes
Named by how much of the frame the focus target fills, so a shot list can say them.

| Name | Target fills | Use |
|---|---|---|
| `wide` | whole composition, target < 30 % | establishing, overview, pull-back reveals, comparisons seen together |
| `mcu` (medium close-up) | ~1/3 - 1/2 of frame, some context | default working size: the thing explained plus its surroundings |
| `cu` (close-up) | 60-90 % | emphasis, an action, a small readable detail, a key number |
| `xcu` (extreme close-up) | detail fills frame, texture visible | punch, reveal, match-cut seed |

`scale = min(W*fill/w, H*fill/h)`, focus = target centre. Presets: mcu .45, cu .75, xcu .9. Raster assets must be >= scale x display size. The camera never exposes the world edge (overscan the world, clamp translation). One scale system per wrapper: shot keys and drift live in the same rig, never two competing scale tweens.

### 2.2 Camera moves

| Move | When | Numbers |
|---|---|---|
| hold | reading; the subject itself moves; after a joke | as long as the voice needs; always with base drift |
| push (settle-in) | take the eye to the next detail | 0.6-1.5 s, sine in-out, usually +10-40 % scale; far moves up to 2 s |
| glide | travel item to item in one world | 0.5-0.9 s sine in-out; following a line 1.3-1.8 s |
| pull-back / reveal | overview, "where is it", section close, ending | 0.8-2 s, fast start, long tail |
| fast push (accent) | a reveal, reversal, the one key number | 0.25-0.35 s, +18-32 %, then hold |
| whip | attention jump, comedy | 0.26-0.30 s, directional blur, 120-200 px |
| slam | big word, number or stamp landing | 0.17 s, scale 1.55 -> 0.94 -> 1.0, once per shot |
| hard cut | change shot size without a move; reaction | 0 frames |
| base drift (always on) | keep holds alive | +-4-5 % scale breathing on sine over 6-10 s, +-4 px; never a substitute for size changes |

### 2.3 Variety rules
- Not 3 pushes in a row. Same camera action in 3 consecutive shots is a flag (hold and glide excluded).
- Fast moves (fast push, slam, whip) <= 1/3 of shots. Push-ins < 8 per minute.
- **Every push has a "back"**: a pull, a glide, or a hard cut to another size.
- Consecutive shots of the same size read flat: alternate wide / mcu / cu. Never flip near and far faster than the viewer can read (~1.5 s).
- Holds are fine when something happens inside them or the viewer is reading.
- Full-bleed footage: push at most 1-2 times per image, only when unreadable at full view; keep related pieces in ONE world so the camera alternates push and glide.

### 2.4 One idea per shot, attention order, timing
- **One idea per shot**: one statement, <= 5-6 words if text, one primary object, one event. A claim needing more is split into two shots or turned into a visual.
- **Attention order**: (1) sentence, (2) main object, (3) detail. Text arrives >= 0.1 s after the camera move ends, never mid-move.
- **Picture early, never late**: visuals land 0-1 frame (up to 3-6 frames in narration mode, see 6) before the word; sound lagging the picture is noticed, picture leading slightly is not.
- Camera arrives, then the thing happens: a push finishes before the number counts.
- Enter slow-firm (0.7-1.3 s, ease-out quart/expo), exit fast (0.35-0.55 s, ease-in). The viewer's eye has left before the exit starts.
- Alternate dark and light chapters when the mood changes.

### 2.5 Camera by beat type

Hook: born in `cu`/`xcu`, pull back. Explanation: `mcu` hold, push on the named detail, glide on. Comparison: one world, glide A -> B, both in the wide at the end. Number: `cu` on the carrying object. Process: glide along the path, pull back to the whole. Reveal: pull-back or rack focus. Closing: slow push or pull-back, end on an action.

## 3. Transitions

A transition is **motivated by content or camera**, never decoration. The reveal frame (where the new scene becomes visible) lands on a beat or spoken word: `start = beat - revealPoint * dur` (perceived arrival of an ease-in-out is ~p 0.58). Cut at breaths and topic changes, never mid-sentence. Most in-chapter changes are overlap or a hard cut on the beat; do not put a transition on every cut.

**Per video: at least 2 kinds, at least 1 with depth, flat wipes <= 2, at most one plain fade (chapter break only).**

| Transition | What it is | Time |
|---|---|---|
| Mask grown from a point in A | Circle/shape mask grows from a motivated origin in scene A (curve end, icon, logo hole) | 0.5-0.9 s |
| Match cut | Same shape in A and B at same position and scale, new surroundings; hard cut on the beat | 0 |
| Push-through (depth) | Perspective layers, camera dives into a point, swap under cover; one per video, motivated | 0.5 in / 0.95 out |
| Pull-back into an object | Subject shrinks to the middle while the new environment assembles around it | 1.0-1.5 s |
| Stamp slam | New card or stamp slams on the beat, covers the old scene, impact shake | 0.17 s |
| Exit/entry overlap | Old elements exit fast while new enter; camera keeps drifting. Default in-chapter change | 0.3-0.4 s |
| Colour-field chapter flash | Palette field wipes in and STAYS as next background; <= 2 per video | 0.2-0.3 s |
| Light sweep | Top-layer blurred radial, `screen` blend, covers 40-60 % not 100 % | 0.7-1.2 s |

Also available: card from depth, whip, rack focus, panel bloom (UI), hand wipe, and the theme's own physical transition (paper turn, tape) once. Build notes: both scenes stay mounted during the overlap; camera motion is by time only, the transition only composites two shots. Mount directional-blur filters only while the move is active (a filter on a static element re-rasterises).

## 4. Surfaces

Every beat has a **surface stack**: >= 2 layers plus one life layer that is not the content. Never one flat colour, never pure black or white. Colours come from the theme palette.

Back to front:
1. **Base**: gradient (horizon glow, duotone diagonal, spotlight + tint, light mesh, layered sky).
2. **Life layer**: exactly one language per segment, different from the previous video: tint/light drift | moving gradient (8-15 s) | 2-4 blurred blobs (+-60 px) | live grain | one light sweep | big rotating shape (20-40 s/turn) | rising particles (<= 40 bright elements) | breathing grid | ghost text | photo with 2-layer parallax | stepped colour fields (triggered).
3. **Texture/grain**: deterministic, opacity .08-.3.
4. **Content**: the world, inside the camera rig.
5. **Atmosphere in front of the lens, OUTSIDE the rig**: light leak, vignette (.3-.4 light, .5-.6 dark), grain, dust. These do not zoom with the camera.

Rules:
- **Changes need a visible trigger.** A background change is caused by something on screen (a push, a stamp, a chapter marker), never a silent drift to a new colour.
- **Text pocket**: behind text, luminance <= 25 % (light text) or >= 80 % (dark text), never busy mid-grey. Quick test: grayscale the frame; no background area as bright as the letters.
- Depth: soft wide contact shadows (not borders); non-focus layers `blur(2-6px)`; parallax speeds 0.05 / 0.3 / 0.65 / 1.0 / 1.5.
- Grain deterministic (offset from `floor(t*12)`); check banding in the encoded file.
- A full-bleed accent field flash is a valid chapter marker.

## 5. Text in motion

- **Case and weight**: sentence case, weight 500-600. ALL CAPS only for one emphasis beat per video. No automatic period on titles and claims; `?` for real questions; decide punctuation once per video.
- **Size ladder (1080p)**: sm 74 / md 92 / lg 112-128 / xl 150. Floors: body >= 36 (44 on vertical), label >= 28 (34 vertical), margin 96 px.
- **<= 2 text levels** per beat. **<= 8 words on screen per shot** (headline).
- **One emphasis form per video** (`none` is valid): pill (block grows from left) | underline draws | marker (tilted highlighter) | box | colour only | strike then replacement. It draws 0.4-0.6 s after the words have landed.
- **Entry doors** (rotate, never the same door twice running): up, down, left, right, from depth, mask reveal, per word, typed. Entry slow, exit fast.
  - up 0.8 s quart ease-out; per-word stagger 0.07-0.12 s; slam spring ~8 % overshoot ~0.35 s; pop 0.30-0.42 s; exit 0.18-0.4 s ease-in.
- **Readable holds**: `1.5 s + 0.3 s/word` (`holdFor()` in `core/beat.tsx`); at least 13 characters/s; a 2-word headline >= 0.5 s. Type is still after it lands: motion lives in the camera, the beat pulse and page changes, not in letters being read.
- **Numbers sit on objects.** Tabular figures with a fixed min-width; count settles on the spoken word (count start = word time - count duration); hold >= 0.5 s after landing, a punchline >= 0.9 s.
- **Placement**: text beside its object, diegetic labels where possible, tiny metadata pill in one corner. Vertical: nothing important in the top ~8 % or bottom ~15 %.
- **Captions** (narrated): word-timed pill from `narration.json`, 2-6 word chunks, English only.

## 6. Rhythm

Never mix clocks in one beat: either "reveal at word" or "reveal at beat".

| Mode | Clock | Rules |
|---|---|---|
| Narration | word timings in `narration.json` | **Land 3-6 frames before the word** so the picture is settling when it is spoken (never after). Cue by word, not seconds: `cueWord(word, nth, offset)`; re-recorded narration re-resolves cues. Cuts at breaths and topic changes. A visual event at least every ~3 s of narration, no gap without an event > 15 s. One state change per sentence. |
| Music | BPM beat grid + energy arc | Cuts, pulses and camera moves on beats; reveals on downbeats. Energy arc: intro .25 / build .55 / peak 1 / breathe .35 / out .15. Acceleration by shorter segments, not faster tempo. Hard attack between segments (no crossfade); camera impact (1.03 -> 1.0 over ~20 frames) on the hit. Persistent alive signal: +1.2 % scale on quarter notes, `e^(-25t)` decay. |

Pacing per format: **explainer** hook spike in 0-15 s, calm context, escalate per section, a mid reset, shots 3-8 s. **Opener** 1-3 s per beat, peak near 55-65 %. **Music-only** shots follow the energy arc, segments shorten through the build. **Story/doc** holds 3-7 s, hard cuts on reactions. **Vertical** hook in 1-2 s, 1-2 s shots, CTA in the last 3-4 s.

## 7. Formats

Everything in 1-6 applies to all. What changes:

- **Explainer**: a persistent stage or subject; chapters are colour or world changes; one grammar per chapter (mechanism, desk of real material, chart, kinetic list), max two per video.
- **Opener / promo (5-40 s)**: pick one concept (three candidates, one premise sentence each) and write its structural fingerprint (`concept - scene count - main object per scene - opening - closing`). One sentence <= 5 words and at most one main object per scene. One special moment (the priciest effect, once). Transitions carried by objects; loops allowed for idents.
- **Music-only**: no voice, so visuals and text carry everything and must be curated, never filler. Time is the beat grid. Text cards hold `1.5 s + 0.3 s/word`, max 12 words. Camera by song section: verse slow, chorus accents on downbeats (<= 1/3), interlude pull-back. Alive backgrounds are content (parallax, particles, rotating shapes). No captions; labels diegetic. See `.claude/skills/studio/music-only.md`.
- **Story / documentary**: real material is the main picture; a desk world where the camera glides between items; evidence stacking (each phrase adds an element, max 5); holds 3-7 s; every named entity shown from own, free or official sources, generated images labelled "illustration", never real faces; charts draw themselves with a source line.
- **Tutorial / UI walkthrough**: UI is assembled and used, not a screenshot. The camera follows interaction: approach 0.3-0.5 s before the cursor (scale 1.4-2.2), click reads, pull back to the result; 1-3 key clicks per act get a zoom. Recordings full-bleed (>= 80 % width), 1-2 pushes per image. Caption only what narration doesn't say.
- **Vertical short (1080x1920)**: safe areas (top ~8 %, bottom ~15 %), background full-bleed, content in a safe wrapper. Text >= 44 body / 34 label, headline 100+. Hook in 1-2 s (stamp, object mid-motion, face plus gesture), shots 1.2-2 s, captions pill at ~80-85 % height, last 3-4 s CTA/handle. One concrete example carries the piece.

## 8. Workflow (decided by the creator, 2026-11-16)

Order at the edit stage:

1. **Style brief per video** (short, shown to the creator before any beat is built): theme skin, accent colour, surface recipe, life language, emphasis form, transition set (>= 2 kinds, >= 1 depth), camera temperament (calm / measured / energetic, accent budget <= 1/3), plus the one special moment. Be distinct from the previous video in >= 3 of: palette, font, life language, signature motion.
2. **Shot list per beat.** One row per shot: `subject (noun) | action (verb) | shot size | camera move | on-screen text (<= 8 words) | transition out`. Subject must be a real object (not "title", "card", "background"); action must be a verb that changes something (not "appears", "fades in"). First 3 s is a concrete small scene, not a title; shots 2-6 s (8 max with reason); text-led shots <= 30 %; end on an action.
3. **Storyboard animatic first.** The shot list is rendered as a cheap storyboard animatic over the narration (boxes, labels, camera moves, timing) which the creator watches and edits on the Edit page BEFORE any designer builds graphics. The creator finds tables hard to read; the animatic is the middle ground. Designers build only what the creator approved.
4. **One hero frame first**, then the rest. Render the beat's peak as one still, judge it with the four frame tests, then animate. For a new look show three hero frames with different compositions (not recolours).
5. **Automated QA gates on stills** (3 per beat: camera arrived, mid-hold, before exit; results in `edit/qa.md`):

RED (blocks the beat): blank or near-black frame (< 0.2 % edge pixels mid-video); unreadable text contrast (WCAG >= 4.5, >= 3 for >= 64 px, pocket rule); nothing moving across a shot (> 3 s, no declared hold); more than ~8 words on screen; clipped or overlapping text; world edge exposed.

YELLOW (reported to the creator only): flat background; too many push-ins (> 8/min or 3 in a row); colour monotony across beats; low fast-motion share (< 0.06 of frames).

RED blocks the beat until fixed, **max 3 rounds**, then escalate to the creator with the still. YELLOW is never auto-fixed or hidden; it goes in the report. Validate each gate once with a deliberately failing sample.

Other rules: a reference video gives rhythm, not skin (never palette, font, layout, copy). No unrequested gags. After re-recording, rebuild cues from `narration.json`.

## 9. Core primitives (being built; check `core/index.ts` for what exists)

Direction is written ahead of the code. If a primitive is missing, build the effect from what exists and flag it; do not fall back to a slide. Today `core/` has time, video size, `camAt`, `blurOut/blurIn`, the beat clock and `holdFor`.

Official `@remotion/motion-blur`, `@remotion/noise`, `@remotion/shapes` and `@remotion/paths` are allowed in **core only, never in themes**.

- `Camera` rig: world wrapper driven by shots (size, target, move); base drift, edge clamp; `frameOn(rect, fill)` resolves target and size to scale and focus (`wide` / `mcu` / `cu` / `xcu`).
- `Hud`: layer outside the rig for labels, captions, UI that must not zoom.
- `Surface`: layered background from tokens + recipe + life language; grain, vignette, light leak, dust, particles outside the rig.
- Motion blur and depth of field: official `@remotion/motion-blur` on fast moves; per-layer blur by distance from the focus layer.
- Transitions pack: `maskGrow`, `whip`, `card3d`, `lightSweep`, `overlap`, `pushThrough`, `matchCut`.
- Text pack: entry doors, `Emphasis`, `Slam`, `CountUp`, `Caption`.
- Cue helpers: `cueWord`, `revealStart`, `useBeatPulse`, `impact`.

Build order: Camera rig, then Surface and atmosphere, then transitions pack, then text pack, then cue helpers and the QA gates.

## 10. Themes as skins

A theme keeps its palette, type, objects and pieces and its own signature moments. Direction supplies the camera, surfaces, text doors, transitions and rhythm. A theme that skips direction looks like a website. What every theme needs from direction:

1. A `surface` recipe with >= 2 layers plus a life language.
2. Pieces that register a **focus rect** so the camera can target them, and take `at` cue times.
3. Pieces that are **objects with an action**, not panels. A "card with text" gets an object variant, or its text moves beside or onto an object.
4. Pieces draw inside the camera rig (they zoom); only labels and captions live in the HUD.
5. 2 text doors and 1 emphasis form that suit the style.
6. One signature transition (the theme's physical process).
7. A pass of the four frame tests and the stills gates on one real beat.
8. A catalog demo that shows a camera move over the piece, not just its last frame.

## Sources

- bang-motion (MIT): anti-slide laws, shot sizes, depth transitions, surface and life menus, text rules.
- huashu-art-motion (MIT): camera action table, grammars, shot-table lint, QA gates, beat grids.
- Four reference reels the creator collected (a 10-styles reel, a 3D plinth explainer, a 3-transitions tutorial, a video-editor launch film): techniques studied, nothing copied.

Full detail: `data/references/direction/` (draft and source digests).
