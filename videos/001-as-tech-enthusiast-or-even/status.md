# Status

Started 2026-11-12.
Mode: gated
Title: AI Can Code. So What Should I Actually Learn?

The showrunner updates this after every stage. Downstream agents read the decisions and must respect them.

| Stage | State | Output |
|---|---|---|
| idea | done | idea.md |
| research | done | brief.md, research/ |
| plan | done | plan.md, package.md (**creator gate**) |
| script | done | script.md, factcheck.md (**creator gate**) |
| record | not started | record/narration.wav (you record it on the Record page) |
| edit + graphics | not built yet | |
| rough cut | not built yet | (**creator gate**) |
| package + upload | not built yet | (**creator gate**) |

## Creator decisions
Newest last. Format: `- YYYY-MM-DD <stage>: <decision, in the creator's words where possible>`
- 2026-11-12 idea: Who is the one viewer this video is for? → "for both a tech enthusiast self taught learner , early career developer and a college student in tech"
- 2026-11-12 idea: What should the viewer leave with? (Research will check this holds up; you can also let research propose it.) → "Let research decide"
- 2026-11-12 idea: How long should it be? → "8-12 min long-form"
- 2026-11-12 idea: Anything that must be in, or must stay out? Pick all that apply. → "Honest, not guru"
- 2026-11-12 plan: Which angle should this video take? The biggest outlier in this space is "Vibe Coding is a Trap" (DevForge, 85x its channel median), and it opens on a fear hook. Nobody has told an honest personal chain like yours. You can mix angles, or write your own. → "3. AI Can Code. So What Should I Learn?"
- 2026-11-12 plan: What should it look and feel like? → "the theme could be a hand-drawn chain on ipad rather than a clean dark dev UI , beause Clean dark is always the default what claude gives so it will be a change this does not mean , i will do the animation myself on my ipad , the theme would look and feel like that again this is a testing only , nothing could go wrong ."
- 2026-11-12 plan: Roughly how long did your whole chain take, from networking to leaning into DevOps? The title and the story use the real number, never a made-up one. → "A few months"
- 2026-11-12 plan: Did you finish anything along the chain, even something small? A real finished artifact (or an honest 'nothing yet') anchors the story. → "i try to finish something substantial just to give that sense of relief after switching to myself,  but mostly what i finish is often made from coding agents like claude so no manual work there . only thing i have stick with since the start is DSA because that is something i am still sure about will last atleast 5-6 years more , where it would be relevent to check someones thinking process and problem solving"
- 2026-11-14 plan: APPROVED by the creator
- 2026-11-14 script: Your Beat 1 sketch draws the chain as Custom Protocol → Backend → Claude Code → System Design. Your story (idea.md and the spoken line) goes Protocol → Claude Code → Backend → System Design. The script follows the story order so the picture matches the words. Which order is right? → "Story order (as scripted)"
- 2026-11-14 script: Beat 2 has an optional line: "Looking back, I did feel some of it carried over between the topics." It came from the researcher's guess, not from you. Is it true for you? → "Keep it"
- 2026-11-14 script: Beat 2, written from your answer: "I try to finish something substantial, just to get that feeling of relief after I switch. But mostly what I finish is made by coding agents like Claude, so there's no manual work from me there." Does that sound like you, and is "no manual work from me" exactly right? → "we can make it something like i was running from hardwork in that thing because i switched over and going back to it was hard (something like this)"
- 2026-11-14 script: APPROVED by the creator

## Notes for the next stage
- idea: the "What we know" section of idea.md is filled in from the creator's words. The website shows four questions (viewer, takeaway, length, must-in/must-out). Once they're answered, record the answers in idea.md, mark idea as done, and go straight into research.
- research (done 2026-11-12): brief.md has three angles and a proposed takeaway: "Nothing is guaranteed. But you can improve your odds: finish small real things on one main thing, learn by recalling and spacing, ask AI to explain rather than do, and park new ideas instead of chasing them." Treat "one year on one thing" as the creator's judgment, not a finding. The showrunner removed an invented "in 2 months" from angle 1's title.
- plan: questions.json asks for the angle, the look, the chain's real timeframe, and whether anything was finished. Once they're answered, write plan.md from them, dispatch the packager, then stop for approval.
- plan: the creator wants to sketch scenes (2026-11-12). Their sketches come in through the inbox and follow `.claude/skills/studio/sketches.md`. Write plan.md's Structure as a numbered beat sheet they can sketch against. Sketches added at the plan gate go into the script stage's visuals; the plan isn't redone for them.
- plan (2026-11-12): plan.md written from the four answers: an 8-beat sheet, ~10:00, with the creator's chain as the spine and DSA as the one link they kept (Beat 5). package.md recommends "AI Can Code. So What Should I Actually Learn?" with the thumbnail text "WHICH LINK STAYS?". Runner-up: "AI Wrote Most of My Projects. Now What?". Waiting for approval only, so there's no questions.json.
- plan, check at the gate: the look answer says "this does not mean , i will do the animation myself on my ipad". plan.md reads it as "the studio builds the hand-drawn look; the creator doesn't animate it". If the creator corrects this, update the plan's Look and feel.
- script: "a few months" (chain timeframe) and "at least 5-6 years" (DSA's relevance) are the creator's own words and judgment. Script them that way, never as findings or precise numbers. Beat 2's line about finishing things with coding agents should be confirmed in the creator's voice.
- plan + script, caveats to carry forward:
  - Sources [3] (SO survey 2025) and [5] (Masicampo & Baumeister) are search summaries only. The fact-checker must verify them before the script quotes them.
  - [1] is Anthropic's own study and the creator uses Claude Code, so disclose that on camera if [1] is used.
  - "What carried over" between topics is the researcher's inference. It goes in only if the creator confirms it.
  - Use the creator's pronouns only if they state them. Otherwise use "they" or "the creator".
- script (2026-11-14): written with the voice profile (~/.claude/youtube/voice.md). Hook A chosen (57, Workable): "If you keep switching tech, and AI writes your code anyway, what are you even learning? I don't stop switching either." Runner-up B (55). About 1,750 spoken words, roughly 10:00–11:00. The 8 beats follow plan.md. The Beat 1 sketch is used for structure only (the chain slides up and blurs out, the question pops in word by word, "learning" is highlighted), with no pushback.
- script fact-check: 38 claims, 11 FLAGs, all fixed by the showrunner (see factcheck.md "Resolutions"). The biggest change: the Stack Overflow 70% vs 60% YouTube line was cut, because the figure is YouTube *for community*, not for learning. sources.md [3] and [5] are annotated.
- script gate: questions.json asks for the chain order (sketch vs story), the optional "carried over" line (keep or cut) and the Beat 2 agents wording. Apply the answers to script.md. Once the creator approves, the next stage is record, which is not built yet.
- script (2026-11-14, answers applied): (1) the chain stays in story order; the sketch-order note was removed. (2) The "carried over" line is now a normal spoken line at the end of Beat 2. (3) The Beat 2 admission was rewritten from both of the creator's answers: "But mostly, I let coding agents like Claude finish it. And honestly, I think I was running from the hard work. I'd already switched, and going back to do it myself was hard." Beat 1's "an AI agent wrote" line and Beat 4's "made by agents" line stay as they were, because they still match. No new factual claims, so no re-fact-check was needed. No `[CONFIRM WITH CREATOR]` markers are left. Waiting for approval only, so there's no questions.json.
- 2026-11-12 inbox: the creator added inbox/20261112T064002-screenshot-2026-11-12-at-12-07-49-pm.png (for a beat): "Beat 1: Want: as specified the chaining is fine , but the text text should be popping and main highlight at the end, either the chain should go up or blur out and the text should have popping motion , as i speak From the sketch: only the strucuture what is mentioned"
