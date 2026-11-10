#!/usr/bin/env python3
"""new_video.py - creates the next numbered video folder from the studio templates and prints its path.

    python3 new_video.py "how I built a video studio with claude"
    python3 new_video.py "..." --slug claude-studio

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


def next_number():
    if not os.path.isdir(VIDEOS):
        return 1
    nums = [int(m.group(1)) for m in (re.match(r"^(\d{3})-", d) for d in os.listdir(VIDEOS)) if m]
    return max(nums, default=0) + 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("idea")
    ap.add_argument("--slug")
    args = ap.parse_args()

    folder = os.path.join(VIDEOS, "%03d-%s" % (next_number(), args.slug or slugify(args.idea)))
    if os.path.exists(folder):
        sys.exit("already exists: " + folder)
    os.makedirs(os.path.join(folder, "research"))
    today = time.strftime("%Y-%m-%d")
    for name in sorted(os.listdir(TEMPLATES)):
        with open(os.path.join(TEMPLATES, name)) as fh:
            text = fh.read().replace("{{IDEA}}", args.idea.strip()).replace("{{DATE}}", today)
        with open(os.path.join(folder, name), "w") as fh:
            fh.write(text)
    print(os.path.relpath(folder, ROOT))


if __name__ == "__main__":
    main()
