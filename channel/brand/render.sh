#!/bin/sh
# Renders brand.html to the channel's PNGs at YouTube's sizes, using the headless Chrome Remotion already downloaded.
set -e
cd "$(dirname "$0")"
CHROME=$(ls -d "$HOME"/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell 2>/dev/null | tail -1)
[ -x "$CHROME" ] || { echo "No headless Chrome found under ~/.cache/puppeteer"; exit 1; }
PAGE="file://$PWD/brand.html"

shot() { # name width height
  "$CHROME" --headless --disable-gpu --hide-scrollbars --default-background-color=00000000 \
    --window-size="$2,$3" --screenshot="$PWD/$1.png" "$PAGE#$1" >/dev/null 2>&1
  echo "$1.png  $2x$3"
}

shot logo 800 800          # profile picture: 800x800, shown as a circle
shot watermark 300 300     # video watermark: square, transparent corners, under 1 MB
shot banner 2048 1152      # banner: text sits inside the 1235x338 safe area
