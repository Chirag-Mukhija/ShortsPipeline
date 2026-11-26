# Status

Started {{DATE}}.
Mode: chat   <!-- chat | gated | autonomous; see the studio skill -->
Audio: voice   <!-- voice | music; see .claude/skills/studio/music-only.md -->
Title:   <!-- the current working title; the showrunner keeps it up to date -->

The showrunner updates this after every stage. Downstream agents read the decisions and must respect them.

| Stage | State | Output |
|---|---|---|
| idea | in progress | idea.md |
| research | not started | brief.md, research/ |
| plan | not started | plan.md, package.md (**creator gate**) |
| script | not started | script.md, factcheck.md (**creator gate**) |
| record | not started | record/narration.wav (you record it on the Record page; skipped on a music-only video) |
| edit + graphics | not started | edit/cut.json, edit/scenes/cut/, renders/cut-preview.mp4 |
| rough cut | not started | renders/cut-preview.mp4 watched on the video's page (**creator gate**) |
| package + upload | not started | renders/final.mp4, package/upload.json, package/thumbnail.png, then a private upload (**creator gate**) |

## Creator decisions
Newest last. Format: `- YYYY-MM-DD <stage>: <decision, in the creator's words where possible>`

## Notes for the next stage
