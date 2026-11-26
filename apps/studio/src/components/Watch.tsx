// Plays a Cut-route video's latest renders on its page: the draft cut, and the final once it's made.
import type { VideoDetail } from "@clipforge/schema";
import { useState } from "react";
import { Panel, Segmented } from "./ui";

const RENDERS = [
  { id: "final", file: "renders/cut-final.mp4", label: "Final" },
  { id: "draft", file: "renders/cut-preview.mp4", label: "Draft cut" },
] as const;

// True when this video is edited as a Cut plan and not as hand-coded beats, so its review happens here instead of on the Edit page.
export const onCutRoute = (video: VideoDetail): boolean => video.files.includes("edit/cut.json") && !video.files.includes("edit/edit.json");

export function Watch({ video }: { video: VideoDetail }) {
  const ready = onCutRoute(video) ? RENDERS.filter((r) => video.files.includes(r.file)) : [];
  const [picked, setPicked] = useState<string | null>(null);
  if (ready.length === 0) return null;
  // While the cut is being reviewed, a final from an earlier round may be out of date, so the draft comes first.
  const reviewing = video.currentStage === "edit + graphics" || video.currentStage === "rough cut";
  const shown = ready.find((r) => r.id === (picked ?? (reviewing ? "draft" : "final"))) ?? ready[0]!;
  const src = `/videofiles/${video.id}/${shown.file}?v=${encodeURIComponent(video.updatedAt)}`;
  return (
    <Panel title="Watch" action={ready.length > 1 ? <Segmented label="Which render" items={ready.map((r) => ({ id: r.id, label: r.label }))} value={shown.id} onChange={setPicked} /> : <span className="text-xs text-dim">{shown.label}</span>}>
      <video key={src} src={src} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black" />
    </Panel>
  );
}
