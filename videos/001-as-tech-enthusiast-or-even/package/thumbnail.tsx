// Video 001's thumbnail (package.md, pairing 1): iPad-paper look, a graphite chain whose links are all faded except one thick coral link, "WHICH LINK STAYS?", and the creator on the right third when package/face.png exists.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { STYLES } from "@kit/styles";
import { BADGE, FaceCutout, THUMB_H, THUMB_W, type ThumbProps } from "../../../packages/video/src/thumb";

const S = STYLES["hand-drawn"];

// A side-view chain: open links are rounded outlines; the links between them are seen edge-on as thick bars whose ends sit inside the open links' holes, so the chain reads as interlocked.
type LinkSpec = { x: number; y: number; open: boolean; hero: boolean };
const chain = (area: number, count: number, hero: number): LinkSpec[] => {
  const step = (area - 120) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({ x: 60 + i * step, y: 548 - i * 9 + (i % 2 ? 0 : 6), open: i % 2 === 0, hero: i === hero }));
};

const Thumbnail: FC<ThumbProps> = ({ hasFace }) => {
  // With a face, art and text keep to the left two thirds; without one, they use the frame.
  const area = hasFace ? THUMB_W * 0.66 : THUMB_W;
  const count = hasFace ? 5 : 7;
  const links = chain(area, count, count - 3);
  const step = links[1]!.x - links[0]!.x;
  const w = step * 1.2;
  const h = w * 0.56;
  const bar = step * 1.3;
  const draw = (l: LinkSpec, colour: string, stroke: number, k = 1) =>
    l.open ? (
      <rect x={l.x - (w * k) / 2} y={l.y - (h * k) / 2} width={w * k} height={h * k} rx={(h * k) / 2} fill="none" stroke={colour} strokeWidth={stroke} transform={`rotate(-4 ${l.x} ${l.y})`} />
    ) : (
      <rect x={l.x - bar / 2} y={l.y - stroke * 0.85} width={bar} height={stroke * 1.7} rx={stroke * 0.85} fill={colour} transform={`rotate(-4 ${l.x} ${l.y})`} />
    );
  return (
    <AbsoluteFill style={{ background: S.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${S.muted}66 2.2px, transparent 2.6px)`, backgroundSize: "34px 34px", opacity: 0.6 }} />
      <svg width={THUMB_W} height={THUMB_H} style={{ position: "absolute", inset: 0 }}>
        {links.filter((l) => !l.hero && l.open).map((l, i) => <g key={`o${i}`}>{draw(l, S.muted, 15)}</g>)}
        {links.filter((l) => !l.open).map((l, i) => <g key={`b${i}`}>{draw(l, S.muted, 15)}</g>)}
        {/* The link that stays: drawn last, bigger and thicker, with a soft coral glow so it's the first thing the eye finds in the feed. */}
        {links.filter((l) => l.hero).map((l) => <g key="hero" style={{ filter: `drop-shadow(0 0 18px ${S.accent}99)` }}>{draw(l, S.accent, 30, 1.12)}</g>)}
      </svg>
      <div style={{ position: "absolute", left: 64, top: 46, width: area - 90, fontFamily: S.display, fontWeight: 700, color: S.ink, lineHeight: 0.95, fontSize: hasFace ? 150 : 170 }}>
        <div>WHICH LINK</div>
        <div style={{ position: "relative", display: "inline-block" }}>
          STAYS?
          <div style={{ position: "absolute", left: 0, right: 30, bottom: 4, height: 16, borderRadius: 8, background: S.accent, transform: "rotate(-1.5deg)" }} />
        </div>
      </div>
      {hasFace ? <FaceCutout height={THUMB_H * 0.97} right={-20} outline={S.ink} /> : null}
      {/* Keeps the duration badge's corner free of art. */}
      <div style={{ position: "absolute", right: BADGE.right, bottom: BADGE.bottom, width: BADGE.width, height: BADGE.height }} />
    </AbsoluteFill>
  );
};

export default Thumbnail;
