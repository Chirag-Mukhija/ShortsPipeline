---
name: studio
description: >-
  Run the creator's video studio - start a new video from an idea, continue the
  current video to its next stage, or show where every video stands. Use for
  "/studio new <idea>", "/studio next", "/studio status", "I have a video
  idea", "let's work on my video", "what's next", or any work inside videos/.
---

# studio

You are the showrunner (see CLAUDE.md). This skill is the chain of commands: it finds the video, runs its next stage, and stops at every creator gate.

## Pick the command from the arguments
- **`new <idea>`**: run `python3 .claude/skills/studio/tools/new_video.py "<idea>"`. Add `--audio voice` or `--audio music` if the creator already said whether they'll voice it; otherwise the idea stage asks. It prints the new folder. Then run the **idea** stage.
- **`next [folder]`**: use the named folder, or else the most recently modified one in `videos/`. Read its `status.md` and run the first stage that isn't done.
- **`status`**: for every folder in `videos/`, give one line with its title and current stage. Nothing else.
- **No arguments**: treat it like `next` if a video is in progress; otherwise ask for the idea.

## Modes: who answers the questions
Read the mode from the prompt's `[studio-run ...]` tag, or from the `Mode:` line in `status.md`. Default to **chat**.
- **chat**: the creator is in this conversation. Ask with AskUserQuestion.
- **gated**: launched by the studio website, and nobody can answer mid-run. When the creator must **choose**, write `<folder>/questions.json`. When they only need to **approve** a finished gate, skip questions.json. Either way, set the stage to `waiting for creator` in status.md and end the run; the website shows Approve and Notes buttons. Format:
  `{"stage": "plan", "asked": "<ISO date>", "questions": [{"id": "angle", "question": "...", "header": "<=12 chars", "multiSelect": false, "options": [{"label": "...", "description": "..."}]}]}`
  The website writes their answers into status.md as creator decisions and removes `questions.json`. The next run starts automatically: read the answers there and carry on. An approval appears as `<stage>: APPROVED by the creator`, with the stage already marked done. Change requests appear as the stage state `needs changes`, with the notes in the decisions; redo that stage with them.
- **autonomous**: the creator has delegated the creative calls. At every gate, decide yourself:
  - base each decision on the brief's evidence, the creator's profile and their logged decisions
  - log it in status.md as `- <date> <stage>: DECIDED BY SHOWRUNNER (autonomous): <decision>. Why: <one line>`
  - keep going without stopping

  The creator can overrule any of these later; their word always wins.

## Voice-over or music only
Read the `Audio:` line in `status.md`. `voice` (the default, and what a missing line means) is a voice-over the creator records. `music` means no voice at all: the visuals and on-screen text carry the video, so they must be stunning and specially curated. For a music-only video, read `music-only.md` before any stage. It changes what each stage asks, writes and dispatches, and every subagent you dispatch must be told the video is music-only. Once the plan is approved, the choice is locked.

## Stages
Read only the playbook for the stage you are running:

| Stage | Playbook | Ends with |
|---|---|---|
| idea | `stages/idea.md` | idea.md filled in |
| research | `stages/research.md` | brief.md (researcher) |
| plan | `stages/plan.md` | plan.md + package.md, **creator gate** |
| script | `stages/script.md` | script.md + factcheck.md, **creator gate** (a cue sheet on a music-only video) |
| record | the creator, on the website's Record page | no agent work: tell the creator to open the Record page (teleprompter, takes, cut by text, export). It writes `record/narration.wav`, `narration.json` (word timings), `narration.srt` and `transcript.md`, and marks the stage done. `transcript.md` is what was actually said, so it wins over `script.md` wherever they differ. On a music-only video the state is `skipped` and nothing is recorded |
| edit, rough cut, package, upload | not built yet | tell the creator this stage is coming in a later build step |

## Every stage, every time
- **Before:** read `status.md`. The creator's decisions there override everything else, including this playbook.
- **State words:** the State cell of the stage table holds exactly one of `not started`, `running`, `waiting for creator`, `needs changes`, `done`, `skipped` (only the record stage of a music-only video). The website reads them. Put any detail in the decisions, never in the cell.
- **Title:** keep the `Title:` line at the top of `status.md` set to the current working title. Update it whenever a title is decided or changed; the website shows it as the video's name.
- **After:** update `status.md`: the stage's state, its outputs, any decision the creator made (in their words), and notes for the next stage.
- **Moving on:** idea and research run back to back. At a gate, stop and wait for the creator.
- **Ending the turn:** suggest continuing with `/studio next` in a fresh session. State lives in the folder, and a fresh session is much cheaper than a long one.
