# Context: 001-as-tech-enthusiast-or-even · beat-08 (Close)

- Time range: **444.19–478.14 s** of video time (scenes read video time with `useTime()`; show nothing outside this range).
- Scene file to write: `videos/001-as-tech-enthusiast-or-even/edit/scenes/beat-08.tsx`, default-exporting the beat component.
- Theme: **hand-drawn** — Off-white dot-grid paper, graphite strokes that boil, Caveat handwriting writing on, one coral accent. Feels like the creator's own iPad sketch.. Import from `@library/themes/hand-drawn` and `@library/core`.
- Check your work: `node scripts/render-stills.mjs 001-as-tech-enthusiast-or-even beat-08` (typecheck + stills + `videos/001-as-tech-enthusiast-or-even/edit/stills/beat-08/_sheet.jpg`). Use `--at <times>` for the key word moments.

## The script for this beat
## Beat 8: Close (~9:15-10:00)

So, what's my answer to "if AI can code, what should I be learning"? Honestly, I'm still sorting this out myself. Nothing is guaranteed. [own]

But you can improve your odds. One main thing. Small, real things you actually finish. Test yourself, and space it out. Ask AI to explain, not just to do. And park the new ideas instead of chasing them. [own, built from sources 1, 5, 6]

[ON SCREEN: GRAPHIC: the chain redrawn once more. One thick accent-colour main link in the centre, with small parked side-links hanging off it on thin graphite strings, each with a tiny handwritten idea ("AWS", "new protocol idea"). A-ROLL for the last line.]

That's the answer I promised you. Not a tool name, a way of learning. And if you've got a chain like mine, tell me in the comments where you are on it.

[ON SCREEN: A-ROLL, creator to camera, to the end. No end card pitch.]

---

## What was actually said (wins over the script)
_(no transcript section)_

## Spoken words with start times (seconds) — land visuals 3–6 frames before the word
So,@444.49 what's@445.15 my@445.47 answer@445.57 "if@446.13 AI@446.35 can@446.69 code,@447.01 what@447.43 should@447.65 be@447.83 I@447.99 learning"?@448.17 Honestly,@448.85 I'm@449.59 still@449.91 sorting@450.13 things@450.47 out@450.75 myself.@451.01 Nothing@451.93 is@452.17 guaranteed.@452.39 But@453.43 you@453.67 can@453.77 improve@453.89 your@454.19 odds.@454.45 One@455.39 main@455.55 thing.@455.79 Small,@456.49 real@457.19 things@457.51 that@457.91 you@458.59 can@458.71 actually@458.87 finish.@459.15 Test@459.97 yourself,@460.25 and@460.65 space@460.93 it@461.17 out.@461.35 Ask@461.81 air@462.09 to@462.25 explain,@462.37 not@462.73 just@463.03 to@463.21 do.@463.37 it.@463.57 Impart@464.21 the@464.61 new@464.85 ideas@465.03 instead@465.39 of@465.77 chasing@465.93 them.@466.15 and@466.51 leaving@466.85 others@467.17 behind.@467.51 That's@468.35 the@469.39 answer@469.49 I@469.77 promised@469.99 you.@470.31 Not@470.77 a@471.07 tool@471.21 being.@471.41 a@472.15 way@472.45 of@472.59 learning.@472.75 And@473.34 I've@473.58 got@473.72 a@473.98 chain@474.18 like@474.42 mine,@474.74 tell@475.52 me@475.98 in@476.14 comments@476.28 where@476.58 you@477.70 are@477.84

## The video's shared style (`edit/scenes/style.ts`: import `STYLE` from `./style`; never hardcode a colour)
```ts
// Video 001's shared style: the one place for its colours, fonts and pacing, so beats built on different days still look like one video. Every beat imports from here; a whole-video note changes this file once and every beat re-renders with it.
import { ACCENT, DOT, HAND, INK, PAPER, PENCIL, SANS } from "@library/themes/hand-drawn";

export const STYLE = {
  theme: "hand-drawn",
  // Colours: paper page, graphite ink, pencil grey for asides, one coral accent for the one thing that matters most in a shot.
  paper: PAPER,
  dot: DOT,
  ink: INK,
  pencil: PENCIL,
  accent: ACCENT,
  // Fonts: handwriting for words, Inter for numbers.
  hand: HAND,
  sans: SANS,
  // Pacing, as Beats 1–2 set it (the creator scored them top): a new idea on screen every 3–6 s, visuals landing 3–6 frames before their word.
  pacing: { shotMin: 3, shotMax: 6, leadFrames: 4, holdAfterLast: 0.6 },
  // Sizes at 1080p.
  text: { body: 44, label: 38, title: 72 },
} as const;
```

## Whole-video notes from the creator (standing direction for every beat)
_(none)_

## Creator decisions (respect all of them)
Newest last. Format: `- YYYY-MM-DD <stage>: <decision, in the creator's words where possible>`
- 2026-11-12 idea: Who is the one viewer this video is for? → "for both a tech enthusiast self taught learner , early career developer and a college student in tech"
- 2026-11-12 idea: What should the viewer leave with? (Research will check this holds up; you can also let research propose it.) → "Let research decide"
- 2026-11-12 idea: How long should it be? → "8-12 min long-form"
- 2026-11-12 idea: Anything that must be in, or must stay out? Pick all that apply. → "Honest, not guru"
- 2026-11-12 plan: Which angle should this video take? The biggest outlier in this space is "Vibe Coding is a Trap" (DevForge, 85x its channel median), and it opens on a fear hook. Nobody has told an honest personal chain like yours. You can mix angles, or write your own. → "3. AI Can Code. So What Should I Learn?"
- 2026-11-12 plan: What should it look and feel like? → "the theme could be a hand-drawn chain on ipad rather than a clean dark dev UI , beause Clean dark is always the default what claude gives so it will be a change this does not mean , i will do the animation myself on my ipad , the theme would look and feel like that again this is a testing only , nothing could go wrong ."
- 2026-11-12 plan: Roughly how long did your whole chain take, from networking to leaning into DevOps? The title and the story use the real number, never a made-up one. → "A few months"
- 2026-11-12 plan: Did you finish anything along the chain, even something small? A real finished artifact (or an honest 'nothing yet') anchors the story. → "i try to finish something substantial just to give that sense of relief after switching to myself,  but mostly what i finish is often made from coding agents like claude so no manual work there . only thing i have stick with since the start is DSA because that is something i am still sure about will last atleast 5-6 years more , where it would be relevent to check someones thinking process and problem solving"
- 2026-11-14 plan: APPROVED by the creator
- 2026-11-14 script: Your Beat 1 sketch draws the chain as Custom Protocol → Backend → Claude Code → System Design. Your story (idea.md and the spoken line) goes Protocol → Claude Code → Backend → System Design. The script follows the story order so the picture matches the words. Which order is right? → "Story order (as scripted)"
- 2026-11-14 script: Beat 2 has an optional line: "Looking back, I did feel some of it carried over between the topics." It came from the researcher's guess, not from you. Is it true for you? → "Keep it"
- 2026-11-14 script: Beat 2, written from your answer: "I try to finish something substantial, just to get that feeling of relief after I switch. But mostly what I finish is made by coding agents like Claude, so there's no manual work from me there." Does that sound like you, and is "no manual work from me" exactly right? → "we can make it something like i was running from hardwork in that thing because i switched over and going back to it was hard (something like this)"
- 2026-11-14 script: APPROVED by the creator
- 2026-11-15 record: the creator finished recording (7:58, 10 takes, 5 script words left unrecorded on purpose). What was actually said is in record/transcript.md and record/narration.json; it wins over script.md wherever they differ.
- 2026-11-15 edit (one-shot test): the creator watched renders/oneshot-beats-1-2.mp4 (Beats 1–2, made in one Opus session from the plan, sketch, cues and word timings) and scored it top on all four: shows what they say, lands on their words ("99.99%"), designed not templated, readable. "this is exactly the theme we decided". The hand-drawn paper look may become the channel's face later, but not yet: try other themes first.
- 2026-11-15 edit: the animation library grows per video and is organised by theme; a new theme starts a new category with fresh code. Only truly theme-free pieces (timing, camera, blur/fade transitions) are shared. Later the website shows the animation and music libraries for reference while planning.
- 2026-11-17 edit (beat-01 redo): "the overall camera movement is very less which makes the video harder to watch for a person who has short attention span , so from the start of the video if we can have fast paced camera movements i would like to look at that ." Applied as: fast, frequent, word-motivated camera moves from frame 0, overriding DIRECTION.md's "fast moves in at most a third of shots" limit for this beat. The old version is kept as take v1.
- 2026-11-17 edit: storyboard APPROVED by the creator (89 shots)

## Sketches and attachments for this beat
_(none)_

## Approved shots for this beat (the brief: build these, in this order; DIRECTION.md applies)
1. at 444.19 s · medium · pull · **the hook question from Beat 1** pops back word by word, 'learn' in coral · text: "If AI can code, what should I learn?"
2. at 448.70 s · cu · push · **a pencil note** writes 'still sorting it out' under the question · text: "Nothing is guaranteed"
3. at 453.25 s · wide · cut · **the page** flips to a fresh chain sketch · text: "Improve your odds"
4. at 455.20 s · cu · push · **one thick coral main link** draws in the centre as small finished ticks click on · text: "One main thing. Small, real, finished"
5. at 459.80 s · mcu · glide · **the calendar strip and the robot's 'why?' bubble** hang from the main link in turn · text: "Test, space it out. Explain, not do"
6. at 464.05 s · wide · pull · **parked side-links** hang off on thin strings: 'AWS', 'new protocol idea' · text: "Park new ideas"
7. at 468.20 s · mcu · push · **the finished chain** holds as the camera slowly pushes in · text: "Not a tool name. A way of learning"
8. at 473.20 s · wide · pull · **a blank link at the chain's end** draws open and the pencil sets down beside it · text: "Where are you on yours?" · out: end on the action, no end card

## Footage slots for this beat (never use raw: frame, crop, zoom and grade it in the theme's style; empty slots render a labelled placeholder)
_(none)_

## Theme catalog: Hand-drawn (preview stills in `data/library/previews/hand-drawn/`)
- **paper** (background) — The page every hand-drawn scene sits on: warm off-white, iPad dot grid, grain and a soft vignette.
  `<Paper />`
- **pencil-stroke** (primitive) — Any line, shape or arrow: draws on with p, re-jitters every 4 frames so holds stay alive, optional arrowheads and dashes.
  `<Sk pts={linePts|blobPts|ellPts|rectPts|curvePts|cloudPts(...)} p w color dash head head2 />`
- **handwriting** (primitive) — Labels, notes, margin asides. Writes left to right at a speed set by its length; pencil grey for asides, coral for the one key word.
  `<Hand x y text size p={wr(t, at, text)} color rotate anchor />`
- **word-pop** (primitive) — The main question or claim, word by word on the narration's word times; the last word can pop bigger, turn coral and get a hand-drawn underline.
  `<WordLine mode="pop" y size words={[{ w, t, accent?, underline?, scale? }]} />`
- **word-write** (primitive) — A sentence that should feel written rather than announced; underline the last word in graphite to keep coral for later.
  `<WordLine mode="write" y size words={[{ w, t, underline? }]} />`
- **rotating-arrows** (doodle) — Switching, cycles, going round in circles. Rotate the group with time for a spin.
  `<RotatingArrows p={0..1} />`
- **laptop** (doodle) — Code, an AI writing code, a project. Lines type themselves in via the typed callback.
  `<Laptop p={0..1} />`
- **robot** (doodle) — An AI agent did it. Small, friendly, never scary.
  `<Robot p={0..1} />`
- **play-button** (doodle) — A video popped up; one per switch beside a chain; pulse it for 'the next video is always there'.
  `<PlayButton p={0..1} />`
- **bulb** (doodle) — An idea, a new use case, a realisation.
  `<Bulb p={0..1} />`
- **mini-chain** (doodle) — Icon for 'the chain' in maps and agendas.
  `<MiniChain p={0..1} />`
- **research** (doodle) — Papers, a study, 'look at what the research says'.
  `<Research p={0..1} />`
- **checklist** (doodle) — A plan, rules, 'what I'm doing about it'.
  `<Checklist p={0..1} />`
- **net-graph** (doodle) — Networking, connections, systems.
  `<NetGraph p={0..1} />`
- **packet** (doodle) — A protocol, a message, data with a header.
  `<Packet p={0..1} />`
- **chart** (doodle) — Growth, scale, '1 to 1,000,000 users'.
  `<Chart p={0..1} />`
- **cloud-boxes** (doodle) — Cloud services, AWS, infrastructure.
  `<CloudBoxes p={0..1} />`
- **runner** (doodle) — Running from something, rushing, escaping. Two poses swap every 5 frames; move its x over time.
  `<Runner p={0..1} />`
- **chain-draw-on** (piece) — A sequence of steps, topics or switches said one after another: each link draws on as it's named and the previous one fades to grey.
  `<Chain nodes={chainLayout(labels)} looks={NodeLook[]} links={LinkLook[]} />`
- **chain-focus** (piece) — Walking through a chain link by link (bold = now, grey = faded), ending on the one that lasts.
  `<Chain …> with steps(t, keys) driving each NodeLook.ink and .bold`
- **stamp** (piece) — A verdict landing on something: 'MADE BY AGENTS', 'NO STUDY FOUND', 'MYTH'.
  `<Stamp x y text at r? w? />`
- **hatch-bar** (piece) — Something half done, a share or a percentage drawn by hand; grey it out with ink when the topic fades.
  `<HatchBar x y w? fill={0..1} at ink? label? />`
- **question-equals** (piece) — Questioning whether two things are the same: '“finished” =? learning', 'busy =? productive'.
  `<QuestionEquals left right at={{ left, eq, q, right }} />`
- **stations** (piece) — The video's agenda or a three-step process: circled icons joined by dotted arrows, each landing on its word.
  `<Stations stations={[{ x, t, label, icon: (p) => <Doodle p={p} /> }]} />`

## Core (any theme)
- **camera-world-tour** — Any beat with several things to explain: put them in ONE world and move the camera between them instead of cutting to a new card. The default replacement for a list or a row of tiles. `<Camera world={{w,h}} targets={{id: rect}} shots={[{ at, target, size: 'wide'|'medium'|'mcu'|'cu'|'ecu', move: 'cut'|'push'|'pull'|'glide'|'whip'|'punch', dur? }]}><Layer depth={1}>…</Layer><Hud>…</Hud></Camera>`
- **camera-whip** — An attention jump or a comedic turn between two things in the same world: 0.3 s whip, real motion blur from @remotion/motion-blur only on the fast frames. `<Camera motionBlur={{ samples?: 8, shutter?: 200, threshold?: 18 }} shots={[…, { at, target, size: 'cu', move: 'whip' }]}>`
- **camera-hud** — Headlines and captions that must not zoom while the camera moves, and labels that follow a world point without scaling (useCamera().project). `<Camera …><Layer>…</Layer><Hud>{text}</Hud></Camera> · const p = useCamera().project(x, y, depth?) → { x, y, s } in screen px`
- **camera-shot-sizes** — Choosing the size a shot list names; sizes are how much of the frame the target fills (frameOn), so the same name works for any element. Hard cuts between sizes read as jump-ins. `frameOn(rect | {x,y,r}, size | fill) → { x, y, s } · SHOT_FILL · move: 'cut'`
- **camera-parallax** — 2.5D worlds: landscapes, rooms, desks. Each <Layer depth> pans and zooms by its depth, so one glide shows real depth. Far layers never show an edge; keep foreground (>1) sparse. `<Layer depth={0.05 | 0.3 | 0.65 | 1 | 1.5} sharp? style?>`
- **camera-focus-pull** — Moving attention between near and far without a cut: layers blur by their distance from the focus plane, and a shot's `focus` racks it. `<Camera dof={px per depth unit} shots={[{ at, focus: depth, dur? }]}> · <Layer depth sharp?>`
- **surface-recipes** — Picking the base of a beat's background stack: every recipe is 2-3 layers from palette colours that drift on their own; add one life layer per segment. `<Surface recipe='horizonGlow'|'duotoneDiagonal'|'meshBlob'|'spotlightTint'|'layeredSky'|'paperTexture' palette={{ base, accent, accentLit?, deep?, light? }} parallax?>{life}</Surface>`
- **surface-dark-life** — A dark chapter background that is never dead, with a text pocket keeping the headline readable over it. `<Particles count? mode='rise'|'drift'|'float' size? opacity?> · <LightLeak corner? strength?> · <Grain opacity? blend?> · <Vignette strength? color?> · textPocket({ tone, strength, pad })`
- **surface-light-life** — A light chapter (alternating dark/light marks a mood change): drifting mesh blobs, one sweep per segment, multiply grain. `<LightSweep at dur? angle? width? strength?> · <Grain blend='multiply'>`
- **t-maskGrow** — Revealing the next scene from a thing in this one (the sun, a dot, an icon, a logo hole). Any SVG path works as the mask: a star here. `<MaskGrow p a b origin={{x,y}} shape={'circle' | pathD} spin? edge? push? ease?>`
- **t-whip** — Energetic cuts between sentences: both scenes travel as one strip with real sub-frame motion blur. Alternate `dir` between uses. `<WhipAt at dur?=0.28 a b dir? samples?> (timed, motion-blurred) · <Whip p a b dir blur?> (p-driven, SVG blur)`
- **t-card3d** — Swapping two screens or posters with depth: a turns away and dims, b comes forward from the other side and flattens into the frame. `<Card3d p a b bg? dir?={1|-1} angle? radius? perspective?>`
- **t-lightSweep** — Gentle chapter changes: a warm blurred light drifts across and the cut hides in its glare. `<LightSweep p a b tint? streak? from? to? strength?>`
- **t-overlap** — The default in-chapter change: old elements leave fast while the new ones already arrive, no cut. Use overlapOut/overlapIn on your own elements or <Overlap> with layers. `<Overlap p a={[layers]} b={[layers]} stage?> · overlapOut(p, i, n) / overlapIn(p, i, n) → style`
- **t-pushThrough** — One special dive per video: the camera pushes into a subject of a (here the sun) and the next scene is born large and settles. `<PushThrough p a b origin={{x,y}} depth?=10 swap?=0.5 aFront? fill?>`
- **t-matchCut** — Two scenes that share a shape: the sun travels, recolours and morphs into the star while the scenes hard-cut behind it. Render a and b without the shared shape. `<MatchCut p a b from={{ d, x, y, size, fill, rotate? }} to={…} cut?=0.5 shadow?>`
- **t-colourFlash** — Chapter changes (two per video at most): a palette colour field wipes in on a slanted edge with a lead band, holds the chapter label, passes on (or stays as the next background). `<ColourFlash p a b color lead? dir? stay? mid? slant? band?>`
- **text-doors-a** — Entering any line with a door chosen by meaning; never the same door on two consecutive beats. Font props come from the theme. `<Line text at door='rise'|'mask'|'words'|'depth'|… font? color? align? case?='sentence' out? emphasis?>`
- **text-doors-b** — The other four doors. `slide` takes from='left'|'right'|'up'|'down'; `typed` runs at 26 chars/s with a zero-width cursor. `<Line text at door='typed'|'blur'|'slide'|'split' from? stagger? dur? out?>`
- **text-emphasis** — Marking the key word after the line has landed (0.4–0.6 s later). Wrap words in *asterisks* in <Line emphasis>, or use <Emphasis> around any inline text. `<Emphasis kind='highlight'|'pill'|'underline'|'colour'|'weight'|'circle'|'box'|'strike'|'none' at color? ink?>…</Emphasis>`
- **text-slam-on-beat** — An impact word that lands on a beat or a punch word: under-damped scale slam, shock ring, a short flash and a camera hit on both layers; the whole frame breathes on every quarter note. `<Slam text at font? ring? shake?> · <SlamFlash at> · useBeatPulse({ amount, every }) in <Track> · impactTransform(t, at, { scale, shake })`
- **text-countup** — A number that sits on an object and settles exactly on the spoken word (cueWord), digits in fixed cells so nothing jitters. `<CountUp to land={cueWord(words, 'about')} dur? from? decimals? prefix? suffix? group? font?>`
- **text-caption** — Captions on narrated videos from record/narration.json: 2–6 word chunks broken at punctuation and pauses, the word being said in the accent. `<Caption words={wordsBetween(narration.words, from, to)} font? y? pill? ink? accent? min? max?>`
- **beat-clock** — Driving any theme from the music: wrap a scene in <Track spec={{ bpm, sections }}> and read beat, bar, pulse and section energy with useSong(). Cues can be seconds or { bar, beat }. `<Track spec={{ bpm, offsetSec?, signature?, sections? }} from?> · useSong() → { pulse, energy, pos } · holdFor(words)`
- **camera-keys** — Walking the viewer through a wide world-space scene: zoom into one part, pan along, pull back out. Includes a slow hand-held drift. `<g transform={camAt(t, [{ t, x, y, s, d? }])}>…</g>`
- **blur-out-up** — Clearing a scene so the next one lands on a clean page; the creator's sketch asked for 'go up / blur'. `<AbsoluteFill style={blurOut(e, { blur, dx, dy })}>`
- **blur-in** — A scene arriving out of focus and settling; pairs with blur-out for soft scene changes. `<AbsoluteFill style={blurIn(e, { blur, dy })}>`

## Rules
- Frame-driven only (`useTime`, `interpolate`, `spring`, `Easing`); seeded randomness; no CSS transitions, timers or wall-clock code.
- Reuse catalog pieces where they fit perfectly; make new pieces only where nothing fits, and keep them in the scene file (they may be promoted to the library after the rough cut).
- Readable at 1080p: body ≥ 36 px, labels ≥ 28 px, 96 px safe margins, nothing clipped. Never invent numbers or quotes: every figure comes from the script.
- Quality bar: `packages/video/src/oneshot/Beats12.tsx` (video 001 Beats 1–2) — the creator scored it top on every point.
