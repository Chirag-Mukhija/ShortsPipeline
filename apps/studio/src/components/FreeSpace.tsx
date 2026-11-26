// "Free up space" on a finished video: shows every rough file group with its size, and deletes the ticked ones for good after the creator confirms the final is safe.
import type { CleanupGroup, CleanupGroupId, CleanupResult, VideoDetail } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { studio } from "../api";
import { Button, Chip, Panel } from "./ui";

const size = (bytes: number) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : bytes >= 1e6 ? `${Math.round(bytes / 1e6)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);
const length = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function GroupRow({ group, checked, remakeable, disabled, onChange }: { group: CleanupGroup; checked: boolean; remakeable: boolean; disabled: boolean; onChange: (on: boolean) => void }) {
  return (
    <li className="border-b border-line py-3 first:pt-0 last:border-0">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 accent-accent" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm text-ink">
            {group.label}
            <Chip tone={remakeable ? "default" : "warn"}>{remakeable ? "can be remade" : "can't be remade"}</Chip>
          </span>
          <span className="mt-0.5 block text-xs text-muted">{group.detail}</span>
          <span className="mt-1 block break-all font-mono text-[11px] text-dim">
            {group.examples.join(" · ")}
            {group.files > group.examples.length ? ` · +${group.files - group.examples.length} more` : ""}
          </span>
        </span>
        <span className="shrink-0 text-right font-mono text-xs text-muted">{size(group.bytes)}</span>
      </label>
    </li>
  );
}

function CleanupList({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: (result: CleanupResult) => void }) {
  const client = useQueryClient();
  const [ticks, setTicks] = useState<Partial<Record<CleanupGroupId, boolean>>>({});
  const [safe, setSafe] = useState(false);
  // Always a fresh look at the disk when it opens; never refreshed behind the creator's back.
  const { data: plan, error, isFetching, refetch } = useQuery({ queryKey: ["cleanup", id], queryFn: () => studio.cleanupPlan(id), gcTime: 0, staleTime: Infinity, refetchOnWindowFocus: false, retry: false });
  const chosen = (plan?.groups ?? []).filter((g) => ticks[g.id] ?? g.selected);
  // Render pieces and drafts are only remakeable while the footage and the finished voice stay.
  const sourcesGo = chosen.some((g) => g.id === "footage" || g.id === "masters");
  const total = chosen.reduce((n, g) => n + g.bytes, 0);
  const remove = useMutation({
    mutationFn: () => studio.cleanup(id, chosen.map((g) => g.id), plan!.signature),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["video", id] });
      onDone(result);
    },
  });
  const look = () => {
    remove.reset();
    setSafe(false);
    void refetch();
  };
  const busy = remove.isPending || isFetching;
  if (error) return <p className="text-sm text-bad">{error.message}</p>;
  if (!plan) return <p className="text-sm text-dim">Checking the files…</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {plan.final ? (
          <>
            Kept: <span className="text-ink">{plan.final.path}</span> ({length(plan.final.seconds)}, {size(plan.final.bytes)}), the thumbnail and upload text, every document, and the scenes.
          </>
        ) : (
          "No final video was found."
        )}
      </p>
      {plan.blockers.map((b) => (
        <p key={b} className="rounded-lg border border-bad/40 px-3 py-2 text-sm text-bad">{b}</p>
      ))}
      {plan.warnings.map((w) => (
        <p key={w} className="rounded-lg border border-warn/30 px-3 py-2 text-sm text-warn">{w}</p>
      ))}
      {plan.groups.length ? (
        <ul>
          {plan.groups.map((g) => (
            <GroupRow key={g.id} group={g} remakeable={!g.permanent && !sourcesGo} checked={ticks[g.id] ?? g.selected} disabled={busy} onChange={(on) => setTicks((t) => ({ ...t, [g.id]: on }))} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-dim">There's nothing left to delete.</p>
      )}
      {plan.groups.length > 0 && plan.blockers.length === 0 ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink">
          <input type="checkbox" className="mt-1 accent-accent" checked={safe} disabled={busy} onChange={(e) => setSafe(e.target.checked)} />
          <span>I've watched the final video to the end, nothing in it needs fixing, and it's uploaded or backed up. The ticked files are deleted for good, not moved to the Trash.</span>
        </label>
      ) : null}
      {remove.error ? <p className="text-sm text-bad">{remove.error.message}</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button tone="quiet" onClick={onClose} disabled={remove.isPending}>Close</Button>
        <Button onClick={look} disabled={busy}>Look again</Button>
        <Button tone="danger" disabled={busy || !safe || chosen.length === 0 || plan.blockers.length > 0 || remove.isError} onClick={() => remove.mutate()}>
          {remove.isPending ? "Deleting…" : `Delete ${size(total)} for good`}
        </Button>
      </div>
    </div>
  );
}

export function FreeSpace({ video }: { video: VideoDetail }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  // Only a video with every stage done can be cleaned; the server checks this again.
  if (video.currentStage) return null;
  return (
    <Panel title="Free up space" action={open ? null : <Button size="sm" onClick={() => setOpen(true)}>Review rough files</Button>}>
      {open ? (
        <CleanupList
          id={video.id}
          onClose={() => setOpen(false)}
          onDone={(r) => {
            setResult(r);
            setOpen(false);
          }}
        />
      ) : result ? (
        <p className="text-sm text-good">
          Freed {size(result.freed)} ({result.deleted} files).
          {result.failed.length ? <span className="text-bad"> {result.failed.length} couldn't be deleted: {result.failed.slice(0, 3).join(", ")}</span> : null}
        </p>
      ) : (
        <p className="text-sm text-dim">This video is finished. Delete its raw takes, render pieces and drafts, and keep the final.</p>
      )}
    </Panel>
  );
}
