// The upload package (videos/NNN/package/upload.json): exactly what goes to YouTube, and the checks that catch a title, description, chapters, tags or credit YouTube would reject or cut. Pure data; file checks are done by the caller.
import { z } from "zod";

export const UploadSchema = z.object({
  title: z.string().min(1).max(100),
  // The description exactly as it will appear, chapters and credits included.
  description: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1)).default([]),
  // 28 = Science & Technology, 27 = Education.
  categoryId: z.string().default("28"),
  // Decision: uploads always go up private; the creator makes a video public themselves (CLAUDE.md non-negotiable).
  privacy: z.literal("private"),
  madeForKids: z.boolean().default(false),
  // Paths relative to the video's folder.
  file: z.string(),
  thumbnail: z.string(),
});
export type Upload = z.infer<typeof UploadSchema>;

export type PackageIssue = { level: "red" | "yellow"; rule: string; message: string };
export type Chapter = { at: number; title: string };

const TITLE_MOBILE = 60; // roughly where the mobile feed cuts a title
const TAG_BUDGET = 500; // YouTube's cap: tag lengths plus commas, plus quotes around tags with spaces

export const parseTimestamp = (s: string): number => s.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);

// Chapter lines are "0:00 Title" (or "1:02:03 Title") at the start of a line, the way YouTube reads them.
export function chaptersOf(description: string): Chapter[] {
  const out: Chapter[] = [];
  for (const line of description.split("\n")) {
    const m = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s+[-–—]?\s*(.+?)\s*$/.exec(line);
    if (m) out.push({ at: parseTimestamp(m[1]!), title: m[2]! });
  }
  return out;
}

export const tagCost = (tags: string[]) => tags.reduce((n, t, i) => n + t.length + (t.includes(" ") ? 2 : 0) + (i ? 1 : 0), 0);

// `duration` is the final video's length in seconds; `credits` are attributions the licence requires (music, footage) that must appear word for word.
export function checkUpload(input: unknown, ctx: { duration: number; credits: string[] }): { ok: boolean; issues: PackageIssue[]; upload?: Upload } {
  const issues: PackageIssue[] = [];
  const parsed = UploadSchema.safeParse(input);
  if (!parsed.success) {
    for (const e of parsed.error.issues.slice(0, 10)) issues.push({ level: "red", rule: "shape", message: `${e.path.join(".") || "upload"}: ${e.message}` });
    return { ok: false, issues };
  }
  const u = parsed.data;
  const red = (rule: string, message: string) => issues.push({ level: "red", rule, message });
  const yellow = (rule: string, message: string) => issues.push({ level: "yellow", rule, message });

  if (/[<>]/.test(u.title + u.description)) red("text", "YouTube rejects < and > in titles and descriptions");
  if (u.title.length > TITLE_MOBILE) yellow("title", `${u.title.length} characters; the mobile feed shows about ${TITLE_MOBILE} ("${u.title.slice(0, TITLE_MOBILE)}…")`);

  // Chapters render only if: the first is at 0:00, there are at least three, each lasts 10 s or more, in order.
  const ch = chaptersOf(u.description);
  if (ch.length > 0) {
    if (ch[0]!.at !== 0) red("chapters", `the first chapter must start at 0:00 (it starts at ${ch[0]!.at} s), or YouTube shows none`);
    if (ch.length < 3) red("chapters", `${ch.length} chapter(s); YouTube needs at least 3 to show any`);
    ch.forEach((c, i) => {
      const end = ch[i + 1]?.at ?? ctx.duration;
      if (end - c.at < 10) red("chapters", `"${c.title}" lasts ${(end - c.at).toFixed(0)} s; every chapter needs 10 s or more`);
      if (c.at >= ctx.duration) red("chapters", `"${c.title}" starts after the video ends`);
    });
  } else if (ctx.duration > 180) yellow("chapters", "no chapters; a video this long usually wants them");

  for (const credit of ctx.credits) {
    const missing = credit.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !u.description.includes(l));
    for (const line of missing) red("credit", `the licence needs this in the description, word for word: "${line}"`);
  }
  if (tagCost(u.tags) > TAG_BUDGET) red("tags", `tags use ${tagCost(u.tags)} of YouTube's ${TAG_BUDGET} characters`);
  const reds = issues.filter((i) => i.level === "red").length;
  return { ok: reds === 0, issues, upload: u };
}
