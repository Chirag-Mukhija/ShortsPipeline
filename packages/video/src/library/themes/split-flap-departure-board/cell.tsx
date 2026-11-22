// The flap cell in CSS 3D: two static halves, the old top half falling and the new bottom half landing, with hinge, pins, fold shading and the shadow the falling flap throws on the lower flap.
import type { CSSProperties, FC } from "react";
import { useCurrentFrame } from "remotion";
import { flapState, type CellSpec, type FlapState } from "./flap";
import { FACE_BOT, FACE_BOT2, FACE_TOP, FACE_TOP2, FLAP, HINGE, SLOT, TONE, cellW, gapFor, type Tone } from "./theme";

// Glyphs Oswald doesn't carry are drawn as shapes, sized to the cap height so they sit like printed flaps.
const Glyph: FC<{ ch: string; h: number; w: number; tone: Tone; weight: number }> = ({ ch, h, w, tone, weight }) => {
  const color = TONE[tone];
  if (ch === "■") return <div style={{ position: "absolute", left: w * 0.1, top: h * 0.1, width: w * 0.8, height: h * 0.8, background: color, borderRadius: w * 0.04 }} />;
  if (ch === "▲" || ch === "▼") {
    const up = ch === "▲";
    return (
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        <polygon points={up ? `${w * 0.5},${h * 0.3} ${w * 0.84},${h * 0.7} ${w * 0.16},${h * 0.7}` : `${w * 0.16},${h * 0.3} ${w * 0.84},${h * 0.3} ${w * 0.5},${h * 0.7}`} fill={color} />
      </svg>
    );
  }
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FLAP, fontWeight: weight, fontSize: h * 0.74, lineHeight: 1, color, transform: `translateY(${h * 0.015}px)` }}>
      {ch === " " ? "" : ch}
    </div>
  );
};

type HalfProps = { part: "top" | "bottom"; ch: string; tone: Tone; h: number; w: number; weight: number; rot?: number; shade?: number; cast?: number };

// One half of a flap: clipped glyph, the plastic's vertical gradient, an optional fold shade and a cast shadow from above.
const Half: FC<HalfProps> = ({ part, ch, tone, h, w, weight, rot, shade = 0, cast = 0 }) => {
  const top = part === "top";
  const hh = h / 2 - 1;
  const r = Math.max(2, w * 0.06);
  const style: CSSProperties = {
    position: "absolute",
    left: 0,
    top: top ? 0 : h / 2 + 1,
    width: w,
    height: hh,
    overflow: "hidden",
    borderRadius: top ? `${r}px ${r}px 0 0` : `0 0 ${r}px ${r}px`,
    background: top ? `linear-gradient(${FACE_TOP}, ${FACE_TOP2})` : `linear-gradient(${FACE_BOT}, ${FACE_BOT2})`,
    transformOrigin: top ? "50% 100%" : "50% 0%",
    transform: rot !== undefined ? `rotateX(${rot}deg)` : undefined,
    backfaceVisibility: "hidden",
  };
  return (
    <div style={style}>
      <div style={{ position: "absolute", left: 0, top: top ? 0 : -(h / 2 + 1), width: w, height: h }}>
        <Glyph ch={ch} h={h} w={w} tone={tone} weight={weight} />
      </div>
      {/* The 3 px inner shadow the top flap leaves on the lower one. */}
      {!top && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0) 4px)" }} />}
      {top && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0) 30%)" }} />}
      {cast > 0 && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(rgba(0,0,0,${cast}), rgba(0,0,0,${cast * 0.35}) 70%, rgba(0,0,0,${cast * 0.15}))` }} />}
      {shade > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${shade})` }} />}
    </div>
  );
};

export type CellLook = { h: number; weight?: number; slot?: boolean };

// Draws one cell from a state, so callers can drive it from flapState or by hand.
export const CellView: FC<CellLook & { s: FlapState; x?: number; y?: number }> = ({ s, h, x = 0, y = 0, weight = 500, slot = true }) => {
  const w = cellW(h);
  const u = s.u;
  // The landing flap rebounds once (about 7° then settles) over ~6 frames after the final clack.
  const bounce = !s.flipping && s.since >= 0 && s.since < 8 ? 7 * Math.exp(-s.since / 1.8) * Math.sin((s.since / 6) * Math.PI) : 0;
  const falling = s.flipping && u < 0.5;
  const landing = s.flipping && u >= 0.5;
  // Shadow the falling flap throws on the lower flap: grows as it swings over, then the new flap covers it.
  const cast = s.flipping ? 0.62 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (landing ? 1 - (u - 0.5) * 1.4 : 1) : bounce > 0 ? 0.1 : 0;
  const g = gapFor(h);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, perspective: h * 7 }}>
      {slot && <div style={{ position: "absolute", left: -g / 2, top: -g / 2, width: w + g, height: h + g, background: SLOT, borderRadius: Math.max(3, w * 0.08) }} />}
      <Half part="top" ch={s.flipping ? s.next : s.cur} tone={s.flipping ? s.nextTone : s.curTone} h={h} w={w} weight={weight} shade={s.flipping ? 0.45 * (1 - u) : 0} />
      <Half part="bottom" ch={s.cur} tone={s.curTone} h={h} w={w} weight={weight} cast={cast} />
      {falling && <Half part="top" ch={s.cur} tone={s.curTone} h={h} w={w} weight={weight} rot={-180 * u} shade={0.6 * (u / 0.5)} />}
      {landing && <Half part="bottom" ch={s.next} tone={s.nextTone} h={h} w={w} weight={weight} rot={180 * (1 - u)} shade={0.55 * ((1 - u) / 0.5)} />}
      {bounce > 0 && <Half part="bottom" ch={s.cur} tone={s.curTone} h={h} w={w} weight={weight} rot={bounce} />}
      {/* Hinge line and the two pins the flaps hang from. */}
      <div style={{ position: "absolute", left: 0, top: h / 2 - 1, width: w, height: 2, background: HINGE }} />
      <div style={{ position: "absolute", left: -1, top: h / 2 - h * 0.035, width: Math.max(3, w * 0.05), height: h * 0.07, background: HINGE, borderRadius: 1 }} />
      <div style={{ position: "absolute", right: -1, top: h / 2 - h * 0.035, width: Math.max(3, w * 0.05), height: h * 0.07, background: HINGE, borderRadius: 1 }} />
    </div>
  );
};

// A cell driven by its spec on the current frame.
export const FlapCell: FC<CellLook & { spec: CellSpec; x?: number; y?: number }> = ({ spec, ...rest }) => {
  const f = useCurrentFrame();
  return <CellView s={flapState(spec, f)} {...rest} />;
};
