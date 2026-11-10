# Stage: plan (creator gate)

Goal: the creator chooses what this video *is* before anyone writes a word of script. Real channels decide the packaging first.

1. Present the three angles from `brief.md` to the creator in a few lines each: title, promise, and the evidence for it. Lead with the strongest outlier from the research. Then ask (AskUserQuestion in chat mode, `questions.json` in gated mode; in autonomous mode choose yourself and log why): which angle (they can mix or edit), and the look and feel. For the look, offer 2–3 concrete directions tied to the topic, such as "clean dark UI with screen recordings" or "playful hand-drawn diagrams", not vague moods.
2. Write `plan.md` from their choice:
   - **Angle and promise**: one sentence each
   - **For**: the specific viewer
   - **Length**: target runtime
   - **Structure**: 5–9 beats, one line each, with what's on screen for each (A-roll, screen recording, graphic, B-roll)
   - **Look and feel**: palette mood, type, motion style, references
   - **What the creator records**: A-roll setup, the screen recordings needed, anything to capture beforehand
   - **Out of scope**: what this video deliberately doesn't cover
3. Dispatch the **packager** subagent with the folder. It writes `package.md`.
4. Show the creator `plan.md`'s structure plus the recommended title and thumbnail pairing, then **stop** (in autonomous mode, approve it yourself, log why, and continue). Approving is their call: they can approve, edit the files, or give notes. Log their decision in `status.md`. Only after approval, mark plan as done; the next `/studio next` runs the script stage.
