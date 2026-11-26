# Stage: edit + graphics, and the rough cut

Goal: turn the recorded narration (or, on a music-only video, the approved cue sheet and the chosen track) into a finished cut. Every beat's graphics are built and checked one beat at a time, then assembled with a mixed soundtrack for the creator to review on the website's Edit page.

**Read `packages/video/src/library/DIRECTION.md` first.** It holds the cinematography rules above every theme (one world with a camera, shot sizes, motivated transitions, living surfaces, rhythm), and every shot plan and beat must follow it. The plan and its reasons are in `docs/EDIT-STAGE-PLAN.md`. The motion library rules are in `packages/video/src/library/README.md`. The quality bar is `packages/video/src/oneshot/Beats12.tsx` (video 001, Beats 1–2), which the creator scored top on every point.

## Which route
- **Cut route (the default for every new video, and always for music-only): follow `cut.md` and stop reading here.** It plans the whole video on templates with one Sonnet run.
- **Beat route (the rest of this file):** hand-coded Opus scenes, about 1,900 output tokens per second of video. Only for a video that already has `edit/edit.json`, or when a creator decision in `status.md` asks for hand-coded beats in so many words. Never choose it yourself, in any mode. It can't render a music-only video.

## Tools you may run
- `node scripts/beat-context.mjs <videoId> <beatId>`: writes the designer's context pack to `edit/context/<beat>.md`.
- `node scripts/render-stills.mjs <videoId> <beatId> [--at t1,t2]`: typechecks the scenes and renders stills plus a contact sheet into `edit/stills/<beat>/`.
- `node scripts/assemble.mjs <videoId> [--beats beat-02]`: renders changed beats as cached clips, joins them, and mixes narration with the music bed into `renders/preview.mp4`.

## 1. Edit plan (once, if `edit/edit.json` doesn't exist)
1. **Beats.** One beat per `## Beat N` in `script.md`.
   - `start` is the first word of that beat in `record/narration.json` (its `beat` field), minus 0.3 s. The first beat starts at 0. Each beat ends where the next starts.
   - `duration` is the narration's `duration`.
   - `scene` is `scenes/beat-NN.tsx`, `label` is the beat title, and `status` is `planned`.
   - On a music-only video, the beats come from the cue sheet and the track's BPM grid (`.claude/skills/studio/music-only.md`).
2. **Theme.**
   - A `Creator decisions` line picking a look wins.
   - Otherwise, match `plan.md`'s Look and feel to a theme in `data/library/catalog.json`.
   - If two or three themes fit and none clearly wins:
     - **gated mode:** ask in `questions.json` (one question naming the candidates and what each would feel like; the creator can browse them on the Library page)
     - **autonomous mode:** pick one and log why
   - If nothing fits, start a new theme folder under `packages/video/src/library/themes/` following `THEME-BRIEF.md`, and mark its catalog `draft`.
3. **Footage.** Every `[ON SCREEN: SCREEN …]`, `FOOTAGE` or photo cue the creator has to supply becomes a slot in `footage`: `{ id, beat, need, seconds }`, where `need` says exactly what to record or shoot. Slots render as a labelled placeholder until uploaded, so never wait on them.
4. **Music.** If the creator picked a track that is in `data/library/music/tracks.json`, set `music: { trackId, title, credit }`. Otherwise leave `music: null` and add a note for the creator: "pick a track in the Edit page's Mix panel". Set `mix` to the defaults (voice 0 dB, music −6 dB, dip 8 dB, fades 2 s / 3 s). Library tracks are loudness-levelled when added, so these defaults fit any track.
5. **Style brief and shared style.**
   - Write `edit/style.md` (a few lines): theme skin, accent, surface recipe, life language, one emphasis form, the transition set (at least two kinds, one with depth), camera temperament.
   - Write `edit/scenes/style.ts`, exporting `STYLE`: the video's colours (from the theme's tokens), fonts, pacing and text sizes. This is the guardrail that keeps beats built on different days looking like one video: every beat imports its colours, fonts and pacing from it and hardcodes none. Video 001's `edit/scenes/style.ts` is the example.
6. **Shot list (the storyboard).** For every beat, write `shots` in `edit.json`: one shot per idea, `{ id, beat, at, subject, action, size, move, text, transitionOut }`.
   - `at` is the video second the shot starts, landing on its word from the narration's timings.
   - `subject` is a noun and `action` a verb phrase.
   - `size` is one of wide, medium, mcu, cu, ecu; `move` is one of hold, push, pull, glide, whip, cut.
   - `text` is the on-screen words: 8 at most, often none.
   - Follow DIRECTION.md's variety rules: no 3 pushes in a row, fast moves in at most a third of shots, every push answered by a pull or glide.
7. **Render the storyboard:** `node scripts/assemble.mjs <videoId> --animatic`. This writes `renders/animatic.mp4`: labelled boxes and a moving camera over the narration, which costs no designer tokens.
8. **Status and gate.**
   - **gated mode:** set `storyboard: "draft"` and edit + graphics to `waiting for creator`, log the theme choice, and stop. The creator watches the Storyboard view on the Edit page, changes shots there, and presses **Approve storyboard**. That sends a message to build the beats.
   - **autonomous mode:** approve it yourself, log why, and continue.

## 2. Build the beats, one at a time (only after the storyboard is approved)
For each beat whose `status` is `planned` (or `building`), in order. The approved shots are the brief: the designer builds them shot by shot, using the core camera rig, surfaces and transitions with the theme as the skin.
1. Run `node scripts/beat-context.mjs <videoId> <beatId>`.
2. Dispatch the **motion-designer** agent with: the video folder, the beat id, and the context-pack path. **One beat per dispatch, never the whole video in one go**: a fresh context per beat keeps quality from falling off toward the end.
3. When it returns, check that `edit/stills/<beat>/_sheet.jpg` exists and look at it yourself. **Red** QA flags (a blank or near-black frame, unreadable text, nothing moving across a shot, more than 8 words on screen) block the beat until fixed, at most 3 rounds. Yellow flags are only reported to the creator. If something is clearly broken (clipped text, an empty frame, the wrong theme), send it back once with the specific fix.
4. Set the beat's `status` to `ready` in `edit.json`.

Keep at most two designers running at once (the laptop renders stills): dispatch a pair in one message and wait for both results before the next pair. Never end the run while a designer is still working, because ending the run kills it. Mark each beat `ready` as soon as it passes, so a run cut short by the usage limit resumes at the first beat still `planned`.

## 3. Assemble and stop at the gate
1. Run `node scripts/assemble.mjs <videoId>`.
2. Set edit + graphics to `done` and rough cut to `waiting for creator`.
3. Tell the creator in one line: the cut is ready on the Edit page. That's where they mix voice and music, redo beats with notes, upload footage and approve.

## Redoing one beat
A message starting `[edit] Redo beat-NN only` comes from the Edit page. The current scene is already saved as a take.
- Run the context pack again.
- Dispatch the motion-designer for that beat with the creator's note **quoted exactly**.
- Re-check the stills, set the beat to `ready`, and run `assemble.mjs --beats beat-NN`.
- Touch nothing else.

## Rough-cut notes
A message starting `[edit] Notes from the creator` lists notes. Moment notes have a time and a beat; whole-video notes start `WHOLE VIDEO`.
- Do the whole-video notes first (next section), because they change every beat.
- Group the moment notes by beat. For each affected beat, do what "Redoing one beat" says, passing all of that beat's notes.
- Re-assemble once at the end, then set rough cut back to `waiting for creator`.

## Whole-video notes
These are standing direction for the whole video, such as "darker background", "orange instead of yellow" or "faster pacing".
- Change `edit/scenes/style.ts` once, yourself; don't dispatch a designer for a token change. A colour or font change is just a token. A pacing change sets `pacing` there.
- Check each built beat for places that don't read `STYLE` (a hardcoded colour, or a library piece left on its own default colour) and pass the style value in. If pacing changed, the beats need their timings retuned: dispatch the motion-designer per beat, one at a time, with the note quoted.
- Log the note under `## Creator decisions` in `status.md`, so beats built later follow it too (the context pack carries it).
- Render stills for every built beat, check them, then run `assemble.mjs` once: every beat re-renders, because `style.ts` is part of each beat's cache key.
- Be honest in your report about anything a token can't reach yet, such as a colour baked inside a library piece with no prop for it.

When the creator approves on the Edit page, the website marks edit + graphics and rough cut `done` and logs the approval. The next stage is package (not built yet).

## Rules that always hold
- **Never invent:** no number, quote or claim the script doesn't have. On-screen text follows `record/transcript.md` where the creator said something different.
- **Footage is never used raw:** it goes through the theme's frame, crop, zoom and colour treatment.
- **Respect the creator's decisions** in `status.md` above everything here.
- **One design across the video:** colours, fonts and pacing come from `edit/scenes/style.ts`, never from a beat's own constants.
- **Attachments:** sketches and screenshots the creator attaches on the Edit page land in `inbox/` with a note naming the beat (`Beat N redo: …`, `Beat N note at m:ss: …`) or `Whole video: …`. The context pack lists them; the designer opens each one.
