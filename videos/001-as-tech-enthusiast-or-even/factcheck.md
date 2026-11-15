# Fact-check: AI Can Code. So What Should I Actually Learn?

Checked 2026-11-14 against `script.md`. Primary pages were fetched where they loaded. Where they did not, the check says so.

Verification status of sources:
- [1] Anthropic: read the primary page.
- [2] Stack Overflow blog: read the primary page.
- [3] Stack Overflow 2025 survey: read the primary page at `/2025/` (the `/2025/ai` URL in sources.md has no YouTube figure). The 70% vs 60% figure is real but measures YouTube for **community**, not for learning.
- [4] Macnamara 2014: read the ScienceDaily press release only. The paper was not read.
- [5] Masicampo and Baumeister 2011: the PubMed page, Europe PMC and APA pages did not load. The condensed abstract came from the NCBI E-utilities copy. The page does not state the goal types or participants.
- [6] Dunlosky 2013: read the APS summary.
- [7] Lazear 2002: read the NBER abstract page.

| Beat | Claim | Verdict | Reason |
|---|---|---|---|
| 1 (L43) | Hook: "If you keep switching tech, and AI writes your code anyway..." | PASS | Creator's own framing and opinion. |
| 1 (L47) | Went from networking to custom protocol to Claude Code, backend, system design, AWS and DevOps "in a few months" | PASS | Creator's own history. "A few months" is their phrase, not a measurement (tagged as such). |
| 1 (L52) | "Most of what I finished along the way, an AI agent wrote." | PASS | Creator's experience. Already on the CONFIRM list. |
| 1 (L60) | "I'm still sorting it out myself." | PASS | Creator's opinion. |
| 2 (L68-82) | Chain story: protocol, Claude Code, backend, system design, AWS/DevOps; switches triggered by videos or use cases | PASS | Creator's own experience. |
| 2 (L84) | "In Stack Overflow's 2025 survey, people who are learning said they use YouTube more than professionals do, around 70% against 60%." [src: 3] | FLAG (wrong measure) | The numbers are right (70% learners, 60% professional developers), but the survey item is YouTube for **community** under "Community platforms", not YouTube for learning. Suggested: "In Stack Overflow's 2025 survey, 70% of people learning to code said they use YouTube for community, against 60% of professional developers." |
| 2 (L86) | On-screen bars "learners 70%" / "professionals 60%", labelled "YouTube use, Stack Overflow 2025 survey" | FLAG (wrong measure) | Same problem as L84. Suggested label: "YouTube for community, Stack Overflow 2025 survey". |
| 2 (L88) | "Mostly what I finish is made by coding agents like Claude, so there's no manual work from me there." [own] | PASS | Creator's own statement. Already on the CONFIRM list for wording. |
| 2 (L94, optional) | "Networking, system design and DevOps do share a few ideas, like latency and scaling." [CONFIRM] | FLAG (uncited) | Outside claim about the subjects, not from any source. The note admits it is the researcher's inference. Either cut it, or rewrite as the creator's own experience: "I felt some of it carried over." |
| 3 (L100) | "I couldn't find a study on it. Nobody I found compared people who stick with one stack for a year against people who keep sampling." [src: none, see Missing] | PASS | The "Missing" section says exactly this: no study directly compares "stick with one stack for a year" with "keep sampling" for self-taught developers. |
| 3 (L104) | Lazear 2002, Stanford alumni data, variety of roles was the strongest predictor of becoming an entrepreneur [src: 7] | PASS | NBER abstract: "by far the most important determinant of entrepreneurship is having background in a large number of different roles." |
| 3 (L106) | "That's about founders, not employees. So I'm not going to tell you generalists win." [src: 7] | PASS | The study is about entrepreneurs. The abstract does not address employee outcomes. |
| 3 (L110) | "Switching isn't proof you're failing. Staying on one thing for a year isn't proven safe either." "A year on one thing is my judgment." | PASS | Creator's opinion. Consistent with the Missing section. |
| 4 (L120) | Anthropic trial: 52 engineers, mostly junior, learned Trio, some with AI, some by hand, quiz right after [src: 1] | PASS | Matches the primary page. |
| 4 (L124) | "Anthropic makes Claude, and I use Claude Code." [own] | FLAG (uncited outside fact) | An outside fact on an [own] line. Either tag it as common knowledge, or cite anthropic.com. Low risk. |
| 4 (L128) | "The AI group averaged 50% on the quiz. The hand-coding group, 67%." [src: 1] | PASS | Matches the primary page. |
| 4 (L128) | "The biggest gap was on debugging." [src: 1] | PASS | Matches the primary page. The article gives no number for the gap. |
| 4 (L128) | "The AI group wasn't faster in any way that counted: about two minutes quicker, which wasn't statistically significant." [src: 1] | FLAG (overstated) | The AI group was about two minutes faster, not significant. "Wasn't faster in any way that counted" implies no speed gain. Suggested: "The AI group was about two minutes faster, but that gap wasn't statistically significant." |
| 4 (L132) | "The people who scored under 40% mostly handed the work to the AI, or leaned on it more and more." [src: 1] | FLAG (overstated) | The article describes the under-40% pattern as a group. Only 4 of 52 were in the delegation pattern. "Mostly" is not in the source. Suggested: "The lowest scorers, under 40%, handed the work to the AI or leaned on it more and more." |
| 4 (L132) | "The people who scored 65% and above asked conceptual questions, or asked for explanations along with the code." [src: 1] | FLAG (overstated) | 65%+ is the average for the high-scoring pattern group, not a rule for every person above 65%. The conceptual-inquiry group had 7 people. Suggested: "The people who asked conceptual questions, or asked for explanations with the code, averaged 65% or more. That was seven people." |
| 4 (L136) | "Small sample, a short task, a quiz straight after." [src: 1] | FLAG (unsupported detail) | "Small sample" and "quiz right after" are in the source. "Short task" is not. Suggested: drop "a short task", or say "a quiz right after the task". Same wording on the on-screen "short task" card (L140). |
| 4 (L136) | The assistant was a sidebar chat, not an agentic tool like Claude Code [src: 1] | PASS | Matches the primary page. |
| 4 (L136) | The study can't prove the way people used it caused the difference [src: 1] | PASS | The authors say the qualitative analysis does not draw a causal link. |
| 4 (L138) | "Most of what I finish is made by agents." [own] | PASS | Creator's experience. |
| 5 (L150) | DSA will stay relevant for "at least the next five or six years" [own] | PASS | Creator's own judgment, labelled as a bet. |
| 5 (L152) | "It's not a fact, and I don't have a study for it." [own] | PASS | Accurate. |
| 6 (L164) | "The tool names changed every few weeks. The thinking underneath didn't." [own] | FLAG (outside generalization on own line) | Industry-wide claim with no source, tagged as the creator's observation. Suggested: "In my chain, the tool names kept changing. The thinking underneath didn't." |
| 6 (L168) | Meta-analysis of 88 studies; practice explained 26% games, 21% music, 18% sports, 4% education, under 1% professions [src: 4] | PASS | Matches the ScienceDaily press release. Numbers come from the press release, not the paper. |
| 6 (L168) | "Software engineering wasn't one of the areas they looked at." [src: 4] | PASS | The press release does not list software or programming. The paper was not read, so this is a press-release check only. |
| 6 (L170) | "The authors' own take was that practice won't make everyone perfect, but it will make almost everyone better." [src: 4] | FLAG (wrong attribution) | That is the press writer's paraphrase ("The researchers conclude that..."), not the authors' words. The only verbatim author quote in the release is Oswald: "no one says that practice will ever hurt you." Suggested: "The press release summed up the research as: practice won't make everyone perfect, but it will make almost everyone better." |
| 6 (L172) | On-screen footer: "Macnamara et al. 2014, 88 studies. Software engineering not included." | PASS | Same press-release caveat as L168. |
| 6 (L174) | Ten study techniques: testing yourself and spacing practice rated high; rereading and highlighting rated low [src: 6] | PASS | APS summary: practice testing and distributed practice rated highest; summarization, highlighting and rereading rated low. |
| 6 (L174) | "Mostly students and school material" [src: 6] | PASS | APS summary: techniques are "commonly used by students" and work for "students of all ages". |
| 6 (L178) | "64% of developers now use AI to learn, up from 44% the year before." [src: 2] | PASS | Matches the primary page: 64%, up from 44% in 2025. |
| 6 (L178) | "Only 1% use it alone." [src: 2] | PASS | Matches the primary page. |
| 6 (L178) | "Most pair it with other things, like documentation." [src: 2] | PASS | Matches the primary page. Documentation pairing is 58%. "Most" follows from only 1% using AI alone. |
| 6 (L180) | On-screen "64%", "1% alone", footer "Stack Overflow, March 2026" | PASS | Article dated 2026-03-16. |
| 7 (L188) | Asking AI to explain first is "closer to the people who scored high", with the causation caveat [src: 1] | PASS | Matches the primary page, including the causation limit. |
| 7 (L192) | Testing yourself and spacing it out, with "the study behind that used students" [src: 6] | PASS | Matches the APS summary. |
| 7 (L196) | "In lab studies, people who made a specific plan for an unfinished goal found it stopped interfering with what they did next." [src: 5] | PASS | Abstract (via NCBI copy): specific plans "eliminated" the intrusive and interfering effects of unfulfilled goals on later tasks. Design: laboratory studies. |
| 7 (L196) | "Those were everyday goals, not programmers, so take it as a nudge." [src: 5] | FLAG (unsupported) | The primary abstract does not state the goal types or participants. "Everyday goals" came from a search summary only. Suggested: "Those were lab studies, not about programming, so take it as a nudge." |
| 8 (L210) | "Built from sources 1, 5, 6" tag | PASS | Advice maps to those three sources, and the creator's own "park it" and "one main thing" wording is labelled as the creator's. |

## Summary
- Claims checked: 38
- PASS: 27
- FLAG: 11 (2 wrong measure, 1 wrong attribution, 1 uncited, 3 overstated, 1 unsupported detail, 1 unsupported goal type, 1 outside generalization on an [own] line, 1 outside fact on an [own] line)

## Notes for sources.md
- [3] should say "YouTube for community" (Community platforms section), not "YouTube use" or "learning resources". The `/2025/ai` URL in sources.md has no YouTube figure.
- [4] should separate the press writer's paraphrase from Oswald's quote.
- [5] should mark "everyday goals" as unconfirmed from the primary page.

## Resolutions (showrunner, 2026-11-14)
All 11 flags were fixed in script.md. None changed the story, so none needed the creator.
- L84 + L86 ([3], wrong measure): cut the stat and its bars. "YouTube for community" doesn't support the point the line was making. The line is now the creator's own: "And the next video is always right there." [own]. A play-button doodle replaces the bars.
- L94 (optional, uncited): changed to the creator's own experience ("I did feel some of it carried over"). It stays behind CONFIRM WITH CREATOR.
- L124: tagged "Anthropic makes Claude" as common knowledge.
- L128: "about two minutes faster, but that gap wasn't statistically significant."
- L132 (x2): "The lowest scorers, under 40%, handed the work…"; "the people who asked conceptual questions… averaged 65% or more." On-screen labels updated to match.
- L136 + L140: dropped "short task". The limits are now "52 people", "quiz right after", "sidebar assistant", "can't prove cause".
- L164: "In my chain, the tool names kept changing."
- L170: attributed to the press release as a paraphrase, not to the authors.
- L196: "Those were lab studies, not about programming."
