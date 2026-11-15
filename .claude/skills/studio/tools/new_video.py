#!/usr/bin/env python3
"""new_video.py - creates the next numbered video folder from the studio templates and prints its path.

    python3 new_video.py "how I built a video studio with claude"
    python3 new_video.py "..." --slug claude-studio
    python3 new_video.py "..." --audio music     # no voice-over: visuals and on-screen text carry it

Folders are videos/NNN-slug/ under the repo root, numbered after the highest existing one. Never overwrites.
"""
import argparse, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
VIDEOS = os.path.join(ROOT, "videos")
TEMPLATES = os.path.join(HERE, "..", "templates")


def slugify(text, limit=5):
    words = re.findall(r"[a-z0-9]+", text.lower())
    stop = {"a", "an", "the", "of", "to", "and", "how", "i", "my", "with", "for", "in", "on", "is", "it", "this"}
    kept = [w for w in words if w not in stop] or words
    return "-".join(kept[:limit]) or "video"


def choose_audio(status, audio, today):
    # Mirrors createVideo in apps/server/src/studio/videos.ts, so a chat-started video looks like a website-started one.
    status = re.sub(r"^Audio:\s*\w+", "Audio: " + audio, status, flags=re.M)
    if audio == "music":
        status = re.sub(r"^\| record \| not started \|", "| record | skipped |", status, flags=re.M)
    said = "music only, no voice: the visuals carry it" if audio == "music" else "a voice-over in their own voice"
    return status.replace("\n\n## Notes for the next stage", "\n- %s idea: the creator chose %s\n\n## Notes for the next stage" % (today, said))


def next_number():
    if not os.path.isdir(VIDEOS):
        return 1
    nums = [int(m.group(1)) for m in (re.match(r"^(\d{3})-", d) for d in os.listdir(VIDEOS)) if m]
    return max(nums, default=0) + 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("idea")
    ap.add_argument("--slug")
    ap.add_argument("--audio", choices=["voice", "music"], help="omit it and the idea stage asks the creator")
    args = ap.parse_args()

    folder = os.path.join(VIDEOS, "%03d-%s" % (next_number(), args.slug or slugify(args.idea)))
    if os.path.exists(folder):
        sys.exit("already exists: " + folder)
    os.makedirs(os.path.join(folder, "research"))
    today = time.strftime("%Y-%m-%d")
    for name in sorted(os.listdir(TEMPLATES)):
        with open(os.path.join(TEMPLATES, name)) as fh:
            text = fh.read().replace("{{IDEA}}", args.idea.strip()).replace("{{DATE}}", today)
        if name == "status.md" and args.audio:
            text = choose_audio(text, args.audio, today)
        with open(os.path.join(folder, name), "w") as fh:
            fh.write(text)
    print(os.path.relpath(folder, ROOT))


if __name__ == "__main__":
    main()
