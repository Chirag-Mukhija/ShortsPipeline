# Using ClipForge

How to install ClipForge, make and publish shorts, run it hands-off, configure it, and fix things when they go wrong.

---

## 1. What you need

| Requirement | Why | Check |
|---|---|---|
| macOS (Apple Silicon or Intel) or Linux | Rendering and ffmpeg run locally. The offline fallback voice (`say`) is macOS only. | |
| Node.js 24+ | Runs the server and tooling | `node -v` |
| pnpm 10 | Workspace package manager | `pnpm -v` |
| ffmpeg + ffprobe | Audio cleanup, pause trimming, loudness, sound effects | `ffmpeg -version` |
| A writer, one of: the **Claude Code CLI, logged in** (default, no key needed), or an Anthropic / Gemini / OpenAI API key | Writes angles, scripts, storyboards and titles | `claude -p "hi"` answers |
| Internet | Edge neural voice, Google Fonts, the one-time headless Chrome download (about 100 MB) | |
| About 1 GB of free disk, plus about 25 MB per short | `node_modules` is about 570 MB; each rendered short is 20–25 MB | `df -h` |

> The Claude Code CLI uses your Claude plan's usage, about 6 calls per short. Nothing is billed per token, and the budget meter shows ₹0 for it.

## 2. Install

```bash
pnpm install
cp .env.example .env        # optional: every setting has a working default
```

## 3. Make your first short

### From the studio (recommended)

```bash
pnpm dev
```

This starts the server on port 4310 and the studio on port 5173. Open **http://localhost:5173**, type a topic into *"What should today's short explain?"* and press **Make short**. You land on the project page and can watch it work:

| Step | Typical time | What you'll see |
|---|---|---|
| Pick the angle | 30–40 s | 4 hook ideas; the best one is chosen |
| Write the script | 25–45 s | 5–9 scenes, 110–165 words |
| Critic pass | 1–2 min | Scores, the fixes it made, the final script |
| Storyboard | 40–50 s | One animation template per scene |
| Voiceover | 15 s | Indian-English voice per scene |
| Gather assets | under 1 s (longer with stock footage) | Code colors, footage, music |
| Sync timeline | under 1 s | Live preview becomes playable |
| Render video | 1.5–2 min | Progress bar with a frame percentage |
| Titles & hashtags | 10–15 s | Publish tab fills in |
| Publish | under 1 s (longer when uploading) | Export folder written |

That's about **5 minutes per short**. The very first render also downloads headless Chrome.

### From the terminal

```bash
pnpm make "How does UPI move money between banks in two seconds?"
```

It prints each step as it happens and ends with the path to the video and the export folder. If `pnpm dev` is already running, the command uses that server (so the studio shows the progress too); otherwise it starts one just for this run.

## 4. The studio

### Home
- **Top bar chips:** the active writer, voice, stock footage, YouTube connection, autopilot and this month's paid spend. A red chip means something is misconfigured.
- **Make short:** starts a video immediately.
- **In production:** videos that are queued, running, paused or failed, with a progress bar and the current step. Click one to open it.
- **Finished shorts:** poster grid of completed videos.
- **Idea backlog:** add ideas for later (*Add*), start one (*Make it*) or remove one (*✕*). The top of the list is what autopilot picks next.

### Project page
- **Pipeline:** all 10 steps with their state (✓ done, ◉ running with %, ✕ failed with the reason) and how long each took.
- **Log:** everything the pipeline did and decided, including the critic's fixes and any warnings.
- **Preview:** *Rendered MP4* (the real file, with a Download link) or *Live preview*, the same animation played live in the browser from the timeline. It works before rendering finishes.
- **Tabs:**
  - *Script:* the final narration per scene with its spoken length, plus what the critic fixed.
  - *Storyboard:* the template and on-screen content for each scene.
  - *Publish:* title options, description, tags and Instagram caption, each with a Copy button.
  - *Angles:* all four hooks that were considered.
- **Controls:**
  - *Retry failed step* resumes from the step that failed.
  - *Re-run from…* redoes one step and everything after it (see section 9).
  - *Delete* removes the project and its working files.

## 5. Publishing a finished short

Every finished short gets a ready-to-post folder at `data/exports/<date>-<title>-<id>/`:

| File | Use |
|---|---|
| `short.mp4` | 1080×1920, 30 fps, H.264 plus AAC, loudness normalized to -14 LUFS |
| `poster.jpg` | Hook frame, useful as a thumbnail reference |
| `youtube.txt` | Best title, 3–4 other title options, description with hashtags (and footage credits), tags |
| `instagram.txt` | Reel caption plus hashtags |

**Manual posting (works with zero setup):** upload `short.mp4` in YouTube Studio or the Instagram app and paste the text from the matching `.txt` file.

### Automatic YouTube upload (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable **YouTube Data API v3**.
2. Under **OAuth consent screen**, set it up as *External* and add your own Google account as a test user. Then **publish the app** ("In production"). Otherwise Google expires the login every 7 days.
3. Under **Credentials → Create credentials → OAuth client ID**, choose *Web application* and add the redirect URI `http://localhost:4310/api/youtube/callback`.
4. Put the client ID and secret in `.env`:
   ```
   YOUTUBE_CLIENT_ID=...
   YOUTUBE_CLIENT_SECRET=...
   ```
5. Restart `pnpm dev`, click the **YouTube · connect →** chip, and approve. The chip turns green.

From then on the Publish step uploads each short automatically.

- **Privacy:** uploads are **private** by default (`YOUTUBE_PRIVACY`). Google also keeps uploads from unverified apps private until the app passes an audit. Open YouTube Studio and switch the video to public when you're happy with it.
- **Uploading an existing short:** re-run it from *Publish*.
- **Instagram:** auto-posting is deliberately off. The Instagram API has no drafts, so anything uploaded would go live without review.

## 6. Running it hands-off (autopilot)

```
AUTOPILOT_HOURS=56     # about 3 shorts a week; 24 = one a day; 0 = off (default)
```

Every 10 minutes the server checks whether that many hours have passed since autopilot last started a short. If nothing is already queued or running, it starts the **top idea in the backlog**.

- Keep the backlog stocked from the studio.
- Autopilot only works while the server is running (`pnpm dev` or `pnpm start`) and the Mac is awake.
- With YouTube connected, the result is a private upload waiting for you to publish.

## 7. Configuration reference (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `SERVER_PORT` | `4310` | API and media server port (the studio dev server is always 5173) |
| `HOST` | `127.0.0.1` | Set `0.0.0.0` to reach the server from other devices on your network |
| `DATA_DIR` | `data` | Where the database, projects, exports and caches live |
| `PUBLIC_URL` | `http://localhost:<port>` | Base URL used for the YouTube OAuth redirect |
| `MONTHLY_BUDGET_INR` | `500` | Hard cap on **paid** LLM spend per calendar month |
| `USD_TO_INR` | `88` | Conversion rate for the spend ledger |
| `AUTOPILOT_HOURS` | `0` | Hours between automatic shorts; `0` turns autopilot off |
| `LLM_PROVIDER` | `auto` | `auto` (first API key found, otherwise `claude-cli`), `claude-cli`, `anthropic`, `gemini`, `openai` |
| `CLAUDE_CLI_PATH` | `claude` | Path to the Claude Code CLI |
| `CLAUDE_CLI_MODEL` | `opus` | Model alias or full ID passed to `claude --model` |
| `CLAUDE_CLI_EFFORT` | `high` | `low`, `medium`, `high`, `xhigh`, `max` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | – / `claude-opus-5` | Anthropic API writer |
| `GEMINI_API_KEY` / `GEMINI_MODEL` / `GEMINI_BILLED` | – / `gemini-flash-latest` / `false` | Gemini writer; set `GEMINI_BILLED=true` if you're on a paid tier |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | – / `gpt-5-mini` | OpenAI writer |
| `TTS_PROVIDER` | `auto` | `auto`/`edge` (Edge first), `azure` (Azure first), `say` (offline only) |
| `TTS_VOICE` | `en-IN-PrabhatNeural` | Also `en-IN-NeerjaNeural`, `en-IN-NeerjaExpressiveNeural` |
| `TTS_RATE` | `+15%` | Speaking speed |
| `PAUSE_MAX_MS` | `300` | Longest pause allowed inside a scene; longer pauses are trimmed to this |
| `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` | – / `centralindia` | Official Azure voice (same voices, free tier of 0.5M characters a month) |
| `SAY_VOICE` | `Aman` | macOS offline fallback voice (`Aman`, `Rishi`, `Tara`) |
| `PEXELS_API_KEY`, `PIXABAY_API_KEY` | – | Enable real stock footage (free keys) |
| `MUSIC_VOLUME` / `SFX_VOLUME` | `0.08` / `0.45` | Background music and sound effect levels (0–1) |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | – | Enable YouTube upload (section 5) |
| `YOUTUBE_PRIVACY` | `private` | `private`, `unlisted` or `public` |
| `RENDER_CONCURRENCY` | Remotion default | Parallel render tabs, e.g. `4` or `50%` |

Restart the server after changing `.env`.

## 8. Choosing the writer and the voice

**Writer.** The default runs the `claude` CLI headlessly with **no access to tools, MCP servers, or your personal Claude Code settings and hooks**. The alias `opus` currently resolves to `claude-opus-5`. To pin a specific model, use its full ID, for example `CLAUDE_CLI_MODEL=claude-opus-5-5`. With an API provider, spend is tracked per call and the pipeline stops at `MONTHLY_BUDGET_INR`.

**Voice.** Microsoft Edge's neural voices are free and need no key, but the endpoint is **unofficial**, so it could change without notice. If it fails, the pipeline automatically tries Azure (when a key is set) and then macOS `say`, and logs which voice was used. One provider is used for the whole video, so voices never switch mid-short.

## 9. Fixing or improving a short

Every step's output is saved, so you can redo just part of a video from **Re-run from…**:

| Re-run from | Keeps | Redoes | Use it when |
|---|---|---|---|
| Pick the angle | – | Everything | You want a completely different take |
| Write the script / Critic pass | The angle | Script onward | The narration isn't right |
| Storyboard | The script | Visuals, voice, render | The animations don't fit the words |
| Voiceover | Script, storyboard | Voice onward | You changed `TTS_VOICE`, `TTS_RATE` or `PAUSE_MAX_MS` |
| Sync timeline / Render video | Everything before | Timing and render | You edited a template or the brand kit |
| Titles & hashtags | The video | Metadata and publish | You want new titles |
| Publish | Everything | Export (and upload) | You just connected YouTube |

- **Retry failed step** resumes from the step that failed. Network hiccups are retried automatically: 3 attempts, with 5s and then 10s waits.
- You can't start a re-run while a step is running.

## 10. Files and disk space

```
data/
  clipforge.db              database: projects, step outputs, jobs, logs, spend
  projects/<id>/audio/      voice clip per scene
  projects/<id>/assets/     downloaded stock footage
  projects/<id>/renders/    final.mp4 and poster.jpg
  exports/<date-title-id>/  ready-to-post folders (hard-linked, no extra space)
  library/sfx/              generated sound effects
  library/music/            drop your own royalty-free tracks here
  cache/bundle/             compiled video templates
  secrets/youtube.json      YouTube login (never served over HTTP)
```

- **Deleting a project** removes `projects/<id>` but keeps its export folder. Delete that folder by hand if you don't need it.
- **To start completely fresh,** stop the server and delete `data/`.

## 11. Production mode

```bash
pnpm start
```

This builds the studio and serves everything from one server at **http://localhost:4310**. Use it for long autopilot sessions. `pnpm dev` is better while you're changing code.

## 12. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Writer chip is red / "LLM_PROVIDER needs … KEY" | `LLM_PROVIDER` names a provider without its key. Add the key or set `LLM_PROVIDER=auto`. |
| Angle step fails with "claude CLI error" | The CLI isn't logged in or hit a usage limit. Run `claude`, log in, then click *Retry failed step*. |
| "Monthly LLM budget … is used up" | The paid-provider cap was reached. Raise `MONTHLY_BUDGET_INR` or use `claude-cli`. |
| Log says "edge voice failed" and the voice sounds robotic | Edge TTS was unreachable, so macOS `say` was used. Re-run from *Voiceover* when you're back online. |
| First render is slow or fails offline | Remotion downloads headless Chrome on first use; it needs internet once. |
| "A step is running right now" | Wait for the current step to finish, then re-run. |
| Studio shows an error card | Click *Try again*; if it persists, hard-refresh the page. Details are in the browser console. |
| Port already in use | Another ClipForge is running, or change `SERVER_PORT`. |
| Stock scenes show an icon card instead of footage | No stock keys are set, or nothing matched the search. Add `PEXELS_API_KEY`, then re-run from *Gather assets*. |
| YouTube upload fails with 401/403 | The login expired (the consent screen is still in "Testing") or the API isn't enabled. Reconnect from the chip. |

## 13. For development

```bash
pnpm remotion     # Remotion Studio with a sample short; edit templates live
pnpm test         # unit + HTTP tests
pnpm typecheck    # all four packages
```

[PIPELINE.md](PIPELINE.md) explains how each piece works and how to add a template, provider or step.
