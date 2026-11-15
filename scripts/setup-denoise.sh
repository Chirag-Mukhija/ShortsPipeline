#!/bin/sh
# Installs DeepFilterNet's deep-filter (MIT/Apache-2.0, ~28 MB, runs on the CPU) into data/cache/denoise/ for the record page's noise cleanup.
set -eu
VERSION=0.5.6
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) TARGET=aarch64-apple-darwin ;;
  Darwin-x86_64) TARGET=x86_64-apple-darwin ;;
  Linux-x86_64) TARGET=x86_64-unknown-linux-musl ;;
  Linux-aarch64) TARGET=aarch64-unknown-linux-gnu ;;
  *) echo "No DeepFilterNet build for $(uname -s) $(uname -m); the studio will keep using ffmpeg's denoiser." >&2; exit 1 ;;
esac
DIR="$(cd "$(dirname "$0")/.." && pwd)/data/cache/denoise"
URL="https://github.com/Rikorose/DeepFilterNet/releases/download/v$VERSION/deep-filter-$VERSION-$TARGET"
mkdir -p "$DIR"
echo "Downloading $URL"
curl -fL --progress-bar -o "$DIR/deep-filter.part" "$URL"
chmod +x "$DIR/deep-filter.part"
"$DIR/deep-filter.part" --version
mv "$DIR/deep-filter.part" "$DIR/deep-filter"
echo "Installed $DIR/deep-filter. Reload the record page: noise cleanup now uses DeepFilterNet."
