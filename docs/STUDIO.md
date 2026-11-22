# ClipForge Studio: where we are (2026-11-15)

You bring the idea and make the calls. A team of agents researches, plans and writes. The website is where you run it all.

## Where we are in the flow

```
idea → research → plan (gate) → script (gate) → record → [edit + graphics → rough cut (gate) → package (gate) → private upload]
 ✅       ✅          ✅              ✅            ✅         └──────────────── not built yet ────────────────┘
```

- Stages 1–5 are built.
- The current focus is still **testing them on your own topics**, one step at a time, before anything new is built.
- **Video 001** ("AI Can Code. So What Should I Actually Learn?") has its script approved and is in the **record** stage.
  - It has takes, but the takes for Beats 6–8 (and take 7) have mic glitches.
  - It hasn't been exported yet.

## What's built

**Website** (`pnpm dev` → http://localhost:5173, locked with your `STUDIO_PASSCODE`)
- **Videos (board):** start a video from a typed or spoken idea. You choose:
  - **Ask me at each gate** or **Fully autonomous**
  - **Voice-over** or **Music only**

  - **Attach** sketches, screenshots, photos, clips and voice notes (button, drag-and-drop or paste). They go into the video's inbox as "part of the idea"; clips get a frame sheet and a transcript automatically, so the agents can see and hear them.
  - Optional **Look** and **Music** picks from the Library (or let the team choose).

  "Needs you" shows what's waiting on you.
- **Video page:**
  - **Steps and actions:** the stage stepper, and one "Now" bar for whatever needs you (answer, approve, give notes, record, run next).
  - **Documents:** read and edit them all.
  - **Side panel:** a live activity feed, Ask the showrunner, an inbox for iPad sketches and screenshots, and the decision log.
- **Record page:**
  - a teleprompter that follows your voice (local Whisper)
  - takes and pickups (restarts are cut for you)
  - cut by editing text
  - export to `narration.wav` with word timings, captions and a transcript
  - **Recording safety:**
    - **Hear myself:** monitor in wired earphones.
    - **Live glitch warning:** a red alert when the mic crackles or cuts out, and glitched words tinted red in Edit.
    - **Transcribe again:** ↻ on any take.
    - **Background noise cleanup:** Off / Gentle / Strong.
- **Voice practice:** a short talking sample every week or two, so scripts keep sounding like you.
- **How it works:** the guide inside the website.
- **Also:**
  - light/dark theme
  - your Pro usage meter (runs pause at the limit and resume after it resets)
  - the old Quick Shorts pipeline, kept under "Legacy"

**The team** (rules in `CLAUDE.md`, playbooks in `.claude/skills/studio/`)

| Who | Model | Does |
|---|---|---|
| Showrunner | Opus | Runs each stage and brings you only your decisions |
| Researcher | Sonnet | YouTube outliers (`niche.py`), sources, three angles |
| Scriptwriter | Sonnet | Script in your voice, every beat with a visual |
| Fact-checker | Haiku | Every claim checked against its source |
| Packager | Sonnet | Title and thumbnail as one pairing |

**Music-only videos** (new): no voice at all, so the visuals carry everything.
- The plan gets a full visual direction, three style frames to sketch, and a music brief.
- The script becomes a **cue sheet** of shots, text cards and music cues.
- Record is skipped.
- Details: `.claude/skills/studio/music-only.md`.

**Motion and music library** (new, 2026-11-15; the website's **Library** page)
- `packages/video/src/library/`: `core` (timing, camera, transitions, beat clock) plus 33 themes (~530 animations), each with a demo and preview stills. The full list is on the website's Library page. Renders use the GPU via `packages/video/remotion.config.ts`.
- Rules: `library/README.md`; builder brief: `library/THEME-BRIEF.md`. Previews: `node scripts/library-previews.mjs [theme]` (also refreshes the website catalog).
- Research behind it: 66 theme boards in `data/references/themes/` (index: `INDEX.md`), technique notes in `data/references/core-motion/`.
- Music: `data/music/SOURCES.md` (source comparison; primary Incompetech, CC BY 4.0) and 20 verified candidate tracks in `data/music/candidates.json`. Nothing downloaded yet.
- Video 001 Beats 1–2 one-shot (`packages/video/src/oneshot/`) is the quality benchmark for the edit stage.

**Tools:**
- `pnpm transcribe <file>`: local Whisper, writes `.txt` + `.srt`
- `pnpm setup:denoise`: installs DeepFilterNet, the better noise cleanup
- `pnpm test` and `pnpm typecheck`: currently 90 tests passing and a clean typecheck

## Loose ends (small, whenever you're free)
1. **Commit.** All work since the last commit (Record page, noise cleanup, glitch detection, music-only) is **not committed yet**. Ask me to commit it.
2. **Better noise cleanup:** run `pnpm setup:denoise` once. Until then, the studio uses ffmpeg's milder filter.
3. **Video 001:**
   - fix the mic cable or USB
   - test with Hear myself
   - re-record Beats 6–8
   - compare noise cleanup Off and Gentle in Edit
   - export
4. **One parked theme** (stopped at the usage limit, not registered): `bauhaus-geometric`. Finish it later or delete the folder. 81 research boards exist; about 50 are unbuilt (build when a video needs the look).
5. **Download the music you like** from the candidates into `data/library/music/` and list them in `tracks.json` (they then show as "in library").
6. **Try one music-only video** start to finish through the cue sheet, to test the new playbook.

## What's next (in order, one step at a time)

The edit + graphics stage plan is in **`docs/EDIT-STAGE-PLAN.md`** (build order, cost, decisions). Built so far (2026-11-16): the engine (`node scripts/assemble.mjs <videoId>`), the designer's tools (`scripts/beat-context.mjs`, `scripts/render-stills.mjs`), the stage playbook (`stages/edit.md`) with the **motion-designer** agent (Opus), and the website's **Edit page** (timeline, mixer, beats with takes and redo, footage, rough-cut notes, renders, approve) plus adding music files on the Library page. Then the direction layer: `library/DIRECTION.md`, a new core camera, surfaces, transitions and text, and a storyboard animatic with a Shots editor and Approve storyboard. One step for the creator: allow the runner to run the three edit scripts (see the plan).

1. **Edit + graphics (stage 6).**
   - The video is timed to your narration's word timings, or to the music on a music-only video.
   - Motion graphics for each beat come from the `[ON SCREEN]` cues and your sketches.
   - Captions.
   - Free or open-licensed background music, with the license recorded per track.
   - Optional camera: your face recorded during the same take on the Record page, via the iPhone (Continuity Camera) or the webcam.
2. **Rough cut (gate):** you review with notes pinned to timestamps.
3. **Package (gate):**
   - Code draws what it can: text, shapes, drawn graphics.
   - Your face comes from a real photo you take.
   - For anything else, the packager writes ready-to-paste Gemini prompts.
4. **Private upload.** You press Publish.
5. **Later:** Shorts as a format choice, and a landing page.

## Picking it back up after exams
- Open a fresh Claude Code session in this folder and say "read docs/STUDIO.md". Every video's state lives in its own `videos/NNN-slug/status.md`, so nothing is lost between sessions.
- To continue a video: `/studio next`, or **Run next stage** on its video page.
