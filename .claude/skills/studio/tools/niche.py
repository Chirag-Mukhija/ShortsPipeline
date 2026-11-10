#!/usr/bin/env python3
"""niche.py - what is already working for a video idea on YouTube, ranked by how far each video beat its own channel.

    python3 niche.py --query "claude code video editing" --query "ai video workflow" --out research/niche.json
    python3 niche.py --query "..." --per-query 20 --channel-videos 30 --include-shorts

Reads public listings only, through yt-dlp metadata (never downloads a video, never signs in). For each search hit it
fetches that channel's recent long-form uploads and scores the hit as a MULTIPLE OF THE CHANNEL'S OWN MEDIAN, because
raw views only measure channel size. Channels with fewer than 4 recent uploads get no multiple rather than a noisy one.
"""
import argparse, json, statistics, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

SHORTS_MAX_SECONDS = 180
MIN_CHANNEL_VIDEOS = 4


def ytdlp(target, limit):
    cmd = ["yt-dlp", target, "--flat-playlist", "-J", "--no-warnings", "--playlist-end", str(limit)]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    except FileNotFoundError:
        sys.exit("yt-dlp is not installed: brew install yt-dlp")
    except subprocess.TimeoutExpired:
        return None
    if out.returncode != 0 or not out.stdout.strip():
        return None
    return json.loads(out.stdout)


def channel_baseline(channel_id, limit):
    data = ytdlp("https://www.youtube.com/channel/%s/videos" % channel_id, limit)
    if not data:
        return {"median": None, "counted": 0, "subscribers": None}
    views = [e.get("view_count") for e in data.get("entries") or [] if isinstance(e.get("view_count"), (int, float))]
    return {
        "median": statistics.median(views) if len(views) >= MIN_CHANNEL_VIDEOS else None,
        "counted": len(views),
        "subscribers": data.get("channel_follower_count"),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--query", action="append", required=True, help="a search a real viewer would type; repeat for more")
    ap.add_argument("--per-query", type=int, default=15)
    ap.add_argument("--channel-videos", type=int, default=30)
    ap.add_argument("--include-shorts", action="store_true")
    ap.add_argument("--out", default="niche.json")
    args = ap.parse_args()

    hits, seen = [], set()
    for query in args.query:
        data = ytdlp("ytsearch%d:%s" % (args.per_query, query), args.per_query) or {}
        for e in data.get("entries") or []:
            if not e.get("id") or e["id"] in seen or not e.get("channel_id"):
                continue
            duration = e.get("duration") or 0
            if not args.include_shorts and duration and duration <= SHORTS_MAX_SECONDS:
                continue
            seen.add(e["id"])
            hits.append({
                "title": e.get("title", ""),
                "url": "https://www.youtube.com/watch?v=%s" % e["id"],
                "views": e.get("view_count"),
                "duration": duration,
                "channel": e.get("channel") or e.get("uploader") or "?",
                "channel_id": e["channel_id"],
                "published": e.get("timestamp"),
                "query": query,
            })

    channel_ids = sorted({h["channel_id"] for h in hits})
    with ThreadPoolExecutor(max_workers=4) as pool:
        baselines = dict(zip(channel_ids, pool.map(lambda c: channel_baseline(c, args.channel_videos), channel_ids)))

    for h in hits:
        b = baselines[h["channel_id"]]
        h["channel_median"] = b["median"]
        h["subscribers"] = b["subscribers"]
        h["multiple"] = round(h["views"] / b["median"], 2) if b["median"] and h["views"] is not None else None

    hits.sort(key=lambda h: -(h["multiple"] if h["multiple"] is not None else -1))
    report = {
        "queries": args.query,
        "collected_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "method": "views / median views of the channel's last %d long-form uploads; public listings via yt-dlp" % args.channel_videos,
        "hits": hits,
    }
    with open(args.out, "w") as fh:
        json.dump(report, fh, indent=1)

    print("\n  %d long-form hits across %d channels -> %s\n" % (len(hits), len(channel_ids), args.out))
    print("  %7s %10s %10s %9s  %-22s %s" % ("multiple", "views", "ch.median", "subs", "channel", "title"))
    for h in hits[:25]:
        print("  %7s %10s %10s %9s  %-22s %s" % (
            "%.2fx" % h["multiple"] if h["multiple"] is not None else "  n/a",
            "{:,}".format(int(h["views"])) if h["views"] is not None else "?",
            "{:,}".format(int(h["channel_median"])) if h["channel_median"] else "-",
            "{:,}".format(int(h["subscribers"])) if h["subscribers"] else "-",
            h["channel"][:22], h["title"][:60]))
    thin = sum(1 for h in hits if h["multiple"] is None)
    if thin:
        print("\n  %d hit(s) have no multiple: their channel has under %d recent long-form uploads." % (thin, MIN_CHANNEL_VIDEOS))
    print()


if __name__ == "__main__":
    main()
