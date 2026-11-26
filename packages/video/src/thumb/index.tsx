// Shared pieces for code-drawn thumbnails (1280×720 stills): the canvas size, the feed's safe zone, and the creator's face cut-out with a bold outline so it reads at phone size.
import type { CSSProperties, FC } from "react";
import { Img, staticFile } from "remotion";

export const THUMB_W = 1280;
export const THUMB_H = 720;
// YouTube draws the duration badge over the bottom-right corner; keep text and key art out of it.
export const BADGE = { right: 0, bottom: 0, width: 190, height: 90 };

export type ThumbProps = { hasFace: boolean };

// The creator's photo, already cut out (transparent PNG, e.g. from iPhone/Mac "Copy Subject"), stroked so it separates from any background.
export const FaceCutout: FC<{ height: number; right?: number; outline?: string; style?: CSSProperties }> = ({ height, right = 0, outline = "#ffffff", style }) => {
  const o = 5;
  const ring = [`${o}px 0`, `-${o}px 0`, `0 ${o}px`, `0 -${o}px`].map((d) => `drop-shadow(${d} 0 ${outline})`).join(" ");
  return <Img src={staticFile("face.png")} style={{ position: "absolute", right, bottom: 0, height, filter: `${ring} drop-shadow(0 10px 24px rgba(0,0,0,0.25))`, ...style }} />;
};
