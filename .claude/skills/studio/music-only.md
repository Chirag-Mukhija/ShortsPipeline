# Music-only videos

A video whose `status.md` says `Audio: music` has **no voice-over**. Music runs underneath, and the visuals and on-screen text carry the whole video. A voiced video can lean on the creator's voice through a plain shot. Here no narrator explains a weak frame or holds attention through a slow one, so the visuals are the product. They must be **stunning and specially curated**: designed for this video, shot by shot, never generic filler or stock-looking motion. Every stage reads this file when it runs a music-only video. Everything in the stage playbooks still applies unless this file says otherwise.

The creator chose this on purpose. Don't nudge them back to a voice-over.

## What changes, stage by stage

### idea
- Skip the question about speaking pace or how they say things.
- Ask instead, in the same single round:
  - the **feeling** the viewer should leave with (calm, awe, hyped, satisfied, curious)
  - whether the creator **appears on camera**, silently: face, hands, their desk, or not at all
  - any **music direction** they already hear in their head
- If `Audio:` came from the website, a decision `idea: the creator chose …` is already logged. Don't ask again.
- In chat mode, if no such decision is logged, ask "Your voice or music only?" as one of the questions. Set `Audio:` from the answer, and for music set the record row's state to `skipped`.

### research
- Run the usual topic searches. Add 1–2 searches for the topic in a **visual-only** form, the way a real viewer would type them. For example, add words like "no talking", "cinematic", "aesthetic", "timelapse", "satisfying" or "visualized" to the topic.
- In "What already works", note for the top visual-only outliers:
  - what the first frame shows
  - how fast it cuts
  - how on-screen text looks
  - how long the video is

  Report only what you can see in the metadata and titles, or read in sources. Never guess at retention.
- Facts become **text cards**, so pick the few strongest, and phrase each so it fits on one card. Every fact still needs its `[n]`.
- Each angle names its **visual hook**: the opening shot that makes someone stop scrolling.
- Under "what the creator must record or show", list footage they would shoot, not lines to say.

### plan (creator gate)
`plan.md` keeps every section from `stages/plan.md`, with these changes:
- **Look and feel is the centerpiece**, not a footnote. It names:
  - **Visual direction**: one concrete style, not a mood, with its references: outlier titles from the brief, and the creator's sketches.
  - **Palette**: 3–5 colors as hex values, each with its role (background, ink, accent).
  - **Type**: one or two faces, the weights, and the size of a text card on a phone screen.
  - **Motion language**: how things enter and leave, the easing, camera moves, and what the transitions are.
  - **Texture and light**: grain, glow, depth, shadows.
- **Style frames**: three key frames (the opening frame, the peak, the last frame), each described precisely enough that a motion designer could build it as a still with nothing else to go on. These are the creator's best moment to sketch. Ask for sketches of them explicitly at the gate.
- **Music brief**: mood, a tempo range in BPM, the energy arc mapped to the beats (intro, build, peak, breathe, out) and the target length. **No track is picked yet.** Music arrives with the edit stage, and it is free or open-licensed, with each track's license recorded.
- **Structure**: each beat is a visual sequence, not a talking point:
  - `Beat N: <name> (~mm:ss)`
  - **Shows**: what's on screen, concretely
  - **Text**: the on-screen words, if any
  - **Feel**: the music's energy here
- **Length**: take it from the visual-only outliers in the brief. With no voice, every second has to hold on its visuals alone, so when in doubt go shorter.
- **What the creator records** becomes **What the creator captures**: footage to shoot, screen recordings, photos, and props or places. No voice.
- The packager writes `package.md` as usual, with the changes below.

### script → the cue sheet (creator gate)
`script.md` is a **cue sheet**: the video's cues, with no spoken lines. The scriptwriter writes it, and the creator approves it like a script.
- **Hooks.** Write two opening options. Each one is the first ~3 seconds:
  - the opening visual, from a style frame
  - plus the first text card, if there is one

  Score the text card with `hookscore.py` the usual way. The score only checks the words, so also say in one line why the frame stops a scroll.
- **Beats.** `## Beat n: <name> (mm:ss–mm:ss)`, then one cue per shot, in order:
  - `[ON SCREEN: GRAPHIC | SCREEN | B-ROLL | FOOTAGE: …]`: composition, what moves and how, and the palette colors used. There is no `A-ROLL` (nobody talks to camera). Silent footage of the creator is `FOOTAGE: the creator …`.
  - `[TEXT: "…" hold N s]`: the on-screen words. Keep one idea per card and at most 12 words on screen at once. The studio's hold rule is 1.5 s plus 0.3 s per word, rounded up to the half second. Text cards use the creator's own words and phrases from `voice.md`.
  - `[MUSIC: intro | build | peak | breathe | out]`: the energy under this shot, following the plan's music brief.
  - `[CUT: on the beat | hold | <transition>]`: how this shot hands over to the next.
  - `[src: n]`: after any claim in a text card, or any visual that implies a fact, like a chart or a number.
- **Close.** The payoff lands on screen. End with one ask as a text card, or with none.
- **Footer.** The cue count, the total on-screen words, and the runtime **summed from the cue durations** (not words per minute).

### record
Skipped. The record row in `status.md` reads `skipped`, and the Record page isn't used. The creator's job before the edit stage is the footage from "What the creator captures".

### fact-checker
Checks every text card. It also checks every visual that states or implies a fact: a chart, a number, a before/after or a comparison. Mood shots need no source.

### packager
- The title promises the experience the visuals deliver. No voice-over means no "I explain", "I'll show you how" or "watch me talk through".
- The thumbnail shows the creator's face only if the plan puts them on camera. Otherwise the strongest style frame carries it: its palette, its one image, at most three words.

### edit (not built yet)
The cut follows the music: cue durations snap to the chosen track's beats and bars. The cue sheet is the edit's blueprint.
