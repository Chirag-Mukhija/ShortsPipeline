# Sources (researched 2026-11-12)

Only pages actually read are listed. "Read" means the page text was fetched; "search summary" means I only saw the search tool's quoted abstract or summary, so check the original before the script leans on it.

[1] AI assistance coding skills (Shen and Tamkin), Anthropic, 2026-01-29, https://www.anthropic.com/research/AI-assistance-coding-skills (read): Randomized trial, 52 mostly junior engineers learning the Trio Python library. AI group averaged 50% on the quiz vs 67% hand-coding (Cohen's d = 0.738, p = 0.01), largest gap on debugging. AI group was about 2 minutes faster, not statistically significant. Lower scorers (under 40%) delegated to AI or relied on it progressively; higher scorers (65%+) used AI to ask conceptual questions or asked for explanations alongside code. Limits: small sample, quiz taken right after the task, a sidebar assistant and not agentic tools like Claude Code, no proof that interaction style causes the difference.

[2] Domain expertise still wanted: the latest trends in AI, Stack Overflow blog, 2026-03-16, https://stackoverflow.blog/2026/03/16/domain-expertise-still-wanted-the-latest-trends-in-ai/ (read): 64% of developers use AI to learn, up from 44% in 2025 and 37% in 2024. 68% of early-career developers use AI daily vs 59% mid-career and 56% experienced. Only 1% use AI alone for learning; 58% pair it with technical documentation. 38% cite lack of trust as a barrier. Authors: "There's still a strong place for human-curated and human-generated knowledge."

[3] Stack Overflow Developer Survey 2025 (AI section and press summary), Stack Overflow, 2025, https://survey.stackoverflow.co/2025/ai (search summary only): Learners use YouTube more than professionals (70% vs 60%); top learning resources are documentation (68%), online resources (59%), Stack Overflow (51%). Favorable view of AI: 61% professionals vs 53% learners. Supports "the viewer is on YouTube".
    CORRECTION (fact-check 2026-11-14): the 70% vs 60% figure is YouTube *for community* (Community platforms section), not YouTube for learning, and it isn't on the `/2025/ai` page. Cut from the script.

[4] Deliberate Practice and Performance in Music, Games, Sports, Education, and Professions: A Meta-Analysis, Macnamara, Hambrick and Oswald, Psychological Science, 2014, reported at https://www.sciencedaily.com/releases/2014/07/140716123835.htm (read the press release, not the paper): 88 studies, over 11,135 participants. Practice explained 26% of performance variance in games, 21% music, 18% sports, 4% education, under 1% professions. Authors' framing: practice will not make perfect for all, but will make almost everyone better. The paper's abstract conclusion (via search summary): "important, but not as important as has been argued". Software engineering is not a listed domain.

[5] Consider it done! Plan making can eliminate the cognitive effects of unfulfilled goals, Masicampo and Baumeister, Journal of Personality and Social Psychology 101(4), 2011, https://pubmed.ncbi.nlm.nih.gov/21688924/ (search summary only; the PubMed and APA pages would not load): Making a specific plan for an unfinished goal eliminated the intrusive, interfering effects of that goal on later tasks. Verify the abstract before quoting. Lab studies on everyday goals, not on programmers. (Fact-check 2026-11-14: lab design and "eliminated" confirmed via the NCBI copy; "everyday goals" not confirmed on the primary page.)

[6] Improving Students' Learning With Effective Learning Techniques, Dunlosky, Rawson, Marsh, Nathan and Willingham, Psychological Science in the Public Interest, January 2013, https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html (read the APS summary): Of 10 techniques, practice testing and distributed (spaced) practice rated high utility; rereading, highlighting and summarization rated low. Studied mostly with students and school-type material, so applying it to learning AWS or protocols is an extension.

[7] Entrepreneurship / Balanced Skills (Lazear), NBER Working Paper 9109, August 2002 (later Journal of Labor Economics, 2005), https://www.nber.org/papers/w9109 (read abstract page): Using Stanford alumni data, breadth of experience across many roles was the strongest predictor of becoming an entrepreneur. About entrepreneurs, not employees; do not stretch it to "generalists earn more".

[8] The Role of Deliberate Practice in the Acquisition of Expert Performance, Ericsson, Krampe and Tesch-Romer, Psychological Review 100(3), 1993, via https://stafforini.com/works/ericsson-1993-role-deliberate-practice/ (search summary only): Origin of "deliberate practice". Search results also note a 2019 replication attempt (Macnamara and Maitra) that did not reproduce the core finding. Use only as context for [4].

## Checked but not used
- Barnett and Ceci 2002 (far transfer), Gollwitzer and Sheeran 2006 / Sheeran et al. 2024 (implementation intentions), Amabile and Kramer 2011 (small wins): the original pages would not load or showed only a summary, and search-summary effect sizes disagreed (implementation intentions d = 0.65 in 2006 vs about 0.27 to 0.36 in a 2024 meta-analysis). Do not cite unless someone reads the originals.

## Missing, which would help
- No study found that directly compares "stick with one stack for a year" against "keep sampling" for self-taught developers. Say so on camera.
- No hard number found for how fast specific tech skills go stale.
- YouTube `published` dates were null in niche.json, so video ages are unknown.
