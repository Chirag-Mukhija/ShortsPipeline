// Header chips showing which writer, voice, stock and publishing integrations are live, plus this month's spend.
import type { SystemStatus } from "@clipforge/schema";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { Chip } from "./ui";

export function SystemBar() {
  const { data } = useQuery({ queryKey: ["status"], queryFn: api.status, refetchInterval: 30_000 });
  if (!data) return null;
  const voice = data.tts.voice.replace(/^en-IN-/, "").replace(/Neural$/, "");
  const autopilot = data.autopilot as SystemStatus["autopilot"] | undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip tone={data.llm.provider === "misconfigured" ? "bad" : "default"}>
        Writer · {data.llm.provider} · {data.llm.model}
      </Chip>
      <Chip>
        Voice · {data.tts.provider} · {voice}
      </Chip>
      <Chip tone={data.stock.providers.length ? "good" : "default"}>
        Stock · {data.stock.providers.length ? data.stock.providers.join(" + ") : "off"}
      </Chip>
      {data.youtube.connected ? (
        <Chip tone="good">YouTube · connected</Chip>
      ) : data.youtube.configured ? (
        <a href="/api/youtube/auth">
          <Chip tone="warn">YouTube · connect →</Chip>
        </a>
      ) : (
        <Chip>YouTube · off</Chip>
      )}
      {autopilot && autopilot.everyHours > 0 ? (
        <Chip tone="good">
          Autopilot · every {autopilot.everyHours}h
          {autopilot.nextRun
            ? ` · next ${new Date(autopilot.nextRun).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </Chip>
      ) : (
        <Chip>Autopilot · off</Chip>
      )}
      <Chip tone={data.budget.monthSpendInr >= data.budget.capInr ? "bad" : "default"}>
        ₹{data.budget.monthSpendInr.toFixed(0)} / ₹{data.budget.capInr}
      </Chip>
    </div>
  );
}
