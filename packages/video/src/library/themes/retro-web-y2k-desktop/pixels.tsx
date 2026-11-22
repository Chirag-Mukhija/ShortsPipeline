// Hand-placed pixel sprites (cursors, desktop icons, button glyphs) and the renderer that draws a character grid as crisp SVG blocks.
import type { CSSProperties, FC, ReactElement } from "react";
import { CYAN, CREAM, GREY, GREY_DK, GREY_LT, INK, LIME, MAGENTA, NAVY, ORANGE, PINK, PINK_HOT, RED, TEAL, VIOLET, WHITE, YELLOW } from "./theme";

export type Sprite = string[];

const PAL: Record<string, string> = {
  k: INK, w: WHITE, g: GREY, h: GREY_LT, d: GREY_DK, n: NAVY, t: TEAL, c: CYAN, y: YELLOW, o: ORANGE,
  l: LIME, m: MAGENTA, p: PINK, P: PINK_HOT, r: RED, b: "#2D5BFF", v: VIOLET, e: CREAM, s: "#8A5A2B",
};

// One rect per horizontal run of a colour, so a 16×16 icon is ~40 nodes, not 256.
export const Pix: FC<{ sprite: Sprite; px?: number; x?: number; y?: number; recolor?: Record<string, string>; style?: CSSProperties }> = ({ sprite, px = 5, x, y, recolor, style }) => {
  const w = Math.max(...sprite.map((r) => r.length));
  const h = sprite.length;
  const rects: ReactElement[] = [];
  sprite.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const c = row[i]!;
      let k = i + 1;
      while (k < row.length && row[k] === c) k++;
      const fill = recolor?.[c] ?? PAL[c];
      if (c !== "." && fill) rects.push(<rect key={`${j}-${i}`} x={i} y={j} width={k - i} height={1} fill={fill} />);
      i = k;
    }
  });
  const pos: CSSProperties = x !== undefined || y !== undefined ? { position: "absolute", left: x, top: y } : {};
  return (
    <svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={{ display: "block", overflow: "visible", ...pos, ...style }}>
      {rects}
    </svg>
  );
};

// ---------- cursors ----------
export const ARROW: Sprite = [
  "k..........",
  "kk.........",
  "kwk........",
  "kwwk.......",
  "kwwwk......",
  "kwwwwk.....",
  "kwwwwwk....",
  "kwwwwwwk...",
  "kwwwwwwwk..",
  "kwwwwwwwwk.",
  "kwwwwwkkkkk",
  "kwwkwwk....",
  "kwk.kwwk...",
  "kk..kwwk...",
  "k....kwwk..",
  ".....kwwk..",
  "......kk...",
];

export const HAND: Sprite = [
  "....kk......",
  "...kwwk.....",
  "...kwwk.....",
  "...kwwk.....",
  "...kwwkkk...",
  "...kwwkwwkk.",
  ".kkkwwkwwkwk",
  "kwwkwwwwwkwk",
  "kwwkwwwwwwwk",
  ".kwwwwwwwwwk",
  "..kwwwwwwwwk",
  "..kwwwwwwwk.",
  "...kwwwwwwk.",
  "...kwwwwwk..",
  "...kkkkkkk..",
];

export const HOURGLASS_A: Sprite = [
  "kkkkkkkkkkk",
  ".kwwwwwwwk.",
  ".kyyyyyyyk.",
  ".kwyyyyywk.",
  "..kwyyywk..",
  "...kwywk...",
  "....kyk....",
  "...kwwwk...",
  "..kwwwwwk..",
  ".kwwwwwwwk.",
  ".kwwwwwwwk.",
  ".kwwwwwwwk.",
  "kkkkkkkkkkk",
];
export const HOURGLASS_B: Sprite = [
  "kkkkkkkkkkk",
  ".kwwwwwwwk.",
  ".kwwwwwwwk.",
  ".kwwwwwwwk.",
  "..kwwwwwk..",
  "...kwwwk...",
  "....kyk....",
  "...kwywk...",
  "..kwwywwk..",
  ".kwwyyywwk.",
  ".kwyyyyywk.",
  ".kyyyyyyyk.",
  "kkkkkkkkkkk",
];

// ---------- desktop icons (16×16) ----------
export const COMPUTER: Sprite = [
  "................",
  "..kkkkkkkkkkkk..",
  "..kwwwwwwwwwwk..",
  "..kwkkkkkkkkgk..",
  "..kwkttttttkgk..",
  "..kwktcttttkgk..",
  "..kwkttttttkgk..",
  "..kwkttttttkgk..",
  "..kwkkkkkkkkgk..",
  "..kwgggggglggk..",
  "..kkkkkkkkkkkk..",
  ".....kggggk.....",
  "...kkkkkkkkkk...",
  "..kwwwwwwwwwwk..",
  "..kgdgdgdgdgdk..",
  "..kkkkkkkkkkkk..",
];

export const GLOBE: Sprite = [
  ".....kkkkkk.....",
  "...kkbbllbbkk...",
  "..kbcllllbbbbk..",
  ".kbcblllllbllbk.",
  ".kbbbbllbbblllk.",
  "kbbbbbllbbbbllbk",
  "kbbbbbbbbbbbbbbk",
  "kbllbbbbbbbbbbbk",
  "kblllbbbbbllbbbk",
  "kbllllbbbllllbbk",
  ".kbllbbbblllllk.",
  ".kbbbbbbbbllbbk.",
  "..kbbbbbbbbbbk..",
  "...kkbbbbbbkk...",
  ".....kkkkkk.....",
  "................",
];

export const FOLDER: Sprite = [
  "................",
  ".kkkkkk.........",
  "kyyyyyyk........",
  "kywwwwyykkkkkkk.",
  "kyyyyyyyyyyyyyk.",
  "kykkkkkkkkkkkkkk",
  "kyyyyyyyyyyyyyok",
  "kyyyyyyyyyyyyyok",
  "kyyyyyyyyyyyyyok",
  "kyyyyyyyyyyyyyok",
  "kyyyyyyyyyyyyyok",
  "kyyyyyyyyyyyyyok",
  "kooooooooooooook",
  "kkkkkkkkkkkkkkkk",
];

export const DOC: Sprite = [
  "..kkkkkkkkkk....",
  "..kwwwwwwwwkk...",
  "..kwwwwwwwwkwk..",
  "..kwkkkkkwwkkkk.",
  "..kwwwwwwwwwwwk.",
  "..kwkkkkkkkkwwk.",
  "..kwwwwwwwwwwwk.",
  "..kwkkkkkkkwwwk.",
  "..kwwwwwwwwwwwk.",
  "..kwkkkkkkkkwwk.",
  "..kwwwwwwwwwwwk.",
  "..kwkkkkkwwwwwk.",
  "..kwwwwwwwwwwwk.",
  "..kwwwwwwwwwwwk.",
  "..kkkkkkkkkkkkk.",
];

export const MUSIC: Sprite = [
  "................",
  "......kkkkkkkkk.",
  "......kmmmmmmmk.",
  "......kmkkkkkmk.",
  "......kmk...kmk.",
  "......kmk...kmk.",
  "......kmk...kmk.",
  "..kkkkkmk.kkkmk.",
  ".kPPPPPmkkPPPmk.",
  "kPPwPPPmkPwPPmk.",
  "kPPPPPPmkPPPPk..",
  ".kPPPPPk.kkkk...",
  "..kkkkk.........",
];

export const MAIL: Sprite = [
  ".kkkkkkkkkkkkkk.",
  ".kwkwwwwwwwwkwk.",
  ".kwwkwwwwwwkwwk.",
  ".kwwwkwwwwkwwwk.",
  ".kwwwwkwwkwwwwk.",
  ".kwwwwwkkwwwPPk.",
  ".kwwwwwwwwwwPPk.",
  ".kwwwwwwwwwwwwk.",
  ".kwwwwwwwwwwwwk.",
  ".kkkkkkkkkkkkkk.",
];

export const TRASH: Sprite = [
  ".....kkkkkk.....",
  ".kkkkkhhhhkkkkk.",
  ".kwwwwwwwwwwwwk.",
  ".kkkkkkkkkkkkkk.",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "..kwhgwhgwhgdk..",
  "...kkkkkkkkkk...",
];

export const FLOPPY: Sprite = [
  "kkkkkkkkkkkkkkk.",
  "kbbkwwwwwwwkbbkk",
  "kbbkwwwwwkwkbbbk",
  "kbbkwwwwwkwkbbbk",
  "kbbkwwwwwwwkbbbk",
  "kbbbkkkkkkkbbbbk",
  "kbbbbbbbbbbbbbbk",
  "kbbkkkkkkkkkkbbk",
  "kbbkwwwwwwwwkbbk",
  "kbbkwkkkkkkwkbbk",
  "kbbkwwwwwwwwkbbk",
  "kbbkwkkkkkwwkbbk",
  "kbbkwwwwwwwwkbbk",
  "kkkkkkkkkkkkkkkk",
];

export const WARN: Sprite = [
  ".......kk.......",
  "......kyyk......",
  "......kyyk......",
  ".....kyyyyk.....",
  ".....kykkyk.....",
  "....kyykkyyk....",
  "....kyykkyyk....",
  "...kyyykkyyyk...",
  "...kyyykkyyyk...",
  "..kyyyyyyyyyyk..",
  "..kyyyykkyyyyk..",
  ".kyyyyykkyyyyyk.",
  ".kyyyyyyyyyyyyk.",
  "kkkkkkkkkkkkkkkk",
];

export const SERVER: Sprite = [
  "...kkkkkkkkk....",
  "...kgggggggk....",
  "...kgkkkkkgkd...",
  "...kgggggggkd...",
  "...kgkkkkkgkd...",
  "...kgggggggkd...",
  "...kglgggogkd...",
  "...kgggggggkd...",
  "...kgdddddgkd...",
  "...kgggggggkd...",
  "...kgdddddgkd...",
  "...kgggggggkd...",
  "...kkkkkkkkkd...",
  "....ddddddddd...",
];

export const HEART: Sprite = [
  ".kk...kk.",
  "kPPk.kPPk",
  "kPwPkPPPk",
  "kPPPPPPPk",
  ".kPPPPPk.",
  "..kPPPk..",
  "...kPk...",
  "....k....",
];

// The fictional OS's app mark: a pixel shooting star, used for title bars and the GO button.
export const STARMARK: Sprite = [
  "....y....",
  "...yyy...",
  "yyyyyyyyy",
  ".yyyyyyy.",
  "..yyyyy..",
  ".yyy.yyy.",
  "yy.....yy",
];

// ---------- 7×7 button glyphs ----------
export const G_CLOSE: Sprite = ["k.....k", ".k...k.", "..k.k..", "...k...", "..k.k..", ".k...k.", "k.....k"];
export const G_MIN: Sprite = [".......", ".......", ".......", ".......", ".......", "kkkkkk.", "kkkkkk."];
export const G_MAX: Sprite = ["kkkkkkk", "kkkkkkk", "k.....k", "k.....k", "k.....k", "k.....k", "kkkkkkk"];
export const G_PLAY: Sprite = ["k......", "kkk....", "kkkkk..", "kkkkkkk", "kkkkk..", "kkk....", "k......"];
export const G_STOP: Sprite = [".......", ".kkkkk.", ".kkkkk.", ".kkkkk.", ".kkkkk.", ".kkkkk.", "......."];
export const G_PREV: Sprite = ["k....k.", "k...kk.", "k..kkk.", "k.kkkk.", "k..kkk.", "k...kk.", "k....k."];
export const G_NEXT: Sprite = [".k....k", ".kk...k", ".kkk..k", ".kkkk.k", ".kkk..k", ".kk...k", ".k....k"];
export const G_CHECK: Sprite = ["......k", ".....kk", "k...kk.", "kk.kk..", ".kkk...", "..k....", "......."];

export const ICONS = { computer: COMPUTER, globe: GLOBE, folder: FOLDER, doc: DOC, music: MUSIC, mail: MAIL, trash: TRASH, floppy: FLOPPY, warn: WARN, server: SERVER } as const;
export type IconName = keyof typeof ICONS;

// Recolour for a disabled or frozen icon.
export const MONO_GREY: Record<string, string> = { k: GREY_DK, w: GREY_LT, y: GREY, o: GREY_DK, b: GREY_DK, l: GREY, c: GREY_LT, t: GREY_DK, P: GREY, m: GREY_DK, p: GREY };
