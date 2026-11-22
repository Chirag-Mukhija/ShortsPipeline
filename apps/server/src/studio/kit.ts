// Reads the kit for the website's Library page: every template job in the unattended queue with its status, preview videos per look, source credit and the builder's report. Read-only; the queue owns these files.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { KitCatalog, KitPreview, KitTemplateInfo } from "@clipforge/schema";
import { DATA_DIR, FILES_PREFIX } from "../config";

const KIT = path.join(DATA_DIR, "library", "kit");
const LOOKS = ["studio", "hand-drawn", "night", "film"];

type Job = { id: string; status: "queued" | "running" | "done" | "failed"; note?: string; costUsd?: number };
type Queue = { jobs: Job[]; pausedUntil?: string | null; stoppedBecause?: string | null };

const read = (file: string) => (existsSync(file) ? readFileSync(file, "utf8") : "");

// The report's first line says what the builder made; briefs written for one template default to that template.
function outcome(job: string, report: string): { kind: KitTemplateInfo["outcome"]; id: string } {
  const m = /^\s*(template|extended|skipped)\s*:\s*(.+?)\s*$/im.exec(report.split("\n").find((l) => l.trim()) ?? "");
  if (m) return { kind: m[1]!.toLowerCase() as KitTemplateInfo["outcome"], id: m[2]!.replace(/[`*]/g, "") };
  return { kind: report ? "template" : null, id: job };
}

function previews(template: string, files: Set<string>): KitPreview[] {
  const url = (name: string) => `${FILES_PREFIX}/library/kit/previews/${encodeURIComponent(name)}`;
  const out: KitPreview[] = [];
  for (const look of [...LOOKS, "split"]) {
    const base = look === "studio" ? template : look === "split" ? `${template}.split` : `${template}.${look}`;
    if (files.has(`${base}.mp4`)) out.push({ look, video: url(`${base}.mp4`), sheet: files.has(`${base}.jpg`) ? url(`${base}.jpg`) : "" });
  }
  return out;
}

// "What it does" from the report, else the brief's purpose line: one short paragraph for the card.
function summaryOf(report: string, brief: string): string {
  const fromReport = /\*\*What it does[.:]?\*\*:?\s*([^\n]+)/i.exec(report)?.[1] ?? report.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !/^(template|extended|skipped):/i.test(l))[0];
  const fromBrief = /\*\*Purpose:\*\*\s*([^\n]+)/.exec(brief)?.[1];
  return (fromReport ?? fromBrief ?? "").trim();
}

export function readKit(): KitCatalog {
  const queue: Queue = existsSync(path.join(KIT, "queue.json")) ? JSON.parse(read(path.join(KIT, "queue.json"))) : { jobs: [] };
  const files = new Set(existsSync(path.join(KIT, "previews")) ? readdirSync(path.join(KIT, "previews")) : []);
  const jobs = [...queue.jobs];
  // Templates written by hand (not through the queue) still show, as long as they have a preview.
  for (const name of files) {
    const base = name.replace(/\.(mp4|jpg)$/, "");
    if (!base.includes(".") && name.endsWith(".mp4") && !jobs.some((j) => j.id === base) && !jobs.some((j) => outcome(j.id, read(path.join(KIT, "reports", `${j.id}.md`))).id === base)) {
      jobs.unshift({ id: base, status: "done" });
    }
  }
  const templates: KitTemplateInfo[] = jobs.map((job) => {
    const report = read(path.join(KIT, "reports", `${job.id}.md`));
    const brief = read(path.join(KIT, "briefs", `${job.id}.md`));
    const made = outcome(job.id, report);
    const credit = /Source and credit: "([^"]+)"(?: by (@[\w.]+))?, (https:\/\/prompt-motion\.com\/[\w-]+)/.exec(brief) ?? /Inspiration \(credit\):\*\* "([^"]+)" by (@[\w.]+) \((https:\/\/prompt-motion\.com\/[\w-]+)/.exec(brief);
    const title = /^#\s*[\w-]+:\s*(?:from\s*)?"?([^"\n]+)"?/.exec(brief)?.[1]?.trim() ?? made.id;
    const status: KitTemplateInfo["status"] = job.status === "running" ? "building" : job.status === "done" && made.kind === "skipped" ? "skipped" : job.status;
    return {
      job: job.id,
      template: made.kind === "skipped" ? "" : made.id,
      title,
      status,
      outcome: job.status === "done" ? made.kind : null,
      credit: credit ? { title: credit[1]!, author: credit[2] ?? "", url: credit[3]! } : null,
      previews: made.kind === "skipped" ? [] : previews(made.id, files),
      summary: summaryOf(report, brief),
      report,
      note: job.note ?? null,
      costUsd: job.costUsd ?? null,
    };
  });
  const count = (s: Job["status"]) => queue.jobs.filter((j) => j.status === s).length;
  return {
    templates,
    queue: {
      done: count("done"),
      building: queue.jobs.find((j) => j.status === "running")?.id ?? null,
      queued: count("queued"),
      failed: count("failed"),
      pausedUntil: queue.pausedUntil && Date.parse(queue.pausedUntil) > Date.now() ? queue.pausedUntil : null,
      stoppedBecause: queue.stoppedBecause ?? null,
      costUsd: queue.jobs.reduce((n, j) => n + (j.costUsd ?? 0), 0),
    },
  };
}
