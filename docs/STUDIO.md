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
4. **Try one music-only video** start to finish through the cue sheet, to test the new playbook.

## What's next (in order, one step at a time)
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
