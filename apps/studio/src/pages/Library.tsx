// Library page: browse the kit templates the queue builds, the motion themes (preview stills per entry) and the music tracks, as references while planning a video.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { LibraryThemeInfo, MusicTrack } from "@clipforge/schema";
import { studio } from "../api";
import { ArrowLeftIcon } from "../components/icons";
import { Button, Chip, Empty, PageHeader, Tabs } from "../components/ui";
import { KitTab } from "./LibraryKit";

type Tab = "templates" | "visuals" | "music";

export function Library() {
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: studio.library, staleTime: 60_000 });
  const [tab, setTab] = useState<Tab>("templates");
  const [open, setOpen] = useState<string | null>(null);
  const themes = (data?.themes ?? []).filter((t) => t.slug !== "core");
  const theme = themes.find((t) => t.slug === open);
  const entries = themes.reduce((n, t) => n + t.entries.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="References" title="Library">
        Every look and track the team can build with. Pick one when you start a video, or leave it to the team. The library grows as videos add new pieces.
      </PageHeader>
      <Tabs
        items={[
          { id: "templates", label: "Templates" },
          { id: "visuals", label: `Themes · ${themes.length}` },
          { id: "music", label: `Music · ${data?.music.length ?? 0}` },
        ]}
        value={tab}
        onChange={(id) => {
          setTab(id);
          setOpen(null);
        }}
      />
      {tab === "templates" ? (
        <KitTab />
      ) : isLoading ? null : tab === "music" ? (
        <Music tracks={data?.music ?? []} sources={data?.musicSources ?? false} />
      ) : theme ? (
        <ThemeView theme={theme} onBack={() => setOpen(null)} />
      ) : themes.length === 0 ? (
        <Empty>No themes yet. Run `node scripts/library-previews.mjs` to build the catalog.</Empty>
      ) : (
        <>
          <p className="text-sm text-muted">{entries} animations across {themes.length} themes.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {themes.map((t) => (
              <ThemeCard key={t.slug} theme={t} onOpen={() => setOpen(t.slug)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// The cover is the first entry that isn't the bare background, so the card shows the theme doing something.
function ThemeCard({ theme, onOpen }: { theme: LibraryThemeInfo; onOpen: () => void }) {
  const cover = theme.entries.find((e) => e.kind !== "background" && e.preview) ?? theme.entries[0];
  return (
    <button type="button" onClick={onOpen} className="group overflow-hidden rounded-xl border border-line bg-panel text-left transition-colors hover:border-line-hi">
      <div className="aspect-video overflow-hidden bg-surface">
        {cover?.preview ? <img src={cover.preview} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : null}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{theme.name}</span>
          {theme.status === "ready" ? <Chip tone="good">used in a video</Chip> : null}
          <span className="ml-auto text-xs text-dim">{theme.entries.length}</span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted">{theme.summary}</p>
        <div className="flex flex-wrap gap-1">
          {theme.feel.slice(0, 4).map((f) => (
            <span key={f} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-dim">
              {f}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function ThemeView({ theme, onBack }: { theme: LibraryThemeInfo; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon size={14} /> All themes
      </button>
      <div>
        <h2 className="text-lg font-medium text-ink">{theme.name}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{theme.summary}</p>
        <p className="mt-2 font-mono text-[11px] text-dim">packages/video/src/library/themes/{theme.slug}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {theme.entries.map((e) => (
          <div key={e.id} className="overflow-hidden rounded-xl border border-line bg-panel">
            {/* Hover shows the mid-animation frame, so you see the motion state as well as the end. */}
            <div className="group relative aspect-video bg-surface">
              {e.preview ? <img src={e.preview} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
              {e.mid ? <img src={e.mid} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity group-hover:opacity-100" /> : null}
              {e.mid ? <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">mid-motion</span> : null}
            </div>
            <div className="flex flex-col gap-1.5 p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{e.title}</span>
                <span className="ml-auto eyebrow !text-[10px]">{e.kind}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted">{e.useFor}</p>
              <p className="truncate font-mono text-[10px] text-dim" title={e.api}>
                {e.api}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const minutes = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "–");

function Music({ tracks, sources }: { tracks: MusicTrack[]; sources: boolean }) {
  if (!tracks.length) {
    return <Empty>No tracks yet. The music research writes candidates to data/music/candidates.json; download the ones you like into data/library/music/.</Empty>;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Tracks <b className="text-ink">in library</b> show up in the Edit page's Mix panel. Each one is levelled when it's added, so any song sits under your voice the same way.
        {sources ? " Where the candidates came from: data/music/SOURCES.md." : ""}
      </p>
      <AddTrack />
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {tracks.map((t) => (
          <div key={t.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_100px_minmax(220px,1.1fr)] md:items-center">
            <div className="min-w-0">
              <a href={t.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-ink hover:underline">
                {t.title}
              </a>
              <div className="truncate text-xs text-dim">{[t.artist, t.source].filter(Boolean).join(" · ")}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.mood.map((m) => (
                <span key={m} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">
                  {m}
                </span>
              ))}
            </div>
            <div className="text-xs text-dim">
              {t.bpm ? `${t.bpm} bpm · ` : ""}
              {minutes(t.duration)}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Chip tone={t.status === "ready" ? "good" : "default"}>{t.status === "ready" ? "in library" : "candidate"}</Chip>
              <span className="flex-1" />
              {t.status !== "ready" ? <AddFile track={t} /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Attaches the downloaded audio file to a research candidate; its details from the research come along.
function AddFile({ track }: { track: MusicTrack }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <label className={`cursor-pointer whitespace-nowrap rounded-md border border-line px-2 py-1 text-xs ${busy ? "text-dim" : "text-muted hover:text-ink"}`}>
      {busy ? "Adding…" : "Add file"}
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            client.setQueryData(["library"], await studio.addTrack(file, { id: track.id, title: track.title, artist: track.artist, license: track.license, attribution: track.attribution, source: track.source, url: track.url, mood: track.mood.join(", ") }));
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

// Adds a track straight from the creator's computer: pick the file, and the title comes from its name (editable). Licensing is the creator's call.
function AddTrack() {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const add = async () => {
    if (!file || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `track-${Date.now()}`;
      client.setQueryData(["library"], await studio.addTrack(file, { id, title: title.trim(), source: "added by the creator" }));
      setFile(null);
      setTitle("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
        {file ? "Change file" : "+ Add a track from your computer"}
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
            e.target.value = "";
          }}
        />
      </label>
      {file ? (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="field w-64 text-sm" />
          <Button tone="primary" size="sm" disabled={busy || !title.trim()} onClick={() => void add()}>
            {busy ? "Levelling…" : "Add to library"}
          </Button>
          <Button size="sm" disabled={busy} onClick={() => setFile(null)}>
            Cancel
          </Button>
        </>
      ) : null}
      {error ? <span className="text-xs text-bad">{error}</span> : null}
    </div>
  );
}
