// Studio hooks: hash routing, and a server-sent-events bridge that keeps React Query caches fresh and streams the live run feed.
import type { FeedLine, RunnerStatus, ServerEvent, VideoDetail } from "@clipforge/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export type Route =
  | { page: "board" }
  | { page: "video"; id: string }
  | { page: "record"; id: string }
  | { page: "edit"; id: string }
  | { page: "voice" }
  | { page: "guide" }
  | { page: "library" }
  | { page: "shorts" }
  | { page: "project"; id: string };

function parseHash(hash: string): Route {
  const editRoute = hash.match(/^#\/v\/([\w-]+)\/edit/);
  if (editRoute?.[1]) return { page: "edit", id: editRoute[1] };
  const record = hash.match(/^#\/v\/([\w-]+)\/record/);
  if (record?.[1]) return { page: "record", id: record[1] };
  const video = hash.match(/^#\/v\/([\w-]+)/);
  if (video?.[1]) return { page: "video", id: video[1] };
  const project = hash.match(/^#\/p\/([\w-]+)/);
  if (project?.[1]) return { page: "project", id: project[1] };
  if (hash.startsWith("#/shorts")) return { page: "shorts" };
  if (hash.startsWith("#/voice")) return { page: "voice" };
  if (hash.startsWith("#/guide")) return { page: "guide" };
  if (hash.startsWith("#/library")) return { page: "library" };
  return { page: "board" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function hrefOf(route: Route): string {
  switch (route.page) {
    case "video":
      return `#/v/${route.id}`;
    case "record":
      return `#/v/${route.id}/record`;
    case "edit":
      return `#/v/${route.id}/edit`;
    case "project":
      return `#/p/${route.id}`;
    case "board":
      return "#/";
    default:
      return `#/${route.page}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefOf(route);
}

export function useLiveUpdates(): void {
  const client = useQueryClient();
  useEffect(() => {
    const source = new EventSource("/api/events");
    const pending = new Map<string, number>();
    const later = (key: string, refresh: () => void) => {
      if (pending.has(key)) return;
      pending.set(
        key,
        window.setTimeout(() => {
          pending.delete(key);
          refresh();
        }, 700),
      );
    };
    const onProject = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as Extract<ServerEvent, { projectId: string }>;
      later(`p:${event.projectId}`, () => {
        void client.invalidateQueries({ queryKey: ["projects"] });
        void client.invalidateQueries({ queryKey: ["project", event.projectId] });
        void client.invalidateQueries({ queryKey: ["status"] });
      });
    };
    const onVideo = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as Extract<ServerEvent, { type: "studio" }>;
      later(`v:${event.videoId}`, () => {
        void client.invalidateQueries({ queryKey: ["videos"] });
        void client.invalidateQueries({ queryKey: ["video", event.videoId] });
        void client.invalidateQueries({ queryKey: ["edit", event.videoId] });
      });
    };
    // Decision: feed lines are appended straight into the cached run so the live feed scrolls without refetching the video.
    const onFeed = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as { videoId: string; runId: string; line: FeedLine };
      client.setQueryData<VideoDetail>(["video", event.videoId], (current) => {
        if (!current) return current;
        const runs = current.runs.map((run) => (run.id === event.runId ? { ...run, feed: [...run.feed, event.line] } : run));
        return { ...current, runs };
      });
      later(`v:${event.videoId}`, () => void client.invalidateQueries({ queryKey: ["video", event.videoId] }));
    };
    const onRunner = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as { status: RunnerStatus };
      client.setQueryData(["runner"], event.status);
      later("videos", () => void client.invalidateQueries({ queryKey: ["videos"] }));
    };
    for (const type of ["project", "progress", "log"]) source.addEventListener(type, onProject);
    source.addEventListener("studio", onVideo);
    source.addEventListener("studio-feed", onFeed);
    source.addEventListener("runner", onRunner);
    return () => {
      source.close();
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, [client]);
}
