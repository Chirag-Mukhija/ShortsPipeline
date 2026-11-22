// Scene-level moves only this theme makes: pattern iris, luminance-mask dissolve, the live swatch grid with its camera zoom, and the beat-driven field for music-only sections.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { useSong, type SectionName } from "../../core/beat";
import { INOUT, POP, ramp, useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { PatternCanvas } from "./canvas";
import { irisR } from "./motion";
import type { PatternLook } from "./pieces";
import { blendPalette, INK, MARGIN, PALETTES, WHITE } from "./theme";
import { Display, Label } from "./type";

// Circular reveal of one pattern over another (board: iris 0 → 150 % over 20 f, expo-out). Both patterns keep running throughout.
export const PatternIris: FC<{ from: PatternLook; to: PatternLook; at: number; centre?: [number, number]; dur?: number; fromContent?: ReactNode; toContent?: ReactNode }> = ({ from, to, at, centre = [W / 2, H / 2], dur = 20 / 30, fromContent, toContent }) => {
  const { t } = useTime();
  const r = irisR(t, at, dur);
  const [cx, cy] = centre;
  const full = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x! - cx, y! - cy)));
  const ringOpacity = 1 - ramp(t, at + dur * 0.4, dur * 0.6);
  return (
    <AbsoluteFill>
      {r < full && (
        <AbsoluteFill>
          <PatternCanvas pattern={from.pattern} colors={from.colors} params={from.params} scale={from.scale} speed={from.speed} />
          {fromContent}
        </AbsoluteFill>
      )}
      {r > 0 && (
        <AbsoluteFill style={{ clipPath: `circle(${r}px at ${cx}px ${cy}px)` }}>
          <PatternCanvas pattern={to.pattern} colors={to.colors} params={to.params} scale={to.scale} speed={to.speed} />
          {toContent}
        </AbsoluteFill>
      )}
      {r > 0 && ringOpacity > 0 && (
        <div style={{ position: "absolute", left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `10px solid ${to.colors[1] ?? WHITE}`, boxSizing: "border-box", opacity: ringOpacity }} />
      )}
    </AbsoluteFill>
  );
};

// Board transition: scene A's pattern becomes the mask of scene B. As the threshold rises, every pixel whose field value is
// below it goes transparent (voronoi drops out cell by cell, spirals thin to nothing), showing scene B (children) beneath.
export const PatternDissolve: FC<{ a: PatternLook; at: number; dur?: number; aContent?: ReactNode; children: ReactNode }> = ({ a, at, dur = 0.8, aContent, children }) => {
  const { t } = useTime();
  const th = interpolate(t, [at, at + dur], [0, 1.03], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: INOUT });
  return (
    <AbsoluteFill>
      {children}
      {th < 1.03 && <PatternCanvas pattern={a.pattern} colors={a.colors} params={a.params} scale={a.scale} speed={a.speed} threshold={th} />}
      {aContent && <AbsoluteFill style={{ opacity: 1 - ramp(t, at - 0.15, 0.3) }}>{aContent}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

export type Swatch = PatternLook & { name: string };

export const SWATCHES: Swatch[] = [
  { name: "spiral", pattern: "spiral", colors: PALETTES.pool, params: [1, 7] },
  { name: "swirl", pattern: "swirl", colors: PALETTES.blush },
  { name: "waves", pattern: "waves", colors: PALETTES.mustard, params: [7, 4] },
  { name: "voronoi", pattern: "voronoi", colors: PALETTES.amber, params: [3.4] },
  { name: "perlin", pattern: "perlin", colors: PALETTES.lilac },
  { name: "dot orbit", pattern: "dots", colors: PALETTES.sunset, params: [8, 0.28, 0.16, 0] },
  { name: "metaballs", pattern: "metaballs", colors: PALETTES.ember, params: [1.3, 0.9] },
  { name: "god rays", pattern: "rays", colors: PALETTES.indigo, params: [0, -0.7, 9, 1.4] },
  { name: "stripes", pattern: "stripes", colors: PALETTES.poster, params: [0.7, 4, 0.2, 2.4] },
  { name: "contours", pattern: "perlin", colors: PALETTES.sunset, params: [1.6, 4, 0.8, 0] },
  { name: "halftone", pattern: "dots", colors: ["#04040a", "#3d7bff", "#ff4fa3"], params: [11, 0.46, 0, 2] },
  { name: "zigzag", pattern: "waves", colors: ["#2f4bff", "#ffd447", "#ff5e3a"], params: [6, 3, 0.5, 0.36] },
];

// "Choose one of N": a 4×3 wall of live tiles; the pick gets a ring, the rest dim, and the camera zooms into it until it is the frame.
// Tiles are re-rendered at their on-screen size each frame (not CSS-scaled), so the zoomed pattern stays sharp; off-screen tiles are skipped.
export const SwatchGrid: FC<{ items?: Swatch[]; pick: number; at: number; select?: number; dur?: number; title?: string; page?: string }> = ({ items = SWATCHES, pick, at, select = at - 0.8, dur = 1.1, title = "Pick one", page = INK }) => {
  const { t } = useTime();
  const cols = 4, rows = 3, gap = 24, top = 172;
  const tw = (W - MARGIN * 2 - gap * (cols - 1)) / cols;
  const th = (H - top - MARGIN - gap * (rows - 1)) / rows;
  const tile = (i: number) => ({ x: MARGIN + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap) });
  const e = ramp(t, at, dur, INOUT);
  const target = tile(pick);
  const sFill = Math.max(W / tw, H / th) * 1.01;
  // Zoom about the one fixed point that lands the picked tile's centre on the frame centre at full zoom.
  const zx = (W / 2 - (target.x + tw / 2) * sFill) / (1 - sFill);
  const zy = (H / 2 - (target.y + th / 2) * sFill) / (1 - sFill);
  const s = Math.pow(sFill, e);
  const sel = ramp(t, select, 0.35, POP);
  const dim = ramp(t, select, 0.4);
  const labels = 1 - ramp(t, at, 0.3);
  const done = ramp(t, at + dur - 0.15, 0.5);
  return (
    <AbsoluteFill style={{ backgroundColor: page }}>
      {items.slice(0, cols * rows).map((it, i) => {
        const p = tile(i);
        const rect = { x: zx + (p.x - zx) * s, y: zy + (p.y - zy) * s, w: tw * s, h: th * s };
        if (rect.x > W || rect.y > H || rect.x + rect.w < 0 || rect.y + rect.h < 0) return null;
        const chosen = i === pick;
        return (
          <div key={it.name} style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: 22 * s * (1 - e), overflow: "hidden" }}>
            <PatternCanvas rect={rect} anchor="self" pattern={it.pattern} colors={it.colors} params={it.params} scale={it.scale} speed={it.speed} style={{ left: 0, top: 0 }} />
            {!chosen && <AbsoluteFill style={{ backgroundColor: page, opacity: dim * 0.62 }} />}
            {labels > 0 && (
              <div style={{ position: "absolute", left: 14, bottom: 14, opacity: labels }}>
                <Label color={WHITE} plate={INK} size={28}>{String(i + 1).padStart(2, "0")} {it.name}</Label>
              </div>
            )}
          </div>
        );
      })}
      {sel > 0 && e < 1 && (() => {
        const p = tile(pick);
        const pad = 12 * s;
        return <div style={{ position: "absolute", left: zx + (p.x - zx) * s - pad, top: zy + (p.y - zy) * s - pad, width: tw * s + pad * 2, height: th * s + pad * 2, borderRadius: 30 * s * (1 - e), border: `8px solid ${WHITE}`, boxSizing: "border-box", transform: `scale(${0.9 + 0.1 * sel})`, opacity: Math.min(sel, 1 - e) }} />;
      })()}
      <div style={{ position: "absolute", left: MARGIN, top: 76, opacity: labels }}>
        <Label color={WHITE} size={34}>{title}</Label>
      </div>
      {done > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
          <div style={{ opacity: done, transform: `translateY(${(1 - done) * 30}px)` }}>
            <Label color={WHITE} plate={INK} size={32}>No. {String(pick + 1).padStart(2, "0")}</Label>
          </div>
          <Display size={240} blend="difference" style={{ opacity: done, transform: `scale(${1.15 - 0.15 * done})` }}>{items[pick]?.name}</Display>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Music-only field: pattern speed follows section energy (integrated, so it never jumps), dots or blobs punch on the kick,
// the palette crossfades at each section start, and one word per bar sits on top with difference blend. Needs a <Track>.
export const BeatField: FC<{ pattern?: "dots" | "metaballs" | "spiral"; palettes: Partial<Record<SectionName, string[]>>; words?: string[]; labels?: boolean }> = ({ pattern = "dots", palettes, words = [], labels = true }) => {
  const { t, clock, pulse, energy, pos } = useSong();
  let pt = 0;
  const step = 1 / 15;
  for (let x = 0; x < t; x += step) pt += Math.min(step, t - x) * (0.4 + 1.6 * clock.energy(x));
  const idx = clock.sectionIndex(t);
  const cur = clock.sections[idx];
  const prev = clock.sections[idx - 1];
  const fallback = Object.values(palettes)[0] ?? PALETTES.sunset;
  const palOf = (n?: SectionName) => (n && palettes[n]) || fallback;
  const pal = prev && cur ? blendPalette(palOf(prev.name), palOf(cur.name), ramp(t, cur.start, 0.5, INOUT)) : palOf(cur?.name);
  const kick = pulse * (0.4 + energy);
  const params =
    pattern === "dots" ? [11, 0.2 + 0.14 * kick, 0.08 + 0.14 * energy, 0] : pattern === "metaballs" ? [1.1, 1, 0.35 * kick, 6] : [1, 8 * (1 + 0.25 * kick), 0.5, 0];
  const word = words.length ? words[(pos.bar - 1 + words.length * 100) % words.length] : undefined;
  return (
    <AbsoluteFill style={{ backgroundColor: pal[0] }}>
      <PatternCanvas pattern={pattern} colors={pal} params={params} time={pt} />
      {word && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Display key={word} size={300} blend="difference" style={{ transform: `scale(${1 + 0.1 * (pos.beatInBar === 1 ? pulse : 0)})` }}>{word}</Display>
        </AbsoluteFill>
      )}
      {labels && (
        <>
          <div style={{ position: "absolute", left: MARGIN, bottom: MARGIN }}>
            <Label color={WHITE} plate={INK}>bar {pos.bar} · {cur?.name ?? ""}</Label>
          </div>
          <div style={{ position: "absolute", right: MARGIN, bottom: MARGIN, display: "flex", gap: 14 }}>
            {[1, 2, 3, 4].map((b) => (
              <div key={b} style={{ width: 28, height: 28, borderRadius: 14, background: pos.beatInBar === b ? WHITE : INK, transform: `scale(${pos.beatInBar === b ? 1 + 0.4 * pulse : 1})` }} />
            ))}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
