# Context: 001-as-tech-enthusiast-or-even · beat-03 (Is switching actually bad?)

- Time range: **118.11–175.31 s** of video time (scenes read video time with `useTime()`; show nothing outside this range).
- Scene file to write: `videos/001-as-tech-enthusiast-or-even/edit/scenes/beat-03.tsx`, default-exporting the beat component.
- Theme: **hand-drawn** — Off-white dot-grid paper, graphite strokes that boil, Caveat handwriting writing on, one coral accent. Feels like the creator's own iPad sketch.. Import from `@library/themes/hand-drawn` and `@library/core`.
- Check your work: `node scripts/render-stills.mjs 001-as-tech-enthusiast-or-even beat-03` (typecheck + stills + `videos/001-as-tech-enthusiast-or-even/edit/stills/beat-03/_sheet.jpg`). Use `--at <times>` for the key word moments.

## The script for this beat
## Beat 3: Is switching actually bad? (~2:15-3:30)

So, is switching itself bad? Honest answer: I couldn't find a study on it. Nobody I found compared people who stick with one stack for a year against people who keep sampling, for self-taught learners like us. [src: none found, see sources.md "Missing"]

[ON SCREEN: GRAPHIC: a hand-drawn balance scale, "go deep" on one pan and "try new" on the other, wobbling and never settling. A small hand-stamped "no study found" lands on the base.]

The closest thing I found is from 2002. An economist, Lazear, used Stanford alumni data and found that having worked across many different roles was the strongest predictor of who went on to become an entrepreneur. [src: 7]

But that's about founders, not employees. So I'm not going to tell you generalists win. It doesn't say that. [src: 7]

[ON SCREEN: GRAPHIC: a small sketch of a person at a desk labelled "founders", with a crossed-out "employees" beside it. Source label in the clean sans: "Lazear, Stanford alumni data".]

What it does tell me is that switching, by itself, isn't proof you're failing. And staying on one thing for a year isn't proven safe either. When I say "a year on one thing", that's my judgment, not a finding. [own]

So the real question isn't how many times I switched. It's what I learned each time. And that's where AI comes in.

[ON SCREEN: A-ROLL, creator to camera. The scale doodle fades behind.]

---

## What was actually said (wins over the script)
## Beat 3: Is switching actually bad?

So, is switching itself bad? Honest answer: I couldn't find a study on it. Nobody I found compared the people who stick with one stack for a year against people who keep sampling, for self taught learners like us. The closest thing I found is from 2002. An economist, laser, used Stanford alumni data and found that having worked across many different roles was the strongest predictor of who went on to become an entrepreneur. But that's about founders, not employees. So I'm not going to tell you journalists win. It doesn't say that. What it does tell me that switching, by itself, isn't proof that you are failing. And staying on one thing for an year isn't proven safe either. When I say "a year on one thing", that's my judgment, not a finding. So the real question isn't how many times I switched. It's what I learned each time. And that's where AI comes in. Entropic

## Spoken words with start times (seconds) — land visuals 3–6 frames before the word
a@118.27 study@118.45 on@118.67 it.@118.89 Nobody@119.43 I@119.81 found@120.13 compared@120.43 the@120.77 people@120.99 who@121.33 stick@121.57 with@121.81 one@122.03 stack@122.27 for@122.59 a@122.95 year@123.09 against@123.49 people@124.55 who@124.99 keep@125.27 sampling,@125.47 for@125.95 self@126.27 taught@126.55 learners@126.83 like@127.19 us.@127.49 The@128.14 closest@128.42 thing@128.70 I@128.94 found@129.10 is@129.44 from@129.92 2002.@130.12 An@131.26 economist,@131.48 laser,@132.20 used@132.92 Stanford@133.32 alumni@133.96 data@134.44 and@134.78 found@135.12 that@135.38 having@135.62 worked@136.08 across@136.71 many@136.95 different@137.27 roles@137.57 was@138.05 the@138.45 strongest@138.65 predictor@138.99 of@139.55 who@140.39 went@140.79 on@141.03 to@141.43 become@141.61 an@142.01 entrepreneur.@142.45 But@143.57 that's@143.83 about@144.11 founders,@144.35 not@144.97 employees.@145.17 So@146.31 I'm@146.63 not@146.73 going@146.89 to@147.07 tell@147.25 you@147.49 journalists@147.73 win.@148.19 It@148.95 doesn't@149.23 say@149.57 that.@149.73 What@150.47 it@150.87 does@150.99 tell@151.19 me@151.43 that@152.09 switching,@152.43 by@152.75 itself,@153.05 isn't@153.41 proof@154.25 that@154.59 you@154.87 are@155.01 failing.@155.11 And@155.76 staying@156.23 on@156.89 one@157.25 thing@157.53 for@157.81 an@158.21 year@158.45 isn't@158.63 proven@159.19 safe@159.79 either.@160.19 When@160.55 I@161.83 say@161.97 "a@162.21 year@162.47 on@162.81 one@163.17 thing",@163.41 that's@163.65 my@164.29 judgment,@164.45 not@164.81 a@165.47 finding.@165.59 So@166.04 the@166.49 real@166.67 question@166.91 isn't@167.27 how@168.01 many@168.27 times@168.45 I@168.79 switched.@168.99 It's@169.65 what@170.01 I@170.19 learned@170.35 each@170.67 time.@171.05 And@171.37 that's@171.89 where@172.23 AI@172.37 comes@172.65 in.@172.89 Entropic@175.07

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
1. at 118.11 s · mcu · push · **the balance scale** wobbles as a 'no study found' stamp slams onto its base · text: "No study found" · out: overlap
2. at 121.30 s · cu · glide · **the left pan** sinks under one tall stack of blocks · text: "One stack, a year"
3. at 124.40 s · wide · pull · **the right pan** fills with small sampled cards while the scale never settles · text: "Keep sampling" · out: whip
4. at 127.95 s · mcu · whip · **a research paper** slides in from the margin, dated 2002 · text: "2002"
5. at 131.10 s · cu · push · **the paper's cover** writes its author and data source in the clean sans · text: "Lazear, Stanford alumni data"
6. at 135.45 s · mcu · glide · **a zigzag career path** draws through many role boxes · text: "Many different roles"
7. at 138.30 s · cu · push · **the path's end** lands on a founder at a desk · text: "Strongest predictor: entrepreneur"
8. at 143.40 s · mcu · pull · **the employee beside the founder** gets crossed out with a quick scribble · text: "Founders, not employees"
9. at 146.15 s · cu · cut · **a 'generalists win' banner** gets struck through · text: "Generalists win"
10. at 150.30 s · wide · glide · **the scale** returns with spinning switch arrows on one pan · text: "Switching isn't proof you're failing"
11. at 155.60 s · mcu · glide · **the one-stack pan** gets a pencil question mark · text: "Not proven safe either"
12. at 160.40 s · cu · push · **a pencil margin note** writes itself beside the scale · text: "My judgment, not a finding"
13. at 165.90 s · wide · pull · **a tally of switches** is crossed out while 'what I learned' writes beside it · text: "Not how many times. What I learned"
14. at 171.20 s · mcu · whip · **the robot** rolls in from the right edge · text: "Where AI comes in" · out: mask grow from the robot's eye into Beat 4

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
