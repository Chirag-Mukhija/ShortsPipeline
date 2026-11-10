# ClipForge

A personal, local video studio. You bring the idea, you're the face and the voice, and you make the creative calls. A team of Claude agents researches the idea, plans it, writes it in your voice and fact-checks it. Editing and motion graphics are next. You run it all from a website on your Mac, iPad or iPhone.

```
idea → research → plan (your call) → script (your call) → record → edit + motion graphics → rough cut (your call) → package → private upload
                                                          └─ not built yet ─────────────────────────────────────────────┘
```

## Start it

```bash
pnpm install
pnpm dev            # website on http://localhost:5173, server on :4310
```

Type an idea, or upload a voice memo, and press **Start the team**. Each video page shows:
- **what needs you right now**: questions as buttons, or Approve and Notes at a gate
- **the team's documents**, which you can read and edit: brief, plan, title and thumbnail, script, fact-check
- **a live feed** of what the agents are doing
- **a box for talking to the showrunner**
- **an inbox** for your iPad sketches, screenshots and clips; the agents read it

**How it runs:**
- Videos run in one of two modes:
  - **ask me at each gate**: the agents stop and wait for your decision
  - **fully autonomous**: the agents decide and log why
- The agents are headless Claude Code runs on your Claude plan, one at a time.
- The header shows how much of your 5-hour Pro window is used.
- At the limit, the queue pauses and picks up again after the reset.

## Use it from your iPad or iPhone (home Wi-Fi)

In `.env`:
```
HOST=0.0.0.0
STUDIO_PASSCODE=something-only-you-know
```
Then run:
```bash
pnpm start
```
Open `http://<your computer's IP>:4310` on the iPad or iPhone. The studio won't start on the network without a passcode.

To set aside part of your limit for your own use, set `STUDIO_USAGE_CEILING=0.8`. Runs then stop starting at 80% of the window.

## Needs
- Node 24+, pnpm, ffmpeg, Python 3, `yt-dlp` (research reads public YouTube listings only)
- Claude Code installed and logged in (`claude`, then `/login`)

## How it's organized
- **`videos/NNN-slug/`**: one folder per video. Everything the team produces is a readable file here: `status.md` (stages and your decisions), `brief.md`, `plan.md`, `package.md`, `script.md`, `inbox/`.
- **`CLAUDE.md`**: the showrunner's rules.
- **`.claude/agents/`**: the team: researcher, scriptwriter, fact-checker, packager.
- **`.claude/skills/studio/`**: the chain of stages, and the three modes (chat, gated, autonomous).
- **`.claude/skills/yt-*`**: YouTube craft skills (hooks, packaging, retention, chapters…), from [youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill).
- **`apps/server`**: the API, the agent runner, local Whisper (`pnpm transcribe <file>`), rendering and YouTube upload.
- **`apps/studio`**: the website.
- **`packages/video`**: the Remotion video engine.
- **Quick Shorts**: the older one-click Shorts pipeline, still available as a tab.
  - The engine for it is in `apps/server`.
  - Its docs are [docs/USAGE.md](docs/USAGE.md) and [docs/PIPELINE.md](docs/PIPELINE.md).

## Development
```bash
pnpm test           # unit and HTTP tests (the runner is tested against a fake Claude)
pnpm typecheck
```
