---
name: voice-profile
description: >-
  Build or refresh the creator's voice profile (~/.claude/youtube/voice.md) from
  a short recording of them talking plus a quick interview, so every script
  sounds like them. Use for "/voice-profile", "make scripts sound like me",
  "set up my voice", or when the script stage finds no voice.md.
---

# voice-profile

Every `yt-*` skill and the scriptwriter read `~/.claude/youtube/voice.md`. The creator has few videos of their own, so build it from how they actually talk, not from how they write.

## 0. Practice samples from the website
The board's **Voice practice** card saves recordings plus their transcripts to `~/.claude/youtube/samples/` (one `.txt` per sample, with its topic). When you run this skill, read every sample `.txt` newer than `voice.md` first. If any exist, skip steps 1–2: refine voice.md from them (new verbatim lines, new tics, words that keep coming up) and keep everything the creator already confirmed. Then go to step 4.

## 1. Get a real sample of their speech
Ask the creator to record **2–3 minutes** of themselves talking naturally:
- with the Maono mic, using QuickTime → New Audio Recording, or Voice Memos
- about the video they want to make, or how they'd explain this studio to a friend
- unscripted, with no retakes: the ums and tics are the point

They save the file and tell you where it is. Then run:
`pnpm transcribe "<file>"`
This writes `<name>.txt` and `<name>.srt` next to the file, using offline Whisper (the first run takes a few minutes to build it). The default model is `small.en` (good with Indian-accented English). Videos are in English; Hinglish recordings come back translated, not verbatim.

Measure their pace: count the words in the `.txt` and divide by the minutes, taken from the last timestamp in the `.srt`.

## 2. A short interview
Use one AskUserQuestion call, at most 4 questions, with options plus their own words:
- who they picture watching: one specific person
- the tone they want: for example calm explainer, hyped, dry and funny
- words or phrases that aren't them, such as "unlock", "game-changer", "dive in"
- what they will never claim: results they don't have, tools they haven't used

## 3. Write `~/.claude/youtube/voice.md`
Use the headings of `.claude/skills/voice-profile/voice-template.md` (from the yt-skill pack):
- Who I am talking to
- How I actually talk (excerpts from the transcript, verbatim, tics included)
- Words I never use
- Words I do use
- What I will not claim
- My format (voice-led, webcam A-roll, long-form first)

Add a line `Pace: <n> words per minute (measured <date>)`. The scriptwriter uses it for runtime estimates.

Create `~/.claude/youtube/` if needed. Don't keep the recording or transcript anywhere else unless the creator asks.

## 4. Confirm
Show the creator the "How I actually talk" and "Words I never use" sections and ask whether that's them. Change what they correct.
