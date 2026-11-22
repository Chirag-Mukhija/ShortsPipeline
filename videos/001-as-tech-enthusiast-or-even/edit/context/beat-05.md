# Context: 001-as-tech-enthusiast-or-even · beat-05 (The one thing I never dropped: DSA)

- Time range: **251.45–293.49 s** of video time (scenes read video time with `useTime()`; show nothing outside this range).
- Scene file to write: `videos/001-as-tech-enthusiast-or-even/edit/scenes/beat-05.tsx`, default-exporting the beat component.
- Theme: **hand-drawn** — Off-white dot-grid paper, graphite strokes that boil, Caveat handwriting writing on, one coral accent. Feels like the creator's own iPad sketch.. Import from `@library/themes/hand-drawn` and `@library/core`.
- Check your work: `node scripts/render-stills.mjs 001-as-tech-enthusiast-or-even beat-05` (typecheck + stills + `videos/001-as-tech-enthusiast-or-even/edit/stills/beat-05/_sheet.jpg`). Use `--at <times>` for the key word moments.

## The script for this beat
## Beat 5: The one thing I never dropped: DSA (~5:15-6:30)

Out of the whole chain, there's one link I never dropped. DSA. Data structures and algorithms. I've stuck with it since the start. [own]

[ON SCREEN: GRAPHIC: back to the chain. Every link fades to grey, one by one, and one thick accent-colour thread draws under all of them from left to right, ending in a hand-drawn "DSA" tag.]

And here's why. I believe it'll stay relevant for at least the next five or six years, because it's how someone's thinking process and problem solving get checked. [own: the creator's own judgment, "atleast 5-6 years"]

That's my bet. It's not a fact, and I don't have a study for it. I'm telling you what I'm sure about, not what's proven. [own]

[ON SCREEN: SCREEN: the creator's own DSA practice (notes, solved problems or a streak page), a few seconds, with the thread doodle in the corner. A-ROLL between.]

The reason I mention it is not "go learn DSA". It's that out of everything I touched, it's the one thing I'm still sure about. Nothing guarantees it will pay off. But when I asked myself what I'd bet on, that's what I picked. [own]

[ON SCREEN: A-ROLL, creator to camera. A handwritten note under the thread: "my bet, not a fact".]

---

## What was actually said (wins over the script)
## Beat 5: The one thing I never dropped: DSA

Out of the whole chain, there's one link I never dropped. TSA. Data structures and algorithm, I've stuck with it since the start. And here's why. I believe it'll stay relevant for at least the next five or six years, because it's how someone's thinking process and problem solving skills gets checked. That's my bet. It's not a fact, and I don't have a study for it. I'm telling you what I'm sure about, not what's proven. The reason I mentioned it is not goal on DSA". It's that one of everything I touched, it's the one thing I'm sure about. Nothing guarantees it will pay off. But when I asked myself what I'd bet on, that's what I picked.

## Spoken words with start times (seconds) — land visuals 3–6 frames before the word
Out@251.75 of@252.13 the@252.35 whole@252.65 chain,@252.95 there's@253.67 one@254.11 link@254.27 I@254.47 never@254.73 dropped.@254.95 TSA.@255.97 Data@256.83 structures@257.21 and@257.45 algorithm,@257.69 I've@258.23 stuck@258.51 with@258.71 it@258.93 since@259.07 the@259.27 start.@259.45 And@260.33 here's@260.69 why.@260.99 I@261.15 believe@261.67 it'll@261.93 stay@262.19 relevant@262.47 for@262.79 at@263.15 least@263.33 the@263.59 next@264.01 five@264.35 or@264.81 six@264.97 years,@265.17 because@265.61 it's@266.01 how@266.79 someone's@266.93 thinking@267.37 process@267.61 and@268.05 problem@268.43 solving@268.71 skills@268.95 gets@269.81 checked.@270.11 That's@270.78 my@271.20 bet.@271.34 It's@271.74 not@272.00 a@272.16 fact,@272.30 and@272.76 I@272.96 don't@273.10 have@273.30 a@273.52 study@273.62 for@273.78 it.@274.04 I'm@274.36 telling@274.62 you@274.78 what@275.00 I'm@275.18 sure@275.44 about,@275.70 not@276.16 what's@276.96 proven.@277.24 The@277.79 reason@278.07 I@278.25 mentioned@278.43 it@278.75 is@279.07 not@280.31 goal@280.73 on@281.29 DSA".@281.51 It's@282.11 that@282.49 one@282.77 of@283.27 everything@283.49 I@284.13 touched,@284.41 it's@284.87 the@285.13 one@285.25 thing@285.45 I'm@285.73 sure@286.05 about.@286.35 Nothing@287.47 guarantees@288.03 it@288.49 will@288.75 pay@288.91 off.@289.23 But@289.75 when@289.87 I@290.11 asked@290.29 myself@290.51 what@290.95 I'd@291.31 bet@291.63 on,@291.79 that's@292.57 what@293.01 I@293.11 picked.@293.25

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
1. at 251.45 s · wide · pull · **the chain** returns; every link greys, then a coral thread draws under them all
2. at 255.75 s · cu · push · **the thread's end tag** slams 'DSA' and writes its full name below · text: "DSA: data structures & algorithms"
3. at 258.10 s · medium · glide · **the coral thread** is followed back to the first link · text: "Since the start"
4. at 260.20 s · mcu · push · **a timeline ruler** extends five to six years past today · text: "I believe: 5–6 more years"
5. at 265.45 s · cu · glide · **a problem-solving checklist** ticks 'thinking' and 'problem solving' · text: "How thinking gets checked"
6. at 270.60 s · mcu · pull · **a bet token** drops onto the DSA tag · text: "My bet, not a fact"
7. at 274.20 s · cu · push · **a pencil note** writes under the thread · text: "What I'm sure about, not proven"
8. at 277.60 s · mcu · cut · **a 'go learn DSA' sign** gets scribbled out · text: "Go learn DSA"
9. at 281.95 s · cu · push · **your DSA practice (footage fs-01)** plays inside a sketched frame hanging from the thread
10. at 287.30 s · mcu · glide · **the bet token** wobbles on the tag · text: "Nothing guarantees it"
11. at 289.60 s · wide · pull · **the whole chain** pulls back with the coral thread glowing underneath · text: "What I'd bet on" · out: paper turn into Beat 6 (the theme's own transition, used once)

## Footage slots for this beat (never use raw: frame, crop, zoom and grade it in the theme's style; empty slots render a labelled placeholder)
- `fs-01`: A screen recording of your own DSA practice: your notes, a solved problem or your streak page. Scroll slowly and keep personal info off screen. → `staticFile("media/fs-01.mov")`

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
