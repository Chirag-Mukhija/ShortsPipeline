// Tabbed view of what each writing step produced: angles, final script with critic notes, storyboard and publish copy.
import type {
  AnglePlan,
  Metadata,
  ProjectDetail,
  PublishArtifact,
  RecordingView,
  Review,
  Script,
  Storyboard,
  StoryboardScene,
  VoiceArtifact,
} from "@clipforge/schema";
import { useState, type ReactNode } from "react";
import { Button, Chip, CopyButton, Empty } from "./ui";
import { SceneRecorder } from "./SceneRecorder";

type Tab = "script" | "storyboard" | "publish" | "angles";

function Field({ label, text, children }: { label: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-dim">{label}</span>
        {text ? <CopyButton text={text} /> : null}
      </div>
      {children ?? <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{text}</p>}
    </div>
  );
}

function FeedbackNote({ onRegenerate, pending }: { onRegenerate: (note: string) => void; pending: boolean }) {
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-dim">Or leave a note and regenerate</span>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="e.g. make scene 3 funnier, the hook is weak, cut the third fact"
        rows={2}
        className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-dim focus:border-accent"
      />
      <Button
        tone="primary"
        className="self-end !px-3 !py-1 text-xs"
        disabled={pending || note.trim().length === 0}
        onClick={() => {
          onRegenerate(note.trim());
          setNote("");
        }}
      >
        {pending ? "Regenerating…" : "Regenerate with note"}
      </Button>
    </div>
  );
}

function ScriptTab({
  projectId,
  review,
  voice,
  recordings,
  editable,
  onSaveScript,
  onRegenerateReview,
  savingScript,
  regeneratingReview,
  onRecordingChanged,
}: {
  projectId: string;
  review?: Review;
  voice?: VoiceArtifact;
  recordings: RecordingView[];
  editable: boolean;
  onSaveScript: (script: Script) => void;
  onRegenerateReview: (note: string) => void;
  savingScript: boolean;
  regeneratingReview: boolean;
  onRecordingChanged: () => void;
}) {
  if (!review) return <Empty>The final script appears after the critic pass.</Empty>;
  const scores = Object.entries(review.scores);
  const saveNarration = (sceneId: string, narration: string) => {
    onSaveScript({ ...review.script, scenes: review.script.scenes.map((s) => (s.id === sceneId ? { ...s, narration } : s)) });
  };
  return (
    <div className="flex flex-col gap-4">
      {editable ? (
        <p className="rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-ink">
          Paused for your review. Edit any scene below (saves when you click away), or leave a note and regenerate — then
          use <span className="font-semibold">Approve &amp; continue</span> above when you're happy with it.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-dim">Critic scored the draft:</span>
        {scores.map(([name, score]) => (
          <Chip key={name} tone={score >= 8 ? "good" : score >= 6 ? "warn" : "bad"}>
            {name} {score}/10
          </Chip>
        ))}
        {savingScript ? <span className="text-xs text-dim">Saving…</span> : null}
      </div>
      <ol className="flex flex-col gap-3">
        {review.script.scenes.map((scene) => {
          const spoken = voice?.scenes.find((s) => s.id === scene.id);
          const recording = recordings.find((r) => r.sceneId === scene.id);
          return (
            <li key={scene.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-dim">
                <span className="rounded-md bg-surface-hi px-1.5 py-0.5 font-mono text-muted">{scene.id}</span>
                {spoken ? <span>{(spoken.speechEndMs / 1000).toFixed(1)}s{spoken.source === "recorded" ? " · used your voice" : ""}</span> : null}
              </div>
              {editable ? (
                <textarea
                  key={`${scene.id}:${scene.narration}`}
                  defaultValue={scene.narration}
                  rows={2}
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (value && value !== scene.narration) saveNarration(scene.id, value);
                  }}
                  className="w-full resize-none rounded-lg border border-line bg-bg px-2 py-1.5 text-sm leading-relaxed text-ink outline-none focus:border-accent"
                />
              ) : (
                <p className="text-sm leading-relaxed">{scene.narration}</p>
              )}
              <p className="mt-1 text-xs text-dim">{scene.visual}</p>
              <div className="mt-2 border-t border-line pt-2">
                <SceneRecorder projectId={projectId} sceneId={scene.id} recording={recording} onChanged={onRecordingChanged} />
              </div>
            </li>
          );
        })}
      </ol>
      {editable ? <FeedbackNote onRegenerate={onRegenerateReview} pending={regeneratingReview} /> : null}
      {review.issues.length > 0 ? (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-dim">Critic fixed {review.issues.length} issues</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {review.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function summarize(scene: StoryboardScene): string {
  switch (scene.template) {
    case "HookSlam":
      return scene.props.lines.join(" / ");
    case "KineticText":
      return scene.props.text;
    case "Diagram":
      return `${scene.props.title ? `${scene.props.title}: ` : ""}${scene.props.nodes.map((n) => n.label).join(" → ")}`;
    case "CodeBlock":
      return `${scene.props.language}: ${scene.props.code.split("\n")[0] ?? ""}`;
    case "Compare":
      return `${scene.props.left.title} vs ${scene.props.right.title}`;
    case "ListReveal":
      return `${scene.props.title}: ${scene.props.items.map((i) => i.text).join(", ")}`;
    case "StatCounter":
      return `${scene.props.prefix ?? ""}${scene.props.value}${scene.props.suffix ?? ""} ${scene.props.label}`;
    case "Media":
      return `"${scene.props.query}" (${scene.props.kind})`;
  }
}

function StoryboardTab({ storyboard }: { storyboard?: Storyboard }) {
  if (!storyboard) return <Empty>The storyboard appears after the critic pass.</Empty>;
  return (
    <ol className="flex flex-col gap-2">
      {storyboard.scenes.map((scene) => (
        <li key={scene.id} className="rounded-xl border border-line bg-surface p-3">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="rounded-md bg-surface-hi px-1.5 py-0.5 font-mono text-muted">{scene.id}</span>
            <span className="font-semibold text-accent">{scene.template}</span>
            <span className="ml-auto text-dim">{scene.cues.length} cues</span>
          </div>
          <p className="text-sm text-ink">{summarize(scene)}</p>
        </li>
      ))}
    </ol>
  );
}

function PublishTab({ metadata, publish }: { metadata?: Metadata; publish?: PublishArtifact }) {
  if (!metadata) return <Empty>Titles, description and hashtags appear after the metadata step.</Empty>;
  const ytHashtags = metadata.hashtags.map((tag) => `#${tag}`).join(" ");
  const igHashtags = metadata.instagramHashtags.map((tag) => `#${tag}`).join(" ");
  return (
    <div className="flex flex-col gap-5">
      {publish?.youtube ? (
        <a href={publish.youtube.url} target="_blank" rel="noreferrer" className="rounded-xl border border-good/40 bg-good/10 px-3 py-2 text-sm text-good">
          On YouTube ({publish.youtube.privacy}) → {publish.youtube.url}
        </a>
      ) : null}
      <Field label="Titles">
        <ul className="flex flex-col gap-1.5">
          {metadata.titles.map((title, i) => (
            <li key={title} className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
              <span className={i === 0 ? "font-semibold" : ""}>{title}</span>
              <CopyButton text={title} />
            </li>
          ))}
        </ul>
      </Field>
      <Field label="YouTube description" text={`${metadata.description}\n\n${ytHashtags}`} />
      <Field label="YouTube tags" text={metadata.tags.join(", ")} />
      <Field label="Instagram caption" text={`${metadata.instagramCaption}\n\n${igHashtags}`} />
      {publish ? (
        <Field label="Export folder">
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
            {publish.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Field>
      ) : null}
    </div>
  );
}

function AnglesTab({ plan }: { plan?: AnglePlan }) {
  if (!plan) return <Empty>Angles appear after the first step.</Empty>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{plan.reason}</p>
      {plan.angles.map((angle, i) => (
        <div key={angle.hook} className={`rounded-xl border p-3 ${i === plan.chosenIndex ? "border-accent/60 bg-accent/5" : "border-line bg-surface"}`}>
          <div className="text-sm font-semibold">“{angle.hook}”</div>
          <div className="mt-1 text-xs text-muted">{angle.promise}</div>
          <div className="mt-1 text-xs text-dim">Analogy: {angle.analogy}</div>
        </div>
      ))}
    </div>
  );
}

export function ArtifactTabs({
  project,
  onSaveScript,
  onRegenerateReview,
  savingScript,
  regeneratingReview,
  onRecordingChanged,
}: {
  project: ProjectDetail;
  onSaveScript: (script: Script) => void;
  onRegenerateReview: (note: string) => void;
  savingScript: boolean;
  regeneratingReview: boolean;
  onRecordingChanged: () => void;
}) {
  const [tab, setTab] = useState<Tab>("script");
  const a = project.artifacts;
  const editableScript = project.status === "paused" && project.currentStep === "review";
  const tabs: { id: Tab; label: string }[] = [
    { id: "script", label: "Script" },
    { id: "storyboard", label: "Storyboard" },
    { id: "publish", label: "Publish" },
    { id: "angles", label: "Angles" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-xl border border-line bg-surface p-1 text-sm">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-lg px-3 py-1.5 transition ${tab === item.id ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "script" ? (
        <ScriptTab
          projectId={project.id}
          review={a.review as Review | undefined}
          voice={a.voice as VoiceArtifact | undefined}
          recordings={project.recordings}
          editable={editableScript}
          onSaveScript={onSaveScript}
          onRegenerateReview={onRegenerateReview}
          savingScript={savingScript}
          regeneratingReview={regeneratingReview}
          onRecordingChanged={onRecordingChanged}
        />
      ) : null}
      {tab === "storyboard" ? <StoryboardTab storyboard={a.storyboard as Storyboard | undefined} /> : null}
      {tab === "publish" ? <PublishTab metadata={a.metadata as Metadata | undefined} publish={a.publish as PublishArtifact | undefined} /> : null}
      {tab === "angles" ? <AnglesTab plan={a.angle as AnglePlan | undefined} /> : null}
    </div>
  );
}
