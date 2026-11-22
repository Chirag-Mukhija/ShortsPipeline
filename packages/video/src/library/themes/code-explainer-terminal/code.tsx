// Code pieces: the typewriter CodeWindow (line focus, highlight wipe, zoom, error squiggles with a hover tooltip) and the red/green DiffView.
import type { FC } from "react";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { BACK17, CH, GREEN, MONO, ORANGE, PANEL, RED, SNAP, TEXT, fr } from "./theme";
import { sliceToks, tokenize, type Lang } from "./syntax";
import { Caret, Glyph, Toks, Win, typed } from "./chrome";

const PAD = 26;
const GUTTER = 78;
const TITLE = 58;

export type Focus = { from: number; to: number; at: number; until?: number; zoom?: number };
export type Squiggle = { line: number; from: number; to: number; at: number; msg?: string };

// Code window height for n lines at a font size.
export const codeHeight = (lines: number, size = 38) => TITLE + PAD * 2 + lines * Math.round(size * 1.55);

// A wavy red underline that draws on in 8 frames from `at`, spanning `width` px.
export const ErrorSquiggle: FC<{ x: number; y: number; width: number; at: number; color?: string }> = ({ x, y, width, at, color = RED }) => {
  const { t } = useTime();
  const p = ramp(t, at, fr(8));
  if (p <= 0) return null;
  const n = Math.max(2, Math.round(width / 14));
  const step = width / n;
  let d = `M0 4`;
  for (let i = 0; i < n; i++) d += ` q${step / 4} -5 ${step / 2} 0 t${step / 2} 0`;
  return (
    <svg width={width + 4} height={12} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

// Syntax-coloured code typed in at `cps`, lines sliding up 8 px as they start; `focus` wipes a bar across a line range, dims the rest to 35 % and can zoom the view; `squiggles` mark bugs.
export const CodeWindow: FC<{
  x: number;
  y: number;
  w: number;
  code: string;
  lang?: Lang;
  title?: string;
  at: number;
  cps?: number;
  size?: number;
  enter?: number;
  exit?: number;
  focus?: Focus;
  squiggles?: Squiggle[];
  caret?: boolean;
}> = ({ x, y, w, code, lang = "ts", title, at, cps = 50, size = 38, enter, exit, focus, squiggles = [], caret = true }) => {
  const { t } = useTime();
  const lines = code.split("\n");
  const lh = Math.round(size * 1.55);
  const h = codeHeight(lines.length, size);
  const cw = size * CH;
  const n = typed(t, at, cps);
  const offsets = lines.reduce<number[]>((acc, l, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + lines[i - 1]!.length + 1], []);
  const total = offsets[offsets.length - 1]! + lines[lines.length - 1]!.length;
  const typing = n < total;
  const cur = Math.max(0, offsets.findLastIndex((o) => o <= Math.min(n, total)));

  const fIn = focus ? ramp(t, focus.at, fr(6), SNAP) : 0;
  const fOut = focus?.until !== undefined ? ramp(t, focus.until, fr(6), SNAP) : 0;
  const fe = fIn * (1 - fOut);
  const zoom = focus?.zoom ? 1 + (focus.zoom - 1) * ramp(t, focus.at + fr(4), fr(12), INOUT) * (1 - (focus.until !== undefined ? ramp(t, focus.until, fr(10), INOUT) : 0)) : 1;
  const zoomY = focus ? PAD + ((focus.from + focus.to + 1) / 2) * lh : 0;

  return (
    <>
      <Win x={x} y={y} w={w} h={h} title={title} enter={enter ?? at - 0.3} exit={exit}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `0px ${zoomY}px` }}>
          {focus && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: PAD + focus.from * lh,
                height: (focus.to - focus.from + 1) * lh,
                width: `${fe * 100}%`,
                backgroundColor: "rgba(255,106,61,0.13)",
                borderLeft: `5px solid ${ORANGE}`,
                opacity: fIn > 0 ? 1 : 0,
              }}
            />
          )}
          {lines.map((line, i) => {
            const o = offsets[i]!;
            if (n < o || (n === 0 && i === 0 && t < at)) return null;
            const startT = at + o / cps;
            const rise = ramp(t, startT, fr(4), SNAP);
            const inFocus = focus ? i >= focus.from && i <= focus.to : true;
            const dim = inFocus ? 1 : 1 - 0.65 * fe;
            const shown = Math.min(line.length, n - o);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: PAD + i * lh,
                  height: lh,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: MONO,
                  fontWeight: 500,
                  fontSize: size,
                  whiteSpace: "pre",
                  transform: `translateY(${(1 - rise) * 8}px)`,
                  opacity: dim * clamp01(rise * 2),
                  textShadow: focus && inFocus && fe > 0 ? `0 0 ${18 * fe}px rgba(230,237,243,0.35)` : undefined,
                }}
              >
                <span style={{ width: GUTTER, flex: "none", textAlign: "right", paddingRight: 28, fontSize: size * 0.8, color: inFocus && focus && fe > 0.5 ? ORANGE : "#6E7681" }}>{i + 1}</span>
                <span style={{ paddingLeft: 12 }}>
                  <Toks toks={sliceToks(tokenize(line, lang), shown)} />
                  {caret && i === cur && (typing || i === lines.length - 1) && <Caret size={size} typing={typing} />}
                </span>
              </div>
            );
          })}
          {squiggles.map((s, k) => (
            <ErrorSquiggle key={k} x={GUTTER + 12 + s.from * cw} y={PAD + s.line * lh + lh * 0.82} width={(s.to - s.from) * cw} at={s.at} />
          ))}
        </div>
      </Win>
      {squiggles.map((s, k) => {
        if (!s.msg) return null;
        const p = ramp(t, s.at + 0.35, fr(8), BACK17);
        if (p <= 0) return null;
        return (
          <div
            key={`m${k}`}
            style={{
              position: "absolute",
              left: x + PAD + GUTTER + 12 + s.from * cw - 20,
              top: y + TITLE + PAD + (s.line + 1) * lh + 10,
              transform: `scale(${0.85 + 0.15 * p})`,
              transformOrigin: "30px 0",
              opacity: clamp01(p * 2),
              backgroundColor: PANEL,
              border: `1.5px solid ${RED}`,
              borderRadius: 12,
              padding: "16px 24px",
              boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
              fontFamily: MONO,
              fontWeight: 500,
              fontSize: 30,
              color: TEXT,
              whiteSpace: "pre",
            }}
          >
            <Glyph kind="cross" size={30} color={RED} />{"  "}
            {s.msg}
          </div>
        );
      })}
    </>
  );
};

export type DiffLine = { s: string; k?: " " | "-" | "+" };

// A diff: at `at` removed lines flash red and collapse, then added lines open in green with a 2-frame stagger; the tab counts the change.
export const DiffView: FC<{ x: number; y: number; w: number; lines: DiffLine[]; at: number; enter?: number; title?: string; lang?: Lang; size?: number }> = ({
  x,
  y,
  w,
  lines,
  at,
  enter,
  title = "diff",
  lang = "ts",
  size = 38,
}) => {
  const { t } = useTime();
  const lh = Math.round(size * 1.55);
  const kept = lines.filter((l) => l.k !== "-").length;
  const before = lines.filter((l) => l.k !== "+").length;
  const collapse = at + 0.45;
  const grow = ramp(t, collapse, fr(8) + fr(6) + lines.length * fr(2), INOUT);
  const h = TITLE + PAD * 2 + (before + (kept - before) * grow) * lh;
  let row = 0;
  let minus = 0;
  let plus = 0;
  const adds = lines.filter((l) => l.k === "+").length;
  const rems = lines.filter((l) => l.k === "-").length;
  const counter = ramp(t, at, fr(6));
  return (
    <>
      <Win x={x} y={y} w={w} h={h} title={title} enter={enter ?? at - 1}>
        {lines.map((l, i) => {
          const k = l.k ?? " ";
          let height = 1;
          let flash = 0;
          let slide = 0;
          if (k === "-") {
            const d = minus++ * fr(2);
            flash = ramp(t, at + d, fr(6));
            const c = ramp(t, collapse + d, fr(8), INOUT);
            height = 1 - c;
            slide = -60 * c;
          } else if (k === "+") {
            const d = plus++ * fr(2);
            const o = ramp(t, collapse + fr(6) + d, fr(8), INOUT);
            height = o;
            flash = o;
            slide = 60 * (1 - o);
          }
          const top = PAD + row * lh;
          row += height;
          if (height <= 0.001) return null;
          const tint = k === "-" ? `rgba(255,123,114,${0.2 * flash})` : k === "+" ? `rgba(63,185,80,${0.2 * flash})` : "transparent";
          const mark = k === " " ? " " : k;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top,
                height: lh * height,
                overflow: "hidden",
                backgroundColor: tint,
                borderLeft: k !== " " && flash > 0 ? `5px solid ${k === "-" ? RED : GREEN}` : "5px solid transparent",
              }}
            >
              <div style={{ height: lh, display: "flex", alignItems: "center", transform: `translateX(${slide}px)`, opacity: k === "-" ? height : clamp01(height * 1.5), fontFamily: MONO, fontWeight: 500, fontSize: size, whiteSpace: "pre" }}>
                <span style={{ width: 60, flex: "none", textAlign: "center", color: k === "-" ? RED : GREEN, opacity: flash }}>{mark}</span>
                <span>{l.s.match(/^\s*/)![0]}</span>
                <span style={{ textDecoration: k === "-" && flash > 0.5 ? `line-through ${RED}99` : undefined }}>
                  <Toks toks={tokenize(l.s.trimStart(), lang)} />
                </span>
              </div>
            </div>
          );
        })}
      </Win>
      <div
        style={{
          position: "absolute",
          left: x + w - 230,
          top: y + 12,
          opacity: counter,
          display: "flex",
          gap: 14,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 30,
        }}
      >
        <span style={{ color: GREEN }}>+{adds}</span>
        <span style={{ color: RED }}>-{rems}</span>
      </div>
    </>
  );
};
