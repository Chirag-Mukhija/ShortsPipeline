// The flip-wipe scene transition (the whole frame becomes a stack of giant flaps) and the click track: synthesized clacks placed on the exact frames the cells land.
import type { FC, ReactNode } from "react";
import { Audio, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { H, W } from "../../core/video";
import { clackFrames, type CellSpec } from "./flap";
import { AMBER, FPS, HINGE, PAINT, WALL } from "./theme";

// ---- Flip-wipe ----
const Clip: FC<{ y: number; h: number; scene: ReactNode; origin?: "top" | "bottom"; rot?: number; shade?: number; cast?: number }> = ({ y, h, scene, origin, rot, shade = 0, cast = 0 }) => (
  <div style={{ position: "absolute", left: 0, top: y, width: W, height: h, overflow: "hidden", background: WALL, transformOrigin: origin === "top" ? "50% 0%" : "50% 100%", transform: rot !== undefined ? `rotateX(${rot}deg)` : undefined, backfaceVisibility: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: -y, width: W, height: H }}>{scene}</div>
    {cast > 0 && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(rgba(0,0,0,${cast}), rgba(0,0,0,${cast * 0.2}))` }} />}
    {shade > 0 && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${shade})` }} />}
  </div>
);

// Gravity on a big flap: it starts slowly off the hinge and accelerates into the stop.
const FALL = Easing.in(Easing.quad);

export const flipWipeBands = (at: number, dur: number, bands: number, flip: number) =>
  Array.from({ length: bands }, (_, i) => at + (bands > 1 ? (i * (dur - flip)) / (bands - 1) : 0));

// The frame splits into `bands` giant split-flaps that fall top to bottom: each band's top half of the old scene falls and the new scene's lower half lands.
export const FlipWipe: FC<{ at: number; dur?: number; bands?: number; flip?: number; from: ReactNode; to: ReactNode }> = ({ at, dur = 1.1, bands = 5, flip = 0.42, from, to }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  if (t < at) return <>{from}</>;
  if (t >= at + dur + 0.2) return <>{to}</>;
  const bh = H / bands;
  const starts = flipWipeBands(at, dur, bands, flip);
  const env = Math.sin(Math.min(1, (t - at) / (dur + 0.2)) * Math.PI);
  return (
    <div style={{ position: "absolute", inset: 0, background: WALL }}>
      {starts.map((s, i) => {
        const y = i * bh;
        const raw = (t - s) / flip;
        const u = FALL(Math.min(1, Math.max(0, raw)));
        // After landing, the band rebounds a few degrees like a heavy flap.
        const since = (t - s - flip) * FPS;
        const bounce = since >= 0 && since < 9 ? 6 * Math.exp(-since / 2.5) * Math.sin((since / 8) * Math.PI) : 0;
        return (
          <div key={i} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, perspective: 2200, perspectiveOrigin: `50% ${y + bh / 2}px` }}>
            {raw <= 0 && <Clip y={y} h={bh} scene={from} />}
            {raw >= 1 && bounce === 0 && <Clip y={y} h={bh} scene={to} />}
            {raw >= 1 && bounce !== 0 && (
              <>
                <Clip y={y} h={bh / 2} scene={to} />
                <Clip y={y + bh / 2} h={bh / 2} scene={to} origin="top" rot={bounce} />
              </>
            )}
            {raw > 0 && raw < 1 && (
              <>
                <Clip y={y} h={bh / 2} scene={to} shade={0.55 * (1 - u)} />
                <Clip y={y + bh / 2} h={bh / 2} scene={from} cast={0.7 * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5)} />
                {u < 0.5 && <Clip y={y} h={bh / 2} scene={from} origin="bottom" rot={-180 * u} shade={0.65 * (u / 0.5)} />}
                {u >= 0.5 && <Clip y={y + bh / 2} h={bh / 2} scene={to} origin="top" rot={180 * (1 - u)} shade={0.6 * ((1 - u) / 0.5)} />}
              </>
            )}
            <div style={{ position: "absolute", left: 0, top: y + bh / 2 - 2, width: W, height: 4, background: HINGE, opacity: env }} />
            <div style={{ position: "absolute", left: 0, top: y - 3, width: W, height: 6, background: HINGE, opacity: i === 0 ? 0 : env }} />
          </div>
        );
      })}
    </div>
  );
};

// ---- Click track ----
// A plastic flap clack, synthesized once: a bright tick off the stop, a woody body around 1.6–2.2 kHz, and a softer second hit 8 ms later as the flap settles.
const synthClack = (seed: number) => {
  const rate = 22050;
  const n = Math.round(rate * 0.07);
  let s = seed * 9301 + 49297;
  const noise = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  const freq = 1600 + seed * 230;
  const pcm = new Int16Array(n);
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const x = noise();
    hp = 0.85 * (hp + x - prev);
    prev = x;
    const hit = (d: number, a: number) => (t >= d ? a * (hp * Math.exp(-(t - d) / 0.0025) * 1.6 + Math.sin(2 * Math.PI * freq * (t - d)) * Math.exp(-(t - d) / 0.009) * 0.7) : 0);
    pcm[i] = Math.max(-32767, Math.min(32767, Math.round((hit(0, 1) + hit(0.008, 0.45)) * 22000)));
  }
  const bytes = new Uint8Array(44 + n * 2);
  const v = new DataView(bytes.buffer);
  const str = (o: number, x: string) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  new Uint8Array(pcm.buffer).forEach((b, i) => v.setUint8(44 + i, b));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
};
let clacks: string[] | null = null;
const clackSrc = (i: number) => (clacks ??= [0, 1, 2].map(synthClack))[i % 3]!;

// Clacks per whole frame: many cells landing together make one louder clack, not a pile of overlapping ones.
export const clackHistogram = (specs: CellSpec[]) => {
  const m = new Map<number, number>();
  for (const s of specs) for (const fr of clackFrames(s)) {
    const k = Math.round(fr);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
};

export const ClickTrack: FC<{ specs: CellSpec[]; volume?: number }> = ({ specs, volume = 0.5 }) => (
  <>
    {clackHistogram(specs).filter(([fr]) => fr >= 0).map(([fr, c], i) => (
      <Sequence key={fr} from={fr} durationInFrames={3} layout="none">
        <Audio src={clackSrc(i)} volume={Math.min(1, volume * (0.45 + 0.18 * Math.sqrt(c)))} />
      </Sequence>
    ))}
  </>
);

// A visible readout of the same clacks: one tick per frame that clacks, taller for more cells, lit once played.
export const ClickStrip: FC<{ specs: CellSpec[]; x: number; y: number; w: number; frames: number }> = ({ specs, x, y, w, frames }) => {
  const f = useCurrentFrame();
  const hist = clackHistogram(specs);
  const peak = Math.max(1, ...hist.map(([, c]) => c));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 120 }}>
      <div style={{ position: "absolute", left: 0, top: -48, fontFamily: PAINT, fontWeight: 600, fontSize: 30, letterSpacing: "0.16em", color: AMBER }}>CLACK TRACK</div>
      <div style={{ position: "absolute", right: 0, top: -48, fontFamily: PAINT, fontWeight: 600, fontSize: 30, letterSpacing: "0.12em", color: "#B4AFA3" }}>{hist.filter(([fr]) => fr <= f).reduce((a, [, c]) => a + c, 0)} FLAPS</div>
      <div style={{ position: "absolute", left: 0, top: 118, width: w, height: 2, background: "#3A3C41" }} />
      {hist.map(([fr, c]) => {
        const hgt = interpolate(c, [1, peak], [18, 110]);
        return <div key={fr} style={{ position: "absolute", left: (fr / frames) * w - 2, top: 118 - hgt, width: 4, height: hgt, background: fr <= f ? AMBER : "#3A3C41", borderRadius: 1 }} />;
      })}
      <div style={{ position: "absolute", left: (f / frames) * w - 1, top: -6, width: 2, height: 130, background: "#F2EFE6" }} />
    </div>
  );
};
