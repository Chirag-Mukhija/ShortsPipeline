// Video preview: the rendered MP4 when it exists, otherwise a live Remotion Player of the timeline.
import type { Timeline } from "@clipforge/schema";
import { ShortVideo } from "@clipforge/video";
import { Player } from "@remotion/player";
import { useState } from "react";

export function Preview({ videoUrl, posterUrl, timeline }: { videoUrl: string | null; posterUrl: string | null; timeline?: Timeline }) {
  const [chosen, setChosen] = useState<"rendered" | "live" | null>(null);
  const mode = chosen ?? (videoUrl ? "rendered" : "live");
  const showRendered = Boolean(videoUrl) && (mode === "rendered" || !timeline);
  return (
    <div className="flex flex-col gap-3">
      {videoUrl && timeline ? (
        <div className="flex gap-1 self-center rounded-xl border border-line bg-surface p-1 text-xs">
          {(["rendered", "live"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setChosen(option)}
              className={`rounded-lg px-3 py-1 capitalize transition ${mode === option ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
            >
              {option === "live" ? "Live preview" : "Rendered MP4"}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-3xl border border-line bg-black shadow-2xl shadow-black/60">
        {showRendered && videoUrl ? (
          <video key={videoUrl} src={videoUrl} poster={posterUrl ?? undefined} controls playsInline className="aspect-[9/16] w-full" />
        ) : timeline ? (
          <Player
            component={ShortVideo}
            inputProps={{ timeline, assetBase: "/files" }}
            durationInFrames={Math.max(1, timeline.durationInFrames)}
            fps={timeline.fps}
            compositionWidth={timeline.width}
            compositionHeight={timeline.height}
            style={{ width: "100%", aspectRatio: "9 / 16" }}
            initialFrame={Math.min(36, Math.max(0, timeline.durationInFrames - 1))}
            controls
            clickToPlay
            acknowledgeRemotionLicense
          />
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center p-8 text-center text-sm text-dim">
            The preview appears once the timeline is synced.
          </div>
        )}
      </div>
      {videoUrl ? (
        <a href={videoUrl} download className="self-center text-sm text-accent hover:underline">
          Download MP4
        </a>
      ) : null}
    </div>
  );
}
