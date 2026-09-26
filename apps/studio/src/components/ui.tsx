// Small UI primitives shared across studio pages: buttons, badges, panels, progress and copy-to-clipboard.
import type { ProjectStatus } from "@clipforge/schema";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonTone = "primary" | "ghost" | "danger";

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 font-semibold",
  ghost: "bg-surface text-ink hover:bg-surface-hi border border-line",
  danger: "bg-transparent text-bad hover:bg-bad/10 border border-bad/40",
};

export function Button({
  tone = "ghost",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_TONES[tone]} ${className}`}
    />
  );
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  idea: "bg-surface-hi text-muted",
  queued: "bg-info/15 text-info",
  running: "bg-accent/15 text-accent",
  paused: "bg-info/15 text-info",
  failed: "bg-bad/15 text-bad",
  done: "bg-good/15 text-good",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
      {status === "running" ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
      {status}
    </span>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel ${className}`}>
      {title ? (
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hi">
      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="rounded-lg border border-line px-2 py-0.5 text-xs text-muted transition hover:border-accent hover:text-accent"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  const tones = {
    default: "border-line text-muted",
    good: "border-good/40 text-good",
    warn: "border-accent/40 text-accent",
    bad: "border-bad/40 text-bad",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-dim">{children}</div>;
}
