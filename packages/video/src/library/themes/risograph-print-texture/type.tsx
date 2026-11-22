// Riso type: a line printed in two or three overprinting inks that settle into register, and words that print one by one on their spoken times.
import { useId, type CSSProperties, type FC } from "react";
import { DISPLAY, BLACK, BLUE, PINK, YELLOW } from "./theme";
import { Defs, Ink, Plate, type PlateCue, type Tex } from "./press";
import { DotPattern } from "./halftone";
import { SCREEN_ANGLE } from "./theme";

// One pass of a multi-ink line: a solid ink, or a halftone tint of it.
export type Pass = string | { ink: string; tone: number; cell?: number };

export type MisregisterProps = PlateCue & {
  text: string;
  x: number;
  y: number;
  size: number;
  font?: string;
  weight?: number;
  // Passes in print order; the first is the key plate, later ones land 4 f apart and sit off-register.
  inks?: Pass[];
  anchor?: "start" | "middle" | "end";
  spacing?: number;
  // Force the line to an exact width (letter spacing only), so a layout can rely on its extent.
  width?: number;
  tex?: Tex;
};

// The riso headline: the same text printed once per ink, overprinting where the passes overlap.
export const MisregisterText: FC<MisregisterProps> = ({ text, x, y, size, font = DISPLAY, weight = 800, inks = [PINK, BLUE], anchor = "middle", spacing = 0, width, tex = "type", k = 0, ...cue }) => {
  const id = `mt${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <>
      {inks.map((p, i) => {
        const ink = typeof p === "string" ? p : p.ink;
        const fill = typeof p === "string" ? undefined : `url(#${id}${i})`;
        return (
          <Plate key={i} ink={ink} tex={tex} k={k + i} {...cue}>
            {typeof p !== "string" && (
              <defs>
                <DotPattern id={`${id}${i}`} color={p.ink} tone={p.tone} cell={p.cell ?? Math.max(8, size / 14)} angle={SCREEN_ANGLE[p.ink] ?? 45} />
              </defs>
            )}
            <text
              x={x}
              y={y}
              fontFamily={font}
              fontWeight={weight}
              fontSize={size}
              textAnchor={anchor}
              letterSpacing={spacing}
              fill={fill}
              textLength={width}
              lengthAdjust={width ? "spacing" : undefined}
            >
              {text}
            </text>
          </Plate>
        );
      })}
    </>
  );
};

export type PrintWord = {
  w: string;
  // Seconds the word is said; it prints a few frames ahead (lead) so it lands on the word.
  t: number;
  ink?: string;
  // The key word: gets a second, off-register ink and an optional yellow block printed under it.
  key?: boolean;
  block?: boolean;
  // Seconds to kick its misregistration wide (emphasis on a later mention).
  kick?: number;
  size?: number;
  font?: string;
};

// A line (or two) of words that print one by one, laid out by the browser so spacing is exact.
export const PrintWords: FC<{
  words: PrintWord[];
  size?: number;
  font?: string;
  weight?: number;
  ink?: string;
  keyInks?: [string, string];
  lead?: number;
  out?: number;
  style?: CSSProperties;
  gap?: number;
}> = ({ words, size = 96, font = DISPLAY, weight = 800, ink = BLACK, keyInks = [PINK, BLUE], lead = 0.12, out, style, gap = 0.28 }) => (
  <div style={{ position: "absolute", left: 96, right: 96, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.12, ...style }}>
    <Defs />
    {words.map((wd, i) => {
      const at = wd.t - lead;
      const fs = wd.size ?? size;
      return (
        <span key={i} style={{ position: "relative", display: "inline-block", marginRight: i < words.length - 1 ? fs * gap : 0, fontSize: fs, fontFamily: wd.font ?? font, padding: wd.block ? `0 ${fs * 0.08}px` : 0 }}>
          <span style={{ visibility: "hidden", whiteSpace: "pre" }}>{wd.w}</span>
          {wd.block && <Ink ink={YELLOW} tex="ink" at={at - 0.1} out={out} style={{ left: -fs * 0.08, right: -fs * 0.08, top: "16%", bottom: "4%", background: "currentColor" }} />}
          {wd.key ? (
            <>
              <Ink ink={keyInks[0]} at={at} k={0} kick={wd.kick} out={out} style={{ left: wd.block ? fs * 0.08 : 0, top: 0, whiteSpace: "pre" }}>{wd.w}</Ink>
              <Ink ink={keyInks[1]} at={at} k={1} reg={4} kick={wd.kick} out={out} style={{ left: wd.block ? fs * 0.08 : 0, top: 0, whiteSpace: "pre" }}>{wd.w}</Ink>
            </>
          ) : (
            <Ink ink={wd.ink ?? ink} at={at} out={out} kick={wd.kick} style={{ left: 0, top: 0, whiteSpace: "pre" }}>{wd.w}</Ink>
          )}
        </span>
      );
    })}
  </div>
);
