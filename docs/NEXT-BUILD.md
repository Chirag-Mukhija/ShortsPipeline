# Next build: the Cut stage on templates (plan, 2026-11-22)

Goal: from a recorded voice and face cam, a watchable **draft cut** in minutes, made from kit templates, your face and footage. Changes cost no tokens unless you ask the team to re-plan. It replaces the storyboard, the bespoke beats and the old rough-cut flow. Three steps, each one tested by the creator before the next.

## Step A: the timeline and its renderer (no agents)
**What you get:** a hand-written `edit.json` for a 1-minute test recording renders into a real video: your face cam, templates beside or over it, and transitions. Change a word or a template and only that segment re-renders.

- **Timeline v2** (`packages/schema/src/cut.ts`, ✅ built with its checker `pnpm cut:check`): the video's style, the face cam, and **segments** `{ id, start, end, layout, visual?, media, move?, transitionIn }`. A segment's `visual` is either a kit template used as is, or **a scene written for this video, adapted from the templates it names in `basedOn`**. Templates are a base and inspiration, never a menu to fill (the creator's call, 2026-11-23).
  - Layouts: `face` (you, full frame), `full` (a template full frame), `split` (you on the left, a 1000×1080 template panel on the right), `overlay` (a template on top of you).
  - Segments are contiguous on the narration's timeline. Each segment's `cues` are filled automatically from `narration.json`, in seconds from the segment's start.
- **Renderer** (`packages/video/src/cut/`):
  - the face cam is the base layer, with punch-ins on chosen words
  - templates are placed by layout, with the creator's style tokens
  - transitions (cut, push, whip, mask, fade) come from the library core
- **Checks before and after rendering**, all in code with no tokens:
  - props are validated against each template's zod schema before anything renders
  - variety: the same template or move twice in a row, a mode held for more than about 15 s
  - the visual-mix ratio against the plan's targets (face 40–50%, graphics 30–40%, footage 20–30%)
  - `motion-qa` on the result
- **Per-segment cache:** a hash of the segment's JSON, its template file and the style decides what re-renders; segments are joined like `assemble.mjs` does now.
- **Test:** you record about 1 minute with face cam; I hand-write its timeline (6–8 segments, 5+ templates).

## Step B: the planner (one Sonnet run per video)
**What you get:** the team writes that timeline for a whole video, cheaply.

- **Kit menu card** (✅ `pnpm kit:catalog` → `data/library/kit/MENU.md`, about 1,200 tokens, plus `catalog.json` for details): what the planner reads about the kit.
- **Planner agent** (Sonnet). It reads:
  - the tagged script
  - the narration words
  - the catalog
  - `style.md`
  - the creator's decisions

  It writes `edit.json`. Code checks the plan (schema, variety, mix, coverage of every second) and gives the errors back for one fix round.
- **Footage needs:** a segment can ask for footage it doesn't have ("stock: server racks at night"). The Cut page shows these as slots to fill: your clip, a screen recording, or later Pexels.
- **Target:** about 20–30k output tokens per video, compared with ~680k for #001's bespoke beats.

## Step C: script board → draft cut, and the four stages
**What you get:** the flow you chose. S3 is tagging the script, S1 is a draft cut you edit card by card.

- **Script board (S3):** the scriptwriter tags every line FACE / GRAPHIC / STOCK / SCREEN / HERO. The Script page shows the tags next to the lines, and you flip a tag with one click. The plan's mix targets are shown live.
- **Cut page:** replaces the beat-centric Edit page.
  - the player, with the live mix kept as it is
  - one card per segment: a template picker (filtered by mode), prop fields generated from the template's schema, a media slot, layout buttons and the transition
  - every change saves to `edit.json` and re-renders only that segment
  - "Ask the team" re-plans just one segment, with your note and attachments (Sonnet)
  - notes, whole-video notes and the music panel carry over
- **Four gates:** Plan (idea + research + plan), Script, Record, Cut, then Package. This changes the `status.md` template, the `studio` skill and its stage files, the board, the video page and `CLAUDE.md`. Existing videos keep working: video 001 stays readable as it is.

## After that
- Stock footage from Pexels (needs your free API key) and image slots.
- The face templates: punch-in captions, a callout beside you, text behind you (person cut-out with a local matting model).
- Hero moments: bespoke Opus scenes, opt-in, with a budget cap.
- Package + private upload.

## Order and size
| Step | Agent usage to build it | Creator test |
|---|---|---|
| A | none at runtime; building it is ordinary coding in this session | record 1 min with face cam, watch the render |
| B | one Sonnet run per video | run it on that recording |
| C | none at runtime | tag a script, edit the draft cut, approve |

The kit queue keeps running in the background throughout. Before the build starts, its weekly ceiling should come down so building has room. Today it stops at 95%; I suggest 70% while we build.
