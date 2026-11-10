# Stage: research

Goal: a brief the creator can decide from in five minutes, backed by real data.

1. Tell the creator, in one line, that research is starting and roughly what it costs: one Sonnet researcher, a few minutes, a modest share of the usage limit.
2. Dispatch the **researcher** subagent (Agent tool, `subagent_type: researcher`) with the folder path and a summary of `idea.md`. If the researcher agent isn't available in this session, use a general-purpose agent with `model: sonnet` and tell it to follow `.claude/agents/researcher.md` exactly.
3. When it returns, read `brief.md`. Don't open niche.json unless something looks off. Sanity-check two things:
   - the three angles are genuinely different
   - every fact has a `[n]` that exists in `research/sources.md`
   If either fails, send the researcher back once with the specific problem.
4. Mark research as done in `status.md`, then go to `stages/plan.md`.
