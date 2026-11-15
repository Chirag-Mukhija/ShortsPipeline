// Voice practice page: a short unscripted recording every week or two keeps the voice profile, and so the scripts, sounding like the creator.
import { VoiceCard } from "../components/VoiceCard";
import { PageHeader } from "../components/ui";

const STEPS = [
  { title: "Talk", body: "Record 2–3 minutes on today's topic. Unscripted, in English, the way you'd tell a friend." },
  { title: "Check", body: "Read what Whisper heard. If it got your words badly wrong, record again somewhere quieter." },
  { title: "Fold it in", body: "Run /voice-profile in Claude Code. It updates your profile, and every script after that uses it." },
];

export function VoicePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader eyebrow="Studio" title="Voice practice" />
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
          Scripts are written to sound like you, from a profile built out of how you actually talk. A fresh sample every week or two keeps that profile sharp.
        </p>
      </div>
      <VoiceCard />
      <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2 bg-panel p-5">
            <span className="eyebrow">0{i + 1}</span>
            <span className="text-sm font-medium text-ink">{step.title}</span>
            <span className="text-sm leading-relaxed text-muted">{step.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
