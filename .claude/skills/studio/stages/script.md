# Stage: script (creator gate)

Goal: a script the creator can read aloud on the first try, every claim backed, every beat with a visual.

On a music-only video (`Audio: music`), `script.md` is a **cue sheet** with no spoken lines; see `../music-only.md`. Tell the scriptwriter and the fact-checker it's music-only. At the gate, show the cue count and the runtime summed from the cues instead of words per minute. After approval, the next step is capturing the footage in the plan; there is nothing to record.

1. Check that `~/.claude/youtube/voice.md` exists. If it doesn't, offer to run the `voice-profile` skill first (about 10 minutes, and it makes every future script sound like them). In autonomous mode, or if they decline, carry on and note in `status.md` that the script was written without a voice profile.
2. Dispatch the **scriptwriter** subagent with the folder. It follows `../sketches.md` for any sketches in the inbox.
3. Then dispatch the **fact-checker** subagent with the folder.
4. If there are FLAGs: fix the wording yourself when it's clearly an overstatement, and fix the citation when the source is merely wrong. Ask the creator only when a flag changes the story.
5. Show the creator:
   - the two hooks with their scores
   - the runtime
   - the beat list
   - anything the fact-checker flagged and how it was fixed
   - the Sketch notes, especially any pushback (in gated mode, pushback goes into `questions.json`)

   Then **stop** (in autonomous mode, approve it yourself once the fact-check has no open flags, log why, and continue). They read `script.md` and can edit it directly, or give notes. Notes go into `status.md`, and you re-run the scriptwriter with them. Mark script as done only when they approve.
6. After approval, tell them what comes next: recording. The record stage arrives in the next build step.
