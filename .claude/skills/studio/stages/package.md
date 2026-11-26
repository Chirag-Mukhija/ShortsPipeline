# Stage: package + upload

Goal: the finished video goes up to the creator's channel **private**. It goes with a title, description, chapters, sources, credits, tags and a custom thumbnail, all checked. Making it public is always the creator's own click in YouTube Studio.

## Tools you may run
- `node scripts/assemble.mjs <videoId> --final` (beat edits) or `pnpm cut:render <videoId> --final` (Cut plans): the full-quality export, `renders/final.mp4` or `renders/cut-final.mp4`, with music baked into the beat edit.
- `pnpm thumb:render <videoId>`: renders `package/thumbnail.tsx` to `package/thumbnail.png` plus `thumbnail-feed.png` (phone-feed size).
- `pnpm package:check <videoId>`: checks `package/upload.json`:
  - YouTube's chapter rules
  - every line of each licence credit, taken from the music library
  - the tag budget and the title's mobile cut
  - the video file
  - the thumbnail (16:9, at least 1280×720, under 2 MB)
- `pnpm upload <videoId>`: **only the creator runs this, or you after they say so in chat for this video.** It refuses unless status.md has `package: APPROVED by the creator`, the check passes, YouTube is connected, and the video hasn't gone up already. It uploads private and sets the thumbnail.

## Steps
1. **Final export**, in the background. It is local CPU only, but long: about 8 minutes of video can take half an hour or more.
2. **Packager** (Sonnet, one run). Dispatch it with "package stage" and the folder. It writes `package/upload.json` and a `## Final package` section in `package.md`, and runs `package:check`. Read its list of things the creator must confirm.
3. **Thumbnail.** Write `package/thumbnail.tsx` from the chosen pairing in package.md, in the video's style (`@kit/styles`), using `packages/video/src/thumb` (canvas, badge safe zone, `FaceCutout`).
   - Code draws the text, shapes and art.
   - The creator's face is their own cut-out photo, `package/face.png`. iPhone or Mac "Copy Subject" makes one, so no model is needed. Until it exists, the design must work without the face.
   - For anything else code can't draw, the packager's ready-to-paste image prompt goes to the creator.
   - Render it, look at both sizes, and fix anything that doesn't read at feed size.
4. **Gate, in every mode, autonomous too.** Set `package + upload` to `waiting for creator` and stop. The creator checks:
   - the title, description and chapters
   - the thumbnail
   - what they must confirm before going public
   - the face photo, if they want one: drop it in, then re-run `thumb:render`

   On approval, log `- <date> package: APPROVED by the creator`.
5. **Upload.** **Read first:** YouTube's help (support.google.com/youtube/answer/7300965) says a video locked private because it came through an unverified API service can't be appealed and must be re-uploaded; the videos.insert docs read differently, so treat API uploads as possibly stuck private until one test upload proves otherwise. For a video the creator wants public, default to a manual upload in YouTube Studio: `renders/final.mp4`, `package/thumbnail.png` and the text from `package/upload.json`.

   API route: The creator connects YouTube once: run `pnpm dev`, open `http://localhost:4310/api/youtube/auth` and give consent. Then the upload runs, private. A custom thumbnail needs a channel verified in YouTube Studio; if it isn't, the video still uploads and the thumbnail is set by hand.
6. **Free up space (the creator's button, never an agent's).** Once every stage is done, the video page shows **Free up space** (`apps/server/src/studio/cleanup.ts`). It permanently deletes the rough-file groups the creator ticks: takes, render pieces, drafts, stills, run logs; footage and the finished voice/face cam start unticked. It's an allowlist, so a new kind of rough file needs a rule there before it's ever deleted. Agents never call it and never delete a video's files by hand.
