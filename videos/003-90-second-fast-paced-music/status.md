# Status

Started 2026-11-25.
Mode: autonomous
Audio: music   <!-- voice | music; see .claude/skills/studio/music-only.md -->
Title: Why Broken QR Codes Still Work   <!-- the current working title; the showrunner keeps it up to date -->

The showrunner updates this after every stage. Downstream agents read the decisions and must respect them.

| Stage | State | Output |
|---|---|---|
| idea | done | idea.md |
| research | done | brief.md, research/ |
| plan | done | plan.md, package.md (**creator gate**) |
| script | done | script.md, factcheck.md (**creator gate**) |
| record | skipped | record/narration.wav (you record it on the Record page; skipped on a music-only video) |
| edit + graphics | done | edit/cut.json, edit/scenes/cut/, renders/cut-preview.mp4 |
| rough cut | done | renders/cut-preview.mp4 watched on the video's page (**creator gate**) |
| package + upload | done | renders/final.mp4, package/upload.json, package/thumbnail.png, then a private upload (**creator gate**) |

## Creator decisions
Newest last. Format: `- YYYY-MM-DD <stage>: <decision, in the creator's words where possible>`
- 2026-11-25 idea: the creator chose music only, no voice: the visuals carry it
- 2026-11-25 idea: the creator picked the look "Kinetic type film" from the motion library (packages/video/src/library); build the visuals in that theme
- 2026-11-25 idea: the creator's idea says "add upto 5 custom scenes" (raises the edit stage's cap of 3 to 5 for this video), "don't repeat a visual idea", "Adapt templates to each moment", "I don't appear on camera, and there's no footage from me", "Stop before uploading"
- 2026-11-25 idea: DECIDED BY SHOWRUNNER (autonomous): for a curious builder or tech student who scans QR codes daily; the one thing to leave with is that a QR code is engineered to survive damage. Why: it fits the voice profile's audience, and damage survival is the idea's last and most amazing fact.
- 2026-11-25 idea: DECIDED BY SHOWRUNNER (autonomous): no music direction was given, so the brief is fast, driving electronic. Why: the idea says "fast, on the beat".
- 2026-11-25 research: DECIDED BY SHOWRUNNER (autonomous): a second source pass was run. Every fact now rests on an opened page or is dropped (Voyager, the Reed-Solomon year, "30% of area", reading speeds, Toyota, Go as the finder's origin). Why: the creator's rule, "drop any you can't verify".
- 2026-11-25 plan: DECIDED BY SHOWRUNNER (autonomous): the count is 10^7,089 (version 40-L, digits only, stated as a floor) instead of 2^23,648. Why: every one is a valid message, and the working fits on one card.
- 2026-11-25 plan: DECIDED BY SHOWRUNNER (autonomous): angle A "the square that survives", with the count from angle B as the peak. Why: damage is the one angle nobody big covers, and it is the idea's "leave with" line; the count is the strongest amazement.
- 2026-11-25 plan: DECIDED BY SHOWRUNNER (autonomous): red means damage or scan beam and lime means a successful read; no serif. Why: one colour language drawn from scanning itself.
- 2026-11-25 plan: DECIDED BY SHOWRUNNER (autonomous): plan APPROVED by the showrunner on the creator's behalf, title "Why Broken QR Codes Still Work". Why: best-scoring title that states no unverified number; the creator can overrule it.
- 2026-11-25 script: DECIDED BY SHOWRUNNER (autonomous): hook option A, "Partly missing." then "It still reads.". Why: the creator asked to open on the most surprising fact, and A shows it as a fact; B turns it into a question the title already asks.
- 2026-11-25 script: DECIDED BY SHOWRUNNER (autonomous): all 7 fact-check flags and the 1 fix resolved in the cue sheet (see factcheck.md). The last shot keeps the torn patch in lime, so the closing card stays true. Cue sheet APPROVED by the showrunner on the creator's behalf: 36 picture cues, 90.0 s. Why: no open flags.
- 2026-11-25 edit: DECIDED BY SHOWRUNNER (autonomous): the five scene files run longer than 8 s each (one per chapter, the picture changing every 2–4 s), and only three templates are used, each once (kinetic-lyrics, stat-punch, chart-bars). Why: the first rendered pass put weak moments on generic templates (pages, a toggle, comparison cards) that said nothing about QR codes.
- 2026-11-25 edit: DECIDED BY SHOWRUNNER (autonomous): codes are drawn the standard way, ink modules on a white tile with a quiet zone, not white modules on black as plan.md first said. Why: a light-on-dark code is inverted and less likely to scan. The shared encoder is edit/scenes/cut/qr.ts (real version 3-H code, self-checked at load; the hole loses at most 6 of each block's 35 codewords, level H repairs 11).
- 2026-11-25 edit: DECIDED BY SHOWRUNNER (autonomous): the track is "Laserpack" by Kevin MacLeod (127.9 BPM, CC BY 4.0), starting at 0.968 s on its first bar. Why: closest to the 128 BPM grid, driving, steady beats.
- 2026-11-25 edit: DECIDED BY SHOWRUNNER (autonomous): rough cut APPROVED by the showrunner on the creator's behalf. Why: cut:check 0 red and 0 yellow, motion check 0 red and 0 yellow, every check sheet looked at (4 frames per segment; nobody has watched it with the music). Known weak spots: 0:10–0:22 (plain type cards and the 2-of-81 dots are the least topical moments, and the dots are circles, not modules); 0:52–1:00 is a plain chart whose title is not on the cue sheet; the gate tip runs off the top edge at 0:47; T22 is the smallest card (86 px). Five scene files built on Opus (hook, ratio, growth, count, rebuild).
- 2026-11-25 package: DECIDED BY SHOWRUNNER (autonomous): package prepared and stopped before upload, as the creator asked. Final video renders/cut-final.mp4 (89.5 s, motion check 0 red 0 yellow), upload.json with package:check 0 red 0 yellow, thumbnail drawn by code from the real code and wound (no face, by plan). Not approved and not uploaded: that is the creator's word.
- 2026-11-26 package + upload: APPROVED by the creator
- 2026-11-26 cleanup: the creator deleted rough files for good (103 MB): rendered pieces, draft videos, check stills, agent run logs. Kept: renders/cut-final.mp4, package/, the documents and the scenes.

## Notes for the next stage
- To confirm before upload: (1) watch the cut with the music on (no one has); (2) scan the hook frame, the last frame and the thumbnail's code with a phone, since the codes were never decoded, only self-checked; (3) the title and thumbnail; (4) the weak spots logged above. Scratch files that can be deleted: package-titles.txt, package/title.txt.
- YouTube: upload manually in YouTube Studio with renders/cut-final.mp4, package/thumbnail.png and the text in package/upload.json, unless the creator chooses the private API route (stages/package.md step 5).
- The codes drawn on screen are meant to be real QR codes that encode "PARTLY MISSING. IT STILL READS." The studio has no decoder, so nobody has confirmed they scan: ask the creator to scan the hook and the last frame with a phone before upload, and no card may claim "scan me".
