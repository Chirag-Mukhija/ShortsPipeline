// In-process event bus that fans pipeline updates out to SSE subscribers.
import { EventEmitter } from "node:events";
import type { ServerEvent } from "@clipforge/schema";

const bus = new EventEmitter();
bus.setMaxListeners(200);

export function emit(event: ServerEvent): void {
  bus.emit("event", event);
}

export function subscribe(listener: (event: ServerEvent) => void): () => void {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}
