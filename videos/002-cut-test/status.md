# Status

Started 2026-11-23.
Mode: chat   <!-- chat | gated | autonomous; see the studio skill -->
Audio: voice   <!-- voice | music; see .claude/skills/studio/music-only.md -->
Title: Cut engine test (face cam)

The showrunner updates this after every stage. Downstream agents read the decisions and must respect them.

| Stage | State | Output |
|---|---|---|
| idea | done | idea.md |
| research | skipped | test video: no outside claims, so no research |
| plan | skipped | test video: the plan is docs/NEXT-BUILD.md Step A |
| script | done | script.md (no fact-check needed: every line is the creator's own project) |
| record | not started | record/narration.wav + record/facecam.mp4 (you record it on the Record page, camera on) |
| edit + graphics | not started | edit/cut.json, renders/cut-preview.mp4 (`pnpm cut:render 002-cut-test`) |
| rough cut | not started | renders/cut-preview.mp4 (**creator gate**) |
| package + upload | not built yet | (**creator gate**) |

## Creator decisions
Newest last. Format: `- YYYY-MM-DD <stage>: <decision, in the creator's words where possible>`
- 2026-11-23 idea: "create a short test video with a ~1-minute script so I can record myself with face cam for the face path"

## Notes for the next stage
- record: record with the camera on. The face cam is used three ways: full frame, the left 920 px of the frame in a split (a centre crop), and full frame under an overlay. So sit centred, head and shoulders, with some room above your head for the punch-in zooms, and look at the lens. Change any line into your own words while recording; what you actually say wins over script.md.
- edit: after the export, the showrunner hand-writes edit/cut.json from record/narration.json (6–8 segments, 5+ templates, adapted where they don't fit), runs `pnpm cut:check`, then `pnpm cut:render 002-cut-test`.
