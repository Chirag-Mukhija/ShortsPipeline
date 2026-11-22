// The Library's Templates tab: what the unattended queue has built so far, each template playing in every look, with its source credit and the builder's report; refreshes while the queue works.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { KitTemplateInfo } from "@clipforge/schema";
import { studio } from "../api";
import { Chip, Empty } from "../components/ui";

type Filter = "ready" | "all" | "waiting" | "skipped";
const LOOK_LABEL: Record<string, string> = { studio: "Studio", "hand-drawn": "Hand-drawn", night: "Night", film: "Film", split: "Beside face" };
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function KitTab() {
  const { data, isLoading } = useQuery({ queryKey: ["kit"], queryFn: studio.kit, refetchInterval: 30_000 });
  const [filter, setFilter] = useState<Filter>("ready");
  if (isLoading) return null;
  if (!data || data.templates.length === 0) return <Empty>No templates yet. The queue writes them to data/library/kit/ as it builds.</Empty>;

  const { templates, queue } = data;
  const ready = templates.filter((t) => t.status === "done");
  const building = templates.filter((t) => t.status === "building");
  const waiting = templates.filter((t) => t.status === "queued");
  const skipped = templates.filter((t) => t.status === "skipped" || t.status === "failed");
  const shown = filter === "ready" ? [...building, ...ready] : filter === "skipped" ? skipped : filter === "waiting" ? [] : [...building, ...ready, ...skipped];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-panel px-4 py-3 text-sm">
        <span className="text-ink">
          {ready.length} template{ready.length === 1 ? "" : "s"} ready
        </span>
        {queue.building ? (
          <span className="flex items-center gap-1.5 text-accent">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" /> building {queue.building}
          </span>
        ) : null}
        {queue.pausedUntil ? <span className="text-warn">paused for the usage limit until {time(queue.pausedUntil)}</span> : null}
        {queue.stoppedBecause ? <span className="text-warn">stopped: {queue.stoppedBecause}</span> : null}
        <span className="text-muted">{waiting.length} waiting</span>
        {skipped.length ? <span className="text-muted">{skipped.length} skipped or failed</span> : null}
        <span className="ml-auto font-mono text-xs text-dim">${queue.costUsd.toFixed(2)} so far (list price)</span>
      </section>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["ready", `Ready · ${ready.length + building.length}`],
            ["waiting", `Waiting · ${waiting.length}`],
            ["skipped", `Skipped or failed · ${skipped.length}`],
            ["all", "All built"],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`h-8 rounded-md border px-3 text-xs transition-colors ${filter === id ? "border-line-hi bg-surface-hi text-ink" : "border-line text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filter === "waiting" ? (
        <Waiting items={waiting} />
      ) : shown.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((t) => (
            <KitCard key={t.job} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function KitCard({ t }: { t: KitTemplateInfo }) {
  const [look, setLook] = useState(t.previews[0]?.look ?? "studio");
  const [open, setOpen] = useState(false);
  const preview = t.previews.find((p) => p.look === look) ?? t.previews[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-panel">
      <div className="relative aspect-video bg-black">
        {preview ? (
          // Each look is its own file, so changing look swaps the source; the contact sheet is the poster until it plays.
          <video key={preview.video} src={preview.video} poster={preview.sheet || undefined} controls muted loop playsInline preload="none" className="size-full object-contain" />
        ) : (
          <div className="grid size-full place-items-center text-xs text-dim">{t.status === "building" ? "Being built…" : "No preview"}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {t.previews.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            {t.previews.map((p) => (
              <button
                key={p.look}
                onClick={() => setLook(p.look)}
                className={`h-6 rounded px-2 text-[11px] transition-colors ${p.look === preview?.look ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`}
              >
                {LOOK_LABEL[p.look] ?? p.look}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-sm text-ink">{t.template || t.job}</div>
            {t.title && t.title !== t.template ? <div className="truncate text-xs text-muted">{t.title}</div> : null}
          </div>
          <Chip tone={t.status === "building" ? "accent" : t.status === "failed" ? "bad" : t.status === "skipped" ? "warn" : t.outcome === "extended" ? "accent" : "good"}>
            {t.status === "building" ? "building" : t.status === "failed" ? "failed" : t.status === "skipped" ? "skipped" : t.outcome === "extended" ? "extended" : "new"}
          </Chip>
        </div>
        {t.summary ? <p className="line-clamp-3 text-xs leading-relaxed text-muted">{t.summary}</p> : null}
        {t.status === "failed" && t.note ? <p className="text-xs text-bad">{t.note}</p> : null}
        {t.status === "skipped" ? <p className="text-xs text-warn">{t.report.split("\n")[0]?.replace(/^skipped:\s*/i, "Skipped: ")}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-dim">
          {t.credit ? (
            <a href={t.credit.url} target="_blank" rel="noreferrer" className="hover:text-ink">
              Idea from “{t.credit.title}”{t.credit.author ? ` by ${t.credit.author}` : ""} ↗
            </a>
          ) : (
            <span>Brief written for the channel</span>
          )}
          {t.costUsd ? <span className="font-mono">${t.costUsd.toFixed(2)}</span> : null}
          {t.report ? (
            <button className="ml-auto text-muted hover:text-ink" onClick={() => setOpen((o) => !o)}>
              {open ? "Hide report" : "Builder's report"}
            </button>
          ) : null}
        </div>
        {open ? <pre className="scrollbar-thin max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-3 font-sans text-xs leading-relaxed text-muted">{t.report}</pre> : null}
      </div>
    </article>
  );
}

function Waiting({ items }: { items: KitTemplateInfo[] }) {
  if (items.length === 0) return <Empty>Nothing waiting.</Empty>;
  return (
    <section className="rounded-xl border border-line bg-panel">
      <p className="border-b border-line px-4 py-2.5 text-xs text-muted">In the order the queue will build them. Each one becomes a new template, extends one we have, or is skipped as a duplicate.</p>
      <ol className="divide-y divide-line">
        {items.map((t, n) => (
          <li key={t.job} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="w-8 shrink-0 font-mono text-[11px] text-dim">{n + 1}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
            {t.credit ? (
              <a href={t.credit.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] text-dim hover:text-ink">
                prompt-motion ↗
              </a>
            ) : (
              <span className="shrink-0 text-[11px] text-dim">channel brief</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
