// Original pixel sprites for the arcade theme, hand-placed on a grid: one letter per pixel, colours from SPAL in theme.ts, "." is transparent.
export type SpriteMap = string[];

// BIT, the hero: a small cyan robot with a visor. Rows 0-13 are shared; legs swap for the walk.
const BIT_TOP = [
  "......kk......",
  ".....kyyk.....",
  "......kk......",
  "..kkkkkkkkkk..",
  ".kccccccccCCk.",
  ".kcwwwwwwwwCk.",
  ".kcwkwwwwkwCk.",
  ".kcwkwwwwkwCk.",
  ".kcwwwwwwwwCk.",
  ".kCCCCCCCCCCk.",
  "..kkkkkkkkkk..",
  "...kccppcck...",
  ".kckccccccckck",
  "..kkCCCCCCkk..",
];
const withRows = (base: SpriteMap, rows: Record<number, string>) => base.map((r, i) => rows[i] ?? r);

export const BIT_STAND: SpriteMap = [...BIT_TOP, "....CC..CC....", "...ppp..ppp..."];
export const BIT_WALK: SpriteMap = [...BIT_TOP, "...CC....CC...", "..ppp....ppp.."];
export const BIT_TALK: SpriteMap = withRows(BIT_STAND, { 8: ".kcwwwppwwwCk." });
export const BIT_BLINK: SpriteMap = withRows(BIT_STAND, { 6: ".kcwwwwwwwwCk." });
export const BIT_KO: SpriteMap = withRows(BIT_STAND, {
  5: ".kckwkwwkwkCk.",
  6: ".kcwkwwwwkwCk.",
  7: ".kckwkwwkwkCk.",
});
// Arms up for jumps and wins.
export const BIT_JUMP: SpriteMap = [
  ...BIT_TOP.slice(0, 10),
  ".ckkkkkkkkkkc.",
  ".ckkccppcckkc.",
  "..kkcccccckk..",
  "...kCCCCCCk...",
  "...CC....CC...",
  "..ppp....ppp..",
];

// GLITCH, the boss: a red shell bug with yellow eyes, two scuttle frames.
const GLITCH_TOP = [
  "..y..........y..",
  "...p........p...",
  "....p......p....",
  ".....kkkkkk.....",
  "....kRRRRRRk....",
  "...kRyyRRyyRk...",
  "...kRykRRykRk...",
  "..kkkRRRRRRkkk..",
  ".krrrrrkkrrrrrk.",
  "krrwrrrkkrrrwrrk",
  "krrrrrrkkrrrrrrk",
  "krRrrrrkkrrrrRrk",
  ".kRRrrrkkrrrRRk.",
  "..kkRRRkkRRRkk..",
];
export const GLITCH_A: SpriteMap = [...GLITCH_TOP, "..PP.PP..PP.PP..", ".P...P....P...P."];
export const GLITCH_B: SpriteMap = [...GLITCH_TOP, "..PP.PP..PP.PP..", "..P..P....P..P.."];

// SAGE, the mentor for quotes: a pink hood, glowing eyes, white beard.
export const SAGE: SpriteMap = [
  "......pp......",
  ".....pppp.....",
  "....pppppp....",
  "...pppppppPp..",
  "..pppkkkkkpPp.",
  "..ppkkkkkkkPp.",
  "..ppkykkykkPp.",
  "..ppkkkkkkkPp.",
  "..ppkwwwwwkPp.",
  ".pppwwwwwwwPPp",
  ".ppppwwwwwpPPp",
  ".pppppwwwppPPp",
  ".ppppppwpppPPp",
  ".pppppppppPPPp",
  ".PPPPPPPPPPPPP",
  "...YY....YY...",
];
export const SAGE_TALK: SpriteMap = withRows(SAGE, { 9: ".pppwwwkwwwPPp", 10: ".ppppwkkkwpPPp" });

export const HEART: SpriteMap = [".rr.rr.", "rwrrrrr", "rrrrrRr", ".rrrRR.", "..rRR..", "...R..."];
export const HEART_EMPTY: SpriteMap = [".gg.gg.", "g..g..g", "g.....g", ".g...g.", "..g.g..", "...g..."];

export const COIN: SpriteMap[] = [
  ["..YYYY..", ".YyyyyY.", "YwyYYyyY", "YwyYyyyY", "YyyYyyyY", "YyyYyyyY", "YyyYYyyY", ".YyyyyY.", "..YYYY.."],
  ["...YY...", "..YyyY..", ".YwyYyY.", ".YwyYyY.", ".YyyYyY.", ".YyyYyY.", ".YyyYyY.", "..YyyY..", "...YY..."],
  ["...YY...", "...Yy...", "...Yy...", "...Yy...", "...Yy...", "...Yy...", "...Yy...", "...Yy...", "...YY..."],
  ["...YY...", "..YyyY..", ".YyYywY.", ".YyYywY.", ".YyYyyY.", ".YyYyyY.", ".YyYyyY.", "..YyyY..", "...YY..."],
];

// The power-up: a chip with a glowing core and gold pins.
export const CHIP: SpriteMap = [
  "...y.yy.y...",
  "...y.yy.y...",
  "..GGGGGGGk..",
  "yyGggggggkyy",
  "..Ggcwccgk..",
  "yyGgcccCgkyy",
  "yyGgcccCgkyy",
  "..GgcCCCgk..",
  "yyGggggggkyy",
  "..kkkkkkkk..",
  "...y.yy.y...",
  "...y.yy.y...",
];

export const LOCK: SpriteMap = ["..GGGG..", ".G....G.", ".G....G.", "GGGGGGGg", "GGGkkGGg", "GGGkkGGg", "GGGGkGGg", "gggggggg"];

export const FLAG: SpriteMap = [
  "yyy.......",
  ".wpppppp..",
  ".wppwpppp.",
  ".wpppppppp",
  ".wppppppp.",
  ".wPPPPPP..",
  ".w........",
  ".w........",
  ".w........",
  ".w........",
  ".w........",
  ".w........",
  "GGG.......",
  "ggg.......",
];

export const TROPHY: SpriteMap = [
  "..yyyyyyyy..",
  "yyywyyyyyYyy",
  "y.ywyyyyyY.y",
  "y.ywyyyyyY.y",
  ".yywyyyyyYy.",
  "...yyyyyY...",
  "....yyYY....",
  ".....yY.....",
  ".....yY.....",
  "...YyyyyY...",
  "..ppppppPP..",
  "..PPPPPPPP..",
];

// The source item: a rolled scroll with two lines of text.
export const SCROLL: SpriteMap = [
  ".YYYYYYYYYY.",
  "YyyyyyyyyyyY",
  ".YYYYYYYYYY.",
  "..wwwwwwww..",
  "..wggggggw..",
  "..wwwwwwww..",
  "..wgggggww..",
  "..wwwwwwww..",
  ".YYYYYYYYYY.",
  "YyyyyyyyyyyY",
  ".YYYYYYYYYY.",
];

export const CURSOR: SpriteMap = ["y.....", "yy....", "yyy...", "yyyy..", "yyyyy.", "yyyY..", "yyY...", "yY....", "Y....."];

export const SPARK: SpriteMap = ["..w..", "..w..", "wwyww", "..w..", "..w.."];

export const SPRITES = {
  bit: [BIT_STAND, BIT_WALK],
  bitTalk: [BIT_STAND, BIT_TALK],
  bitKo: [BIT_KO],
  bitJump: [BIT_JUMP],
  glitch: [GLITCH_A, GLITCH_B],
  sage: [SAGE, SAGE_TALK],
  chip: [CHIP],
  coin: COIN,
  heart: [HEART],
  trophy: [TROPHY],
  scroll: [SCROLL],
  flag: [FLAG],
  lock: [LOCK],
} satisfies Record<string, SpriteMap[]>;
export type SpriteName = keyof typeof SPRITES;
