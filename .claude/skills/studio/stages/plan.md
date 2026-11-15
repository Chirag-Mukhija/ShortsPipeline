# Stage: plan (creator gate)

Goal: the creator chooses what this video *is* before anyone writes a word of script. Real channels decide the packaging first.

On a music-only video (`Audio: music`), `../music-only.md` changes the plan. Look and feel becomes the centerpiece, with style frames and a music brief, and each beat becomes a visual sequence. Follow it alongside the steps below, and ask for style-frame sketches at the gate.

0. Check `inbox/index.json` for sketches the creator already added (see `../sketches.md`). If there's a flow sketch, build the Structure from it.
1. Present the three angles from `brief.md` to the creator in a few lines each: title, promise, and the evidence for it. Lead with the strongest outlier from the research. Then ask (AskUserQuestion in chat mode, `questions.json` in gated mode; in autonomous mode choose yourself and log why): which angle (they can mix or edit), and the look and feel. For the look, offer 2–3 concrete directions tied to the topic, such as "clean dark UI with screen recordings" or "playful hand-drawn diagrams", not vague moods.
2. Write `plan.md` from their choice:
   - **Angle and promise**: one sentence each
   - **For**: the specific viewer
   - **Length**: target runtime
   - **Structure**: a numbered beat sheet of 5–9 beats. It's what the creator sketches against, so each beat gets:
     - `Beat N: <name> (~mm:ss)`
     - **Says**: one line on what this beat tells the viewer
     - **On screen**: a proposed visual (A-roll, screen recording, graphic or B-roll), concrete enough to picture, loose enough to redraw
   - **Look and feel**: palette mood, type, motion style, references
   - **What the creator records**: A-roll setup, the screen recordings needed, anything to capture beforehand
   - **Out of scope**: what this video deliberately doesn't cover
3. Dispatch the **packager** subagent with the folder. It writes `package.md`.
4. Show the creator `plan.md`'s beat sheet plus the recommended title and thumbnail pairing. Tell them they can sketch any beat they see differently on the iPad and add it to the inbox as "for a beat" with its beat number, before or after approving. Then **stop** (in autonomous mode, approve it yourself, log why, and continue). Approving is their call: they can approve, edit the files, or give notes. Log their decision in `status.md`. Only after approval, mark plan as done; the next `/studio next` runs the script stage.
