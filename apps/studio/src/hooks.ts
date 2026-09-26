// Studio hooks: hash routing and a server-sent-events bridge that keeps React Query caches fresh.
import type { ServerEvent } from "@clipforge/schema";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export type Route = { page: "home" } | { page: "project"; id: string };

function parseHash(hash: string): Route {
  const match = hash.match(/^#\/p\/([\w-]+)/);
  return match?.[1] ? { page: "project", id: match[1] } : { page: "home" };
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

export function navigate(route: Route): void {
  window.location.hash = route.page === "project" ? `#/p/${route.id}` : "#/";
}

export function useLiveUpdates(): void {
  const client = useQueryClient();
  useEffect(() => {
    const source = new EventSource("/api/events");
    const pending = new Map<string, number>();
    const refresh = (projectId: string) => {
      if (pending.has(projectId)) return;
      pending.set(
        projectId,
        window.setTimeout(() => {
          pending.delete(projectId);
          void client.invalidateQueries({ queryKey: ["projects"] });
          void client.invalidateQueries({ queryKey: ["project", projectId] });
          void client.invalidateQueries({ queryKey: ["status"] });
        }, 700),
      );
    };
    const onEvent = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as ServerEvent;
      refresh(event.projectId);
    };
    for (const type of ["project", "progress", "log"]) source.addEventListener(type, onEvent);
    return () => {
      source.close();
      pending.forEach((timer) => window.clearTimeout(timer));
    };
  }, [client]);
}
