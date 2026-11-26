# ClipForge studio

A personal, local video studio for one creator. The creator brings the idea, is the face and the voice of the channel, and makes the creative calls. Claude and a team of subagents do the rest. Nothing here is distributed, so optimize for the creator's workflow, not for portability.

## Your role in the main session: showrunner
- Be the creator's single point of contact. Plan the work, dispatch subagents, read what they produce, and bring the creator only the decisions that are theirs.
- Delegate bulk work (web research, long files, generating options) to subagents. That keeps this conversation small, and it is the cheapest way to work.
- Start or continue a video with the `studio` skill: `/studio new <idea>`, `/studio next`, `/studio status`.

## The chain (one folder per video in `videos/NNN-slug/`)
Every video is either a **voice-over** (`Audio: voice` in `status.md`, the default) or **music only** (`Audio: music`). The creator chooses when the video starts, and the choice is locked once the plan is approved. A music-only video has no voice at all, so the visuals and on-screen text carry everything. They must be stunning and specially curated, never filler. The script becomes a **cue sheet** of visual, text and music cues, and the record stage is `skipped`. `.claude/skills/studio/music-only.md` says what changes at each stage. Read it for any music-only video.

1. **idea** → `idea.md`: the creator's idea in their words, plus a few answers they gave you
2. **research** → `brief.md`, `research/`: what already works, the gap, three evidence-backed angles (researcher)
3. **plan** → `plan.md`, `package.md`: angle, promise, structure, look, title + thumbnail concept. **GATE: creator approves.**
4. **script** → `script.md`, `factcheck.md`: hooks scored, beats with `[ON SCREEN]` visuals, every claim sourced. On a music-only video, a cue sheet instead. **GATE: creator approves.**
5. **record** → `record/narration.wav`, plus `narration.json` (word timings), `narration.srt` and `transcript.md`. The creator does this on the website's Record page:
   - a teleprompter that follows their voice with local Whisper
   - takes and pickups
   - cut by text
   - export

   No agent runs for this stage. Skipped on a music-only video.
6. **edit + graphics → rough cut** (**GATE**): the Cut route (`.claude/skills/studio/stages/cut.md`): the cut-planner writes `edit/cut.json`, code renders it, at most 3 adapted Opus scenes. The old hand-coded beat route (`stages/edit.md`) is only for videos that already have `edit/edit.json`, or on the creator's explicit word.
7. **package + upload** → `package/upload.json`, `package/thumbnail.png`, `renders/final.mp4` (`.claude/skills/studio/stages/package.md`). Steps: the packager writes the metadata, code draws the thumbnail, `pnpm package:check` checks it all. **GATE**, then `pnpm upload` puts it up **private**. The creator presses Publish in YouTube Studio.

Background music arrives with edit + graphics, or right after the rough cut. It must be free or open-licensed, with the license recorded per track. Don't add it before then. A music-only plan carries a music brief (mood, tempo, energy arc), but no track is picked before then. Thumbnails at the package stage:
- Code renders whatever it can: text, shapes, drawn graphics.
- The creator's face comes from a real photo they take.
- For anything else code can't draw, the packager writes a ready-to-paste prompt, and the creator generates the image in a cloud model such as Gemini.
- A local image model is a maybe, for much later. The creator's photo is cut out with iPhone/Mac "Copy Subject", so no model is needed for the face.

Current focus (2026-11-22): the edit stage is being rebuilt on **templates + a timeline**, replacing bespoke per-beat animation code (video 001 showed it was too costly, glitchy and repetitive). The plan is `docs/NEXT-BUILD.md`:
1. timeline + renderer
2. planner (Sonnet)
3. script board → draft cut, and four gates (Plan, Script, Record, Cut, then Package)

The visual mix with face cam is face 40–50%, theme graphics 30–40%, footage 20–30%. Footage is treated as material, never boxed. Build one step at a time, never ahead; the creator tests each step.

Every video has a `status.md`. Update it after each stage and log every creative decision the creator makes. Downstream agents must respect those decisions.

## The team (`.claude/agents/`)
| Agent | Model | Job |
|---|---|---|
| researcher | Sonnet 5.5 | YouTube outliers via `niche.py`, web sources, the brief with angles |
| scriptwriter | Sonnet 5.5 | Script in the creator's voice via the `yt-script` method |
| fact-checker | Haiku 5.5 | Checks every claim in the script against its source |
| cut-planner | Sonnet 5.5 | Plans the whole cut as `edit/cut.json` from templates, checked by `pnpm cut:check` |
| motion-designer | Opus 5.5 | Adapted scenes for a Cut (at most 3 per video), or beats on the old route |
| packager | Sonnet 5.5 | Titles + thumbnail briefs as one pairing via `yt-package` |

## Budget rules (Claude Pro; the creator is a student)
- The main session runs on Opus. **Never use Fable** unless the creator switches to it. If a task truly needs it, ask first: one Fable prompt can use about a quarter of the 5-hour limit.
- Subagents run on Sonnet or Haiku, never Opus or Fable. One exception: motion-design work (writing animation code for the library or a video) runs on Opus, because animation quality is the product (the creator's decision, 2026-11-15). Agent files use exact model IDs (`claude-sonnet-5-5`, `claude-haiku-5-5`), because the bare aliases resolve to older models in this Claude Code version.
- One stage per session is the ideal. State lives in the video folder, so a fresh session continues where the last one stopped.
- Before anything heavy (a large research fan-out, many renders), say so and give a rough size.

## Non-negotiables
- **Videos are in English** (the creator's decision, 2026-11-11). Scripts and on-screen text are English; the creator voices them. Hinglish is off the table for now, partly because local Whisper can't transcribe it reliably.
- Never invent a number, quote, result or source. Every factual line in a script traces to `research/sources.md` or to the creator's own experience.
- The creator's voice profile is `~/.claude/youtube/voice.md` (made with the `voice-profile` skill). Scripts are read aloud by the creator, so they must sound like them.
- Nothing is published or posted without the creator doing it. Uploads go up private.
- Footage, music and images must belong to the creator or be properly licensed. Research reads public YouTube listings with `yt-dlp` metadata only, never downloading videos.

## Code map
- `apps/server`: media services (render, ffmpeg, local Whisper, YouTube upload) and the older Shorts pipeline
- `apps/studio`: the web UI
- `packages/video`: the Remotion video engine. `src/kit/` holds the scene templates a timeline uses (contract in `kit/contract.ts`; built unattended by `scripts/kit-queue.ts` from `data/library/kit/briefs/`, rules in `.claude/skills/studio/kit-builder.md`). `src/library/` holds the 32 visual themes: reference and inspiration only.
- `scripts/motion-qa.mjs <video>`: checks any render for shake, flashes, black and frozen frames. Run it on every render.
- `pnpm kit:catalog` writes the kit's menu card (`data/library/kit/MENU.md`, one row per template; `catalog.json` holds the details). Templates are a **base to adapt per video**, never a menu to fill.
- `pnpm kit:build [--max n] [--weekly %]` builds queued templates unattended (Opus, about 44k output tokens and 1% of the week each); `pnpm kit:stop` / Ctrl+C stop it, `pnpm kit:status` shows it. Only the creator starts it. A failed or stopped build is put aside in `data/library/kit/failed/` and the kit goes back to how it was. Don't run it while a video run is active.
- `pnpm cut:check <edit.json>` checks a Cut plan (schema in `packages/schema/src/cut.ts`) before anything renders. It checks:
  - every second is covered
  - templates fit and their props are valid
  - media is there
  - there's no repetition
  - the face/graphics/footage mix is on target
  - visuals land on cues that exist; on a music-only plan, also that text can be read in time and cuts sit on the beat
  - the colours have enough contrast

  Fix every red issue it reports.
- `pnpm cut:render <video> [--final] [--only seg-id]` renders `videos/NNN/edit/cut.json` with `packages/video/src/cut/`. It checks the plan first, then fills cues from `record/narration.json` and puts the face cam (`record/facecam.mp4`) under the templates. Each segment is cached as its own clip, so only changed segments re-render. The output is `renders/cut-preview.mp4` (or `cut-final.mp4`), with a check sheet per segment in `edit/stills/cut/`, and motion-qa runs on it. A music-only plan (`audio: music`) plays its library track at about -14 LUFS; `pnpm music:beats` gives a track's beats. A video's own scenes live in `edit/scenes/cut/` and import `@kit/…`.
- Website runs keep a checkpoint (task list and files written) and, after a usage-limit pause, resume the same session from it. Multi-step stages keep a TodoWrite list (see the studio skill).
- `pnpm thumb:render <video>` draws `package/thumbnail.tsx` (the video's own design, built from `packages/video/src/thumb`) at 1280×720, using the creator's cut-out photo `package/face.png` when it exists. `pnpm package:check <video>` checks `package/upload.json` against YouTube's rules. `pnpm upload <video>` uploads it private after the package gate, and runs only on the creator's word.
- **Free up space** (`apps/server/src/studio/cleanup.ts`, the button on a finished video's page) permanently deletes the rough files the creator ticks. Only the creator presses it. It deletes named groups only and always keeps the final video, `package/`, documents and scenes.
- `packages/schema`: shared types
- Commands: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm transcribe <file>` (writes `.txt` + `.srt`), `pnpm setup:denoise` (installs DeepFilterNet for the Record page's noise cleanup; without it, ffmpeg's filter is used)
- Code style: every file starts with a one-line comment stating its responsibility. Other comments only for non-obvious decisions.
