// First-run idea backlog, taken from the channel's own topic list.
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./config";
import { countProjects, createProject } from "./db/repo";

const IDEAS = [
  "Why macOS seems to use less RAM than Windows",
  "Can you reprogram your washing machine? The tiny computer inside appliances",
  "How does compressing a file actually work?",
  "How UPI moves money between banks in two seconds",
  "How SIM cards work, and what eSIM changes",
  "How Google Maps knows there is traffic ahead",
  "How Uber matches you with a driver in seconds",
  "How iCloud keeps your photos in sync across devices",
  "Apple Silicon vs Intel: why M-series Macs sip battery",
  "What is actually inside an Apple Silicon chip",
  "Why a real-time leaderboard is surprisingly hard to build",
  "How VS Code works under the hood",
  "How Spotlight search finds any file instantly",
  "Windows vs Linux: what a kernel actually does",
  "How torrents download a file from strangers",
  "How to build your own SaaS builder",
  "10 ways vibe-coded websites get hacked, and how to fix them",
  "How Siri understands what you say",
  "How OCR reads text from images and PDFs",
];

export function seedIdeas(): void {
  const marker = path.join(DATA_DIR, ".seeded");
  if (existsSync(marker)) return;
  if (countProjects() === 0) {
    for (const topic of [...IDEAS].reverse()) createProject({ topic, status: "idea" });
  }
  writeFileSync(marker, new Date().toISOString());
}
