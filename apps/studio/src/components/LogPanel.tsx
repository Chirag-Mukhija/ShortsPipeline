// Scrolling pipeline log that sticks to the newest line without moving the page.
import type { LogView } from "@clipforge/schema";
import { useEffect, useRef } from "react";

const LEVEL_STYLES = { info: "text-muted", warn: "text-accent", error: "text-bad" } as const;

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function LogPanel({ logs }: { logs: LogView[] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [logs.length]);
  return (
    <div ref={container} className="scrollbar-thin max-h-[420px] overflow-y-auto font-mono text-[11.5px] leading-relaxed">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-2">
          <span className="shrink-0 text-dim">{time(log.createdAt)}</span>
          <span className={LEVEL_STYLES[log.level]}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}
