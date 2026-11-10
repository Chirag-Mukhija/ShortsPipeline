# ClipForge Studio: state of the project (2026-11-10, end of day)

## Where we are
The project is reset to **idea → research → plan → script**, the part that worked. Tomorrow's goal is to test and refine those stages on your own topics until the script is right. Then build the next stage, one step at a time.

The first production attempt (record, editing, motion graphics, rough cut) is **parked**, not deleted:
- **Code:** git branch `archive/production-attempt`. To look at it: `git checkout archive/production-attempt`, then `git checkout master` to come back.
- **Video 1** (brief, plan, script, rough cut, takes) is in `../clipforge-archive/001-claude-video-studio/`.
- **Why it's parked:** the rough cut still looked like the old Shorts pipeline. Production gets redesigned later, after scripting is solid.

## What exists now
- **Website:** `pnpm dev`, then http://localhost:5173. It uses your `STUDIO_PASSCODE` from `.env`.
  - **Board:** start a video from a typed or dictated idea, or a voice memo. Pick "ask me at each gate" for testing.
  - **Video page:**
    - questions as buttons
    - Approve or Redo-with-notes at the plan and script gates
    - documents you can read and edit (Brief, Plan, Title & thumbnail, Script, Fact-check, Sources, Idea, Status)
    - live feed
    - **Talk to the showrunner** box
    - inbox for sketches and screenshots
    - decision log
  - **Header:** your Pro 5-hour usage. Runs pause at the limit.
- **Team:** researcher, scriptwriter and packager on Sonnet 5.5; fact-checker on Haiku 5.5; the showrunner on Opus 5.5. Rules are in `CLAUDE.md`; stage playbooks are in `.claude/skills/studio/stages/`.
- **Skills:** `/studio new | next | status`, `/voice-profile`, and the `yt-*` YouTube craft skills.
- **Tools:** `pnpm transcribe <file>` gives a `.txt` + `.srt` from local Whisper. `niche.py` finds YouTube outliers by multiple of each channel's median.

## Tomorrow: testing the scripting stages
1. **Run `/voice-profile` first.** Record 2–3 minutes of yourself talking in Hinglish, so scripts sound like you.
2. **Start a video** with your own topic, plus a few lines of explanation of what you want, in **gated** mode.
3. **At each step check:**
   - **research:** are the outliers real and relevant? Spot-check 3 sources.
   - **plan:** did it pick the angle you would? Use Redo with notes if not.
   - **script:** read it aloud. Is it your language and your pace? Are the facts true?
4. **Use the Talk to the showrunner box**, or edit documents directly, instead of long chat sessions. Every change is logged in `status.md`.
5. **Write down what's off.** Fixes go into the agent files (`.claude/agents/*.md`) and stage playbooks, one change at a time, then test again.

## Not built (on purpose, for now)
Record → edit + motion graphics → rough cut → package → upload, and setup on the Victus.
