// How it works: the chain from idea to voice-over at a glance, voice-over versus music only, labelled maps of the video and record pages, the modes, tips and shortcuts.
import type { ReactNode } from "react";
import { PageHeader } from "../components/ui";

const FLOW: { name: string; who: string; does: string; gets: string; gate?: boolean; soon?: boolean }[] = [
  { name: "Idea", who: "You", does: "Type or say the idea, with your own story in it. Pick voice-over or music only. Answer a few questions.", gets: "idea.md" },
  { name: "Research", who: "Team", does: "Finds what already works on YouTube, solid sources, and the gap nobody filled.", gets: "Brief with 3 angles" },
  { name: "Plan", who: "Team, then you", does: "Angle, beat sheet, look, and the title and thumbnail. Sketch beats here.", gets: "plan.md", gate: true },
  { name: "Script", who: "Team, then you", does: "Written in your voice, every claim fact-checked against its source. Music only: a cue sheet instead.", gets: "script.md", gate: true },
  { name: "Record", who: "You", does: "Read off the teleprompter, redo lines, cut by editing text, export. Skipped on music only.", gets: "narration.wav" },
  { name: "Edit", who: "Team, then you", does: "The team builds every beat's graphics in the chosen theme and assembles a cut. You mix voice and music, redo beats with a note, upload footage and pin notes, then approve.", gets: "preview.mp4" },
];

const VIDEO_MAP = [
  { n: 1, title: "Sidebar", body: "Videos, voice practice, this guide, light or dark, and your Pro limit. The refresh icon reads the limit fresh, including your own Claude Code use." },
  { n: 2, title: "Stage stepper", body: "Where the video is. Coral is the current stage; a gate means it waits for your approval." },
  { n: 3, title: "Now bar", body: "The one thing that needs you, always in this spot: answer, approve, record, or run the next stage." },
  { n: 4, title: "Documents", body: "Everything the team wrote. Edit fixes small things directly; your edit is logged as your decision." },
  { n: 5, title: "Side panel", body: "Activity (live feed), Ask (talk to the showrunner), Inbox (sketches), Decisions (your calls)." },
  { n: 6, title: "Sound and mode", body: "Voice-over or music only (you can switch until the plan is approved). Then ask me at gates, fully autonomous, or work in a Claude Code chat." },
];

const SOUND: { stage: string; voice: string; music: string }[] = [
  { stage: "Idea", voice: "Who it's for and what they leave with.", music: "Also: the feeling they leave with, whether you appear on camera (silently), and any music you already hear." },
  { stage: "Research", voice: "What works on YouTube for the topic.", music: "Also: visual-only videos on the topic, and how they open, cut and use text. Facts are trimmed to fit on text cards." },
  { stage: "Plan", voice: "Angle, beat sheet, look and feel.", music: "The look is the centerpiece: palette, type, motion, three style frames to sketch, and a music brief (mood, tempo, energy). No track picked yet." },
  { stage: "Script", voice: "Spoken lines in your voice, with a visual on every beat.", music: "A cue sheet: every shot, text card (with hold time) and music cue, timed. No spoken lines." },
  { stage: "Record", voice: "You record the voice-over.", music: "Skipped. Capture the footage the plan lists instead." },
  { stage: "Edit", voice: "Cut to your voice's timing: every visual lands on its word.", music: "Cut to the music's beat (the beat clock)." },
];

const RECORD_MAP = [
  { n: 1, title: "Teleprompter", body: "Follows your voice. Change words if you like; it waits, then picks you up again." },
  { n: 2, title: "Microphone", body: "Pick the Maono. Keep the meter out of the red line. Tick Hear myself to check your sound in wired earphones; a red alert means the mic is crackling." },
  { n: 3, title: "Record", body: "Space to start and stop. Messed up? Pause, say the line again; the restart is cut for you. If the mic glitches mid-take, a red banner tells you to stop and redo." },
  { n: 4, title: "Takes", body: "Every take, with any mic glitches flagged. Click one to see it in Edit, ↻ to transcribe it again, ✕ to delete it." },
  { n: 5, title: "Edit tab", body: "Your takes as text. Select words and press Delete to cut. Click a word to play from it. Red-tinted words are where the mic glitched." },
  { n: 6, title: "Finish and export", body: "Writes the levelled voice-over, word timings and captions for the edit stage, with background noise cleaned if you turned that on (Off, Gentle or Strong, in the side column)." },
];

const TIPS = [
  "Put your own story in the idea. The team can't invent your experience, and it's what makes the video yours.",
  "Answer questions concretely: real numbers and real moments. Vague answers make vague scripts.",
  "At the plan gate, sketch the beats you can picture and say what to take from each sketch.",
  "Read the script out loud before approving. If a line doesn't sound like you, edit it right there.",
  "Record in a quiet room, mic at a fist's distance. Don't stop for mistakes; just say the line again.",
  "Before a session, tick Hear myself and say a line: crackle you hear now ends up in the take.",
  "Going music only? Sketch the opening frame, the peak and the last frame at the plan gate. With no voice, the look is the video.",
  "Do a voice practice sample every week or two. Scripts get closer to how you actually talk.",
];

const SHORTCUTS: { where: string; keys: [string, string][] }[] = [
  { where: "Record", keys: [["Space", "Start or stop a take"], ["↑ ↓", "Move the start by a paragraph"], ["Click a word", "Start from there"]] },
  { where: "Edit", keys: [["Space", "Play or pause"], ["Delete", "Cut or restore the selection"], ["⌘ Z", "Undo"]] },
  { where: "Anywhere", keys: [["⌘ Enter", "Send an idea or a question"]] },
];

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <div className="eyebrow mb-1.5">{eyebrow}</div>
        <h2 className="text-lg font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const Pin = ({ n }: { n: number }) => <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent font-mono text-[10px] font-medium text-accent-ink">{n}</span>;

function Legend({ items }: { items: { n: number; title: string; body: string }[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.n} className="flex gap-3">
          <Pin n={item.n} />
          <div>
            <div className="text-sm font-medium text-ink">{item.title}</div>
            <div className="mt-0.5 text-sm leading-relaxed text-muted">{item.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

const Block = ({ className = "", children }: { className?: string; children?: ReactNode }) => <div className={`relative rounded-md border border-line bg-surface ${className}`}>{children}</div>;
const At = ({ n, className = "" }: { n: number; className?: string }) => (
  <span className={`absolute ${className}`}>
    <Pin n={n} />
  </span>
);
const Lines = ({ count = 3 }: { count?: number }) => (
  <div className="flex flex-col gap-1.5 p-3">
    {Array.from({ length: count }, (_, i) => (
      <span key={i} className="h-1.5 rounded-full bg-surface-hi" style={{ width: `${92 - ((i * 23) % 40)}%` }} />
    ))}
  </div>
);

function VideoPageMap() {
  return (
    <div aria-hidden="true" className="grid h-[300px] grid-cols-[52px_minmax(0,1fr)] gap-2 rounded-xl border border-line bg-bg p-2">
      <Block className="flex flex-col items-center gap-2 py-3">
        <span className="size-4 rounded-full bg-accent/80" />
        <span className="h-1.5 w-6 rounded-full bg-surface-hi" />
        <span className="h-1.5 w-6 rounded-full bg-surface-hi" />
        <At n={1} className="-right-2.5 bottom-10" />
      </Block>
      <div className="flex min-w-0 flex-col gap-2 p-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="h-1.5 w-16 rounded-full bg-surface-hi" />
            <span className="h-3 w-56 max-w-full rounded-full bg-muted/40" />
          </div>
          <Block className="h-6 w-24">
            <At n={6} className="-left-2.5 -top-2" />
          </Block>
        </div>
        <Block className="flex h-8 items-center gap-1 px-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < 3 ? "bg-muted/50" : i === 3 ? "bg-accent" : "bg-surface-hi"}`} />
          ))}
          <At n={2} className="-left-2.5 -top-2" />
        </Block>
        <div className="relative flex h-9 items-center justify-between rounded-md border border-accent/40 bg-accent/[0.06] px-3">
          <span className="h-1.5 w-40 rounded-full bg-accent/50" />
          <span className="h-4 w-14 rounded bg-accent" />
          <At n={3} className="-left-2.5 -top-2" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_34%] gap-2">
          <Block>
            <Lines count={5} />
            <At n={4} className="-left-2.5 -top-2" />
          </Block>
          <Block>
            <div className="flex gap-1.5 border-b border-line p-2">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i === 0 ? "bg-muted/60" : "bg-surface-hi"}`} />
              ))}
            </div>
            <Lines count={4} />
            <At n={5} className="-left-2.5 -top-2" />
          </Block>
        </div>
      </div>
    </div>
  );
}

function RecordPageMap() {
  return (
    <div aria-hidden="true" className="grid h-[300px] grid-cols-[minmax(0,1fr)_32%] gap-2 rounded-xl border border-line bg-bg p-2">
      <Block className="flex flex-col">
        <div className="flex gap-1.5 border-b border-line p-2">
          <span className="h-4 w-12 rounded bg-surface-hi" />
          <span className="relative h-4 w-10 rounded bg-surface-hi">
            <At n={5} className="-right-3 -top-3" />
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2.5 px-5">
          <span className="h-2.5 w-[70%] rounded-full bg-muted/30" />
          <span className="flex gap-1.5">
            <span className="h-2.5 w-10 rounded-full bg-accent" />
            <span className="h-2.5 w-[55%] rounded-full bg-muted/60" />
          </span>
          <span className="h-2.5 w-[80%] rounded-full bg-muted/60" />
          <span className="h-2.5 w-[60%] rounded-full bg-muted/60" />
        </div>
        <At n={1} className="-left-2.5 top-1/2" />
      </Block>
      <div className="flex flex-col gap-2">
        <Block className="flex h-7 items-center justify-center bg-accent/90">
          <span className="h-1.5 w-12 rounded-full bg-accent-ink/40" />
          <At n={6} className="-left-2.5 -top-2" />
        </Block>
        <Block className="p-2">
          <span className="block h-4 rounded bg-surface-hi" />
          <span className="mt-2 block h-1.5 rounded-full bg-gradient-to-r from-good/70 to-surface-hi" />
          <At n={2} className="-left-2.5 -top-2" />
        </Block>
        <Block className="flex h-9 items-center px-2">
          <span className="h-5 w-full rounded bg-accent/80" />
          <At n={3} className="-left-2.5 -top-2" />
        </Block>
        <Block className="flex-1">
          <Lines count={3} />
          <At n={4} className="-left-2.5 -top-2" />
        </Block>
      </div>
    </div>
  );
}

export function Guide() {
  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Guide" title="How ClipForge works" />
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
          You bring the idea and, when the video has one, your voice. A small team of AI agents researches and writes. Every creative call stays yours, and the team follows every one of them.
        </p>
      </div>

      <Section eyebrow="01 — The chain" title="One video, six stages">
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-6">
          {FLOW.map((stage, i) => (
            <li key={stage.name} className={`flex flex-col gap-3 bg-panel p-4 ${stage.soon ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-dim">{String(i + 1).padStart(2, "0")}</span>
                {stage.gate ? <span className="rounded border border-accent/40 px-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">Gate</span> : null}
              </div>
              <div>
                <div className="text-[15px] font-medium text-ink">{stage.name}</div>
                <div className="eyebrow mt-1 !normal-case !tracking-normal">{stage.who}</div>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{stage.does}</p>
              <span className="mt-auto truncate font-mono text-[11px] text-dim">→ {stage.gets}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-dim">A gate means the team stops and waits for you to approve. In fully autonomous mode the showrunner approves and writes down why.</p>
      </Section>

      <Section eyebrow="02 — Sound" title="Voice-over or music only">
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          You choose when you start a video, and can switch on the video page until the plan is approved. A music-only video has no voice at all, so the visuals and on-screen text carry everything. The team designs every shot for it instead of filling gaps with plain footage.
        </p>
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="hidden grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-line bg-surface px-4 py-2.5 sm:grid">
            <span className="eyebrow">Stage</span>
            <span className="eyebrow">Voice-over</span>
            <span className="eyebrow">Music only</span>
          </div>
          <ul className="divide-y divide-line bg-panel">
            {SOUND.map((row) => (
              <li key={row.stage} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
                <span className="text-sm font-medium text-ink">{row.stage}</span>
                <span className="text-sm leading-relaxed text-muted">
                  <span className="eyebrow mr-2 sm:hidden">Voice</span>
                  {row.voice}
                </span>
                <span className="text-sm leading-relaxed text-muted">
                  <span className="eyebrow mr-2 sm:hidden">Music</span>
                  {row.music}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section eyebrow="03 — Video page" title="Where everything is">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <VideoPageMap />
          <Legend items={VIDEO_MAP} />
        </div>
      </Section>

      <Section eyebrow="04 — Record page" title="Recording the voice-over">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <RecordPageMap />
          <Legend items={RECORD_MAP} />
        </div>
      </Section>

      <Section eyebrow="05 — Modes" title="How much the team decides">
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          {[
            ["Ask me at gates", "Recommended. The team stops at the plan and the script and asks you. Questions show up as buttons."],
            ["Fully autonomous", "The showrunner makes every call and logs why. Good for testing a rough idea quickly."],
            ["Chat", "Nothing runs from the website. You work on the video in a Claude Code chat with /studio next."],
          ].map(([title, body]) => (
            <div key={title} className="bg-panel p-5">
              <div className="text-sm font-medium text-ink">{title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-10">
        <Section eyebrow="06 — Tips" title="Getting the best out of it">
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {TIPS.map((tip) => (
              <li key={tip} className="py-3 text-sm leading-relaxed text-muted">
                {tip}
              </li>
            ))}
          </ul>
        </Section>
        <Section eyebrow="07 — Keys" title="Shortcuts">
          <div className="flex flex-col gap-5">
            {SHORTCUTS.map((group) => (
              <div key={group.where}>
                <div className="eyebrow mb-2">{group.where}</div>
                <ul className="flex flex-col divide-y divide-line border-y border-line">
                  {group.keys.map(([key, what]) => (
                    <li key={key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="text-muted">{what}</span>
                      <kbd className="rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-xs text-ink">{key}</kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
