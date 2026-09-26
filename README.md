# ClipForge

A personal, local-first pipeline that turns a topic into a finished vertical tech-explainer short for YouTube Shorts and Instagram Reels. It runs fully automatically, and every step's output is saved so you can inspect it or re-run from any point.

```
topic → angle → script → critic pass → storyboard → Indian-English voice → assets → synced timeline → render → titles & hashtags → publish/export
```

## Quick start

```bash
pnpm install
pnpm dev                     # server on :4310 + studio on http://localhost:5173
```

Or make one short straight from the terminal:

```bash
pnpm make "How does UPI move money between banks in two seconds?"
```

About 5 minutes later you get a 1080×1920 MP4 at -14 LUFS plus a ready-to-post folder in `data/exports/` (`short.mp4`, `poster.jpg`, `youtube.txt`, `instagram.txt`).

**Needs:**
- Node 24+, pnpm and ffmpeg.
- A writer: either the Claude Code CLI, logged in (the default; no API key, uses your Claude plan), or an Anthropic, Gemini or OpenAI key.
- Internet for the voice and fonts.

## Docs

- **[docs/USAGE.md](docs/USAGE.md):** install, the studio, publishing and YouTube setup, autopilot, every setting, re-running steps, troubleshooting.
- **[docs/PIPELINE.md](docs/PIPELINE.md):** how it works: architecture, data model, job runner, each of the 10 steps, the timing model, the video engine, design decisions and how to extend it.

## Layout

```
apps/server      Hono API, SQLite job runner, pipeline steps, LLM/TTS/stock/render/publish adapters
apps/studio      Vite + React studio (live progress, previews, copyable metadata)
packages/schema  zod schemas, shared types and timing utilities
packages/video   Remotion brand kit, scene templates and the Short composition
docs/            usage guide and pipeline explainer
```

## Development

```bash
pnpm remotion    # Remotion Studio with a sample short, for editing templates
pnpm test        # unit and HTTP tests
pnpm typecheck   # all four packages
```
