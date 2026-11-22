// HTTP API for the Edit page: the edit state, mix and beat changes, renders, beat takes and redos, rough-cut notes, footage uploads, approval, and adding tracks to the music library.
import { Hono } from "hono";
import { z } from "zod";
import { StepError } from "../pipeline/errors";
import { emit } from "../pipeline/events";
import { SHOT_MOVES, SHOT_SIZES } from "@clipforge/schema";
import { approveRoughCut, approveStoryboard, editState, patchSpec, restoreTake, saveFootage, setNotes, snapshotBeat, startJob, type EditPatch } from "../studio/edit";
import { addMusicTrack, readLibrary } from "../studio/library";
import { enqueue } from "../studio/runner";

export const edit = new Hono();

const body = async <T extends z.ZodType>(c: { req: { json: () => Promise<unknown> } }, schema: T): Promise<z.infer<T>> => {
  const parsed = schema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) throw new StepError(parsed.error.issues.map((issue) => issue.message).join("; "), false);
  return parsed.data;
};
const num = z.number().finite();

edit.get("/studio/videos/:id/edit", async (c) => c.json(await editState(c.req.param("id"))));

edit.patch("/studio/videos/:id/edit", async (c) => {
  const patch = await body(
    c,
    z.object({
      mix: z.object({ voiceDb: num.min(-30).max(12), musicDb: num.min(-60).max(6), duckDb: num.min(0).max(30), musicOn: z.boolean(), musicStart: num.min(0), fadeIn: num.min(0).max(20), fadeOut: num.min(0).max(20) }).partial().optional(),
      duration: num.positive().optional(),
      theme: z.string().max(80).optional(),
      music: z.object({ trackId: z.string().max(120) }).nullable().optional(),
      beats: z.array(z.object({ id: z.string(), end: num.optional(), label: z.string().max(120).optional(), status: z.enum(["planned", "building", "ready", "approved"]).optional() })).optional(),
      footage: z.array(z.object({ id: z.string(), in: num.min(0).optional(), out: num.min(0).optional(), speed: num.min(0.1).max(8).optional(), crop: z.object({ x: num, y: num, w: num, h: num }).optional() })).optional(),
      shots: z
        .object({
          beat: z.string(),
          list: z.array(z.object({ id: z.string().max(40), beat: z.string(), at: num.min(0), subject: z.string().trim().min(1).max(120), action: z.string().max(160), size: z.enum(SHOT_SIZES), move: z.enum(SHOT_MOVES), text: z.string().max(120).optional(), transitionOut: z.string().max(80).optional() })).max(40),
        })
        .optional(),
    }),
  );
  patchSpec(c.req.param("id"), patch as EditPatch);
  return c.json(await editState(c.req.param("id")));
});

edit.post("/studio/videos/:id/edit/render", async (c) => {
  const input = await body(c, z.object({ kind: z.enum(["preview", "final", "stills", "animatic"]), beat: z.string().max(40).optional() }));
  startJob(c.req.param("id"), input.kind, input.beat);
  return c.json(await editState(c.req.param("id")));
});

// Redoing a beat keeps the current scene as a take, then asks the team to redo just that beat with the creator's note.
edit.post("/studio/videos/:id/edit/beats/:beat/regenerate", async (c) => {
  const id = c.req.param("id");
  const beat = c.req.param("beat");
  const input = await body(c, z.object({ note: z.string().trim().min(3, "Say what should change").max(2000) }));
  const take = snapshotBeat(id, beat);
  patchSpec(id, { beats: [{ id: beat, status: "building" }] });
  enqueue(id, "message", `[edit] Redo ${beat} only, following .claude/skills/studio/stages/edit.md ("Redoing one beat"). The current version is kept as take ${take ?? "(none)"}. The creator's note: "${input.note}"`);
  return c.json(await editState(id));
});

edit.post("/studio/videos/:id/edit/beats/:beat/takes/:take/restore", async (c) => {
  restoreTake(c.req.param("id"), c.req.param("beat"), c.req.param("take"));
  return c.json(await editState(c.req.param("id")));
});

edit.put("/studio/videos/:id/edit/notes", async (c) => {
  const notes = await body(c, z.array(z.object({ id: z.string(), at: num.min(0), text: z.string().trim().min(1).max(2000), beat: z.string().optional(), scope: z.enum(["moment", "video"]).optional(), status: z.enum(["open", "done"]), createdAt: z.string() })));
  setNotes(c.req.param("id"), notes);
  return c.json(await editState(c.req.param("id")));
});

// Rough-cut notes go back to the team as one message; only the beats they fall in are redone, each keeping its current version as a take.
edit.post("/studio/videos/:id/edit/send-notes", async (c) => {
  const id = c.req.param("id");
  const state = await editState(id);
  const open = state.notes.filter((n) => n.status === "open");
  if (!open.length) throw new StepError("No open notes to send", false);
  const wide = open.filter((n) => n.scope === "video");
  const moments = open.filter((n) => n.scope !== "video");
  const lines = [
    ...wide.map((n) => `- WHOLE VIDEO: ${n.text}`),
    ...moments.map((n) => `- at ${n.at.toFixed(1)} s${n.beat ? ` (${n.beat})` : ""}: ${n.text}`),
  ].join("\n");
  for (const beat of new Set(moments.map((n) => n.beat).filter((b): b is string => Boolean(b)))) {
    snapshotBeat(id, beat);
    patchSpec(id, { beats: [{ id: beat, status: "building" }] });
  }
  enqueue(id, "message", `[edit] Notes from the creator, following .claude/skills/studio/stages/edit.md ("Rough-cut notes" and "Whole-video notes"). Moment notes: redo only the beats they fall in. WHOLE VIDEO notes: apply them through edit/scenes/style.ts (the video's shared design) so every built beat changes at once, and keep them as standing direction for beats not built yet:\n${lines}`);
  return c.json(await editState(id));
});

edit.post("/studio/videos/:id/edit/footage/:slot", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new StepError("Attach a file", false);
  saveFootage(c.req.param("id"), c.req.param("slot"), file.name, Buffer.from(await file.arrayBuffer()));
  return c.json(await editState(c.req.param("id")));
});

// Storyboard approved: the team builds the beats (stages/edit.md, step 2).
edit.post("/studio/videos/:id/edit/storyboard/approve", async (c) => {
  const id = c.req.param("id");
  approveStoryboard(id);
  enqueue(id, "message", "[edit] The creator approved the storyboard. Build the beats now, one per motion-designer run, following .claude/skills/studio/stages/edit.md step 2, then assemble.");
  return c.json(await editState(id));
});

edit.post("/studio/videos/:id/edit/approve", async (c) => {
  approveRoughCut(c.req.param("id"));
  emit({ type: "studio", videoId: c.req.param("id") });
  return c.json(await editState(c.req.param("id")));
});

// Music library: the creator adds a track file they downloaded, with its license and credit (usually copied from a research candidate).
edit.post("/studio/library/music", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) throw new StepError("Attach the track's audio file", false);
  const meta = z
    .object({
      id: z.string().min(2).max(80),
      title: z.string().min(1).max(160),
      artist: z.string().max(160).default(""),
      license: z.string().max(160).default(""),
      attribution: z.string().max(600).default(""),
      source: z.string().max(200).default(""),
      url: z.string().max(600).default(""),
      mood: z.string().max(200).default(""),
    })
    .parse(Object.fromEntries(Object.entries(form).filter(([k]) => k !== "file").map(([k, v]) => [k, String(v)])));
  await addMusicTrack(meta, file.name, Buffer.from(await file.arrayBuffer()));
  return c.json(readLibrary());
});
