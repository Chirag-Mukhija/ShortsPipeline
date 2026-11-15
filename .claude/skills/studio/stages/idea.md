# Stage: idea

Goal: capture the creator's idea faithfully, plus only the facts research can't find.

On a music-only video (`Audio: music` in `status.md`), follow `../music-only.md` for what to ask instead. In chat mode, if no `idea: the creator chose …` decision is logged yet, also ask whether they'll voice the video or make it music only.

1. In `idea.md`, keep the creator's own words under "In the creator's words". Never paraphrase them there.
2. Under "What we know", write down what the conversation already tells you.
3. Ask only for what's still missing and that only the creator can answer (in autonomous mode, decide these yourself instead and log them). Ask in **one** question round (AskUserQuestion in chat mode, `questions.json` in gated mode) with at most 4 questions, and offer sensible options:
   - who it's for (one specific viewer, not "everyone")
   - the one thing the viewer should leave with
   - length or format preference (long-form 8–15 min is the default; Shorts are cut from it later)
   - anything that must be in, or must stay out
   Don't ask what research can answer (what's popular, what's been done).
4. Record the answers in `idea.md` and log them as decisions in `status.md`. Mark idea as done.
5. Go straight on to `stages/research.md`.
