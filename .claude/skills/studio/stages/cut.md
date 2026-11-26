# Stage: edit + graphics and rough cut, on the Cut route

Goal: the approved script (or cue sheet) becomes a watchable cut on templates, in one planner run plus local rendering. `edit/cut.json` is the whole edit: code renders it, and a change re-renders only what changed.

## Tools you may run
- `pnpm cut:check <folder>/edit/cut.json`: checks a plan before anything renders.
- `pnpm cut:render <videoId> [--final]`: renders it to `renders/cut-preview.mp4` (or `renders/cut-final.mp4`), with the narration or, on a music-only video, the track. It writes a four-frame check sheet per segment to `edit/stills/cut/<segment>.jpg` and runs the motion check.
- `pnpm music:beats [trackId] [--start s] [--seconds n]`: the tracks, or one track's beats in video time.

## Steps
1. **Plan.** Dispatch the **cut-planner** (Sonnet, one run) with the folder, and say whether it's music-only. Read its return, then `pnpm cut:check` yourself.
2. **Scenes (Opus, at most 3 unless a creator decision says otherwise).** For each `scene` segment, dispatch the **motion-designer** in Cut mode with the folder, the segment's JSON, its cues and the template files in `basedOn`. One scene per dispatch, at most two at once. If a scene turns out to be something a template does well, have the planner use the template instead.
3. **Render** with `pnpm cut:render <videoId>`.
4. **Look at every sheet** in `edit/stills/cut/` yourself. Block on: clipped or overlapping text, an empty frame, a fact that differs from the script, something that reads as a bug, text too small to read, or the plan's visual direction missing from the hook or the peak (a generic infographic where the plan promised a picture). Send the list to the cut-planner once (for a scene, the motion-designer), re-render, and look again at what changed. At most 2 rounds; then log what's left as known weak spots.
5. **Motion check.** Fix reds. A red you keep needs a one-line reason in `status.md`.
6. **Status.** edit + graphics `done`.
   - **gated mode:** rough cut `waiting for creator`, and say the cut is on the video's page. Their notes come back as `needs changes`: re-plan only the segments they name.
   - **autonomous mode:** approve the rough cut yourself only if no red is open, log why and the known weak spots, run `pnpm cut:render <videoId> --final`, and continue to package.

Never end the run while a subagent is out. Keep a TodoWrite list. Never invent a number, quote or claim: on-screen text follows the approved script or cue sheet.
