// Small UI primitives shared across studio pages: buttons, badges, panels, tabs, progress and copy-to-clipboard.
import type { ProjectStatus } from "@clipforge/schema";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonTone = "primary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md";

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: "bg-accent text-accent-ink font-medium hover:brightness-110 active:brightness-95",
  ghost: "border border-line bg-surface text-ink hover:border-line-hi hover:bg-surface-hi",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
  quiet: "text-muted hover:bg-surface hover:text-ink",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-7 rounded-md px-2.5 text-xs",
  md: "h-9 rounded-lg px-3.5 text-sm",
};

export function Button({
  tone = "ghost",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_SIZES[size]} ${BUTTON_TONES[tone]} ${className}`}
    />
  );
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  idea: "text-muted",
  queued: "text-info",
  running: "text-accent",
  paused: "text-info",
  failed: "text-bad",
  done: "text-good",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider ${STATUS_STYLES[status]}`}>
      <span className={`size-1.5 rounded-full bg-current ${status === "running" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-panel ${className}`}>
      {title ? (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h3 className="text-sm font-medium text-ink">{title}</h3>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

// Underline tabs: one row, scrolls sideways on a narrow screen instead of wrapping.
export function Tabs<T extends string>({ items, value, onChange, className = "" }: { items: { id: T; label: ReactNode }[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div role="tablist" className={`scrollbar-thin flex gap-5 overflow-x-auto border-b border-line ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`-mb-px shrink-0 border-b py-2.5 text-sm transition-colors ${value === item.id ? "border-ink text-ink" : "border-transparent text-dim hover:text-muted"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// A small one-of-a-few switch, like Off / Gentle / Strong or Voice-over / Music only.
export function Segmented<T extends string>({
  label,
  items,
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  label: string;
  items: { id: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (id: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg border border-line bg-surface p-0.5 ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={value === item.id}
          title={item.title}
          disabled={disabled}
          onClick={() => value !== item.id && onChange(item.id)}
          className={`h-7 flex-1 whitespace-nowrap rounded-md px-2.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${value === item.id ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-hi">
      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="rounded-md border border-line px-2 py-0.5 text-xs text-muted transition-colors hover:border-line-hi hover:text-ink"
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

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "accent" }) {
  const tones = {
    default: "border-line text-muted",
    good: "border-good/30 text-good",
    warn: "border-warn/30 text-warn",
    bad: "border-bad/30 text-bad",
    accent: "border-accent/40 text-accent",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-dim">{children}</div>;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink md:text-[30px]">{title}</h1>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
