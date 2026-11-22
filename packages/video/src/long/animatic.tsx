// The storyboard animatic: each planned shot as a labelled subject in a simple world, framed by a camera that obeys the shot's size and move, with the planned on-screen words; cheap to render, for the creator to judge the plan before graphics are built.
import type { EditShot, EditSpec, ShotSize } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const W = 1920;
const H = 1080;
// The world is a 3×3 grid of 1280×720 cells; shot k of a beat sits in cell k (wrapping), so glides and whips travel visibly.
const CELL_W = 1280;
const CELL_H = 720;
const slot = (k: number) => ({ x: CELL_W / 2 + CELL_W * (k % 3), y: CELL_H / 2 + CELL_H * (Math.floor(k / 3) % 3) });
// How much world width each shot size shows.
const FRAME: Record<ShotSize, number> = { wide: 3840, medium: 1920, mcu: 1320, cu: 900, ecu: 560 };
const WIDER: Record<ShotSize, ShotSize> = { wide: "wide", medium: "wide", mcu: "medium", cu: "mcu", ecu: "cu" };
const TIGHTER: Record<ShotSize, ShotSize> = { wide: "medium", medium: "mcu", mcu: "cu", cu: "ecu", ecu: "ecu" };
const SIZE_LABEL: Record<ShotSize, string> = { wide: "WIDE", medium: "MEDIUM", mcu: "MED CLOSE-UP", cu: "CLOSE-UP", ecu: "EXTREME CU" };
const INK = "#ededed";
const DIM = "#6e6e6e";
const ACCENT = "#ff6b50";

type Placed = EditShot & { k: number; end: number };

function placed(spec: EditSpec, beatId: string): Placed[] {
  const beat = spec.beats.find((b) => b.id === beatId);
  const list = (spec.shots ?? []).filter((s) => s.beat === beatId).sort((a, b) => a.at - b.at);
  return list.map((s, k) => ({ ...s, k, end: list[k + 1]?.at ?? beat?.end ?? s.at + 3 }));
}

// Camera at time t: where it looks (world x, y) and how much world width it shows, plus how fast it moves (for whip blur).
function camera(shots: Placed[], t: number) {
  const i = Math.max(0, shots.findIndex((s, n) => t >= s.at && (n === shots.length - 1 || t < shots[n + 1]!.at)));
  const s = shots[i]!;
  const prev = shots[i - 1];
  const to = { ...slot(s.k), w: FRAME[s.size] };
  const from =
    s.move === "push" ? { ...slot(s.k), w: FRAME[WIDER[s.size]] * 1.25 } :
    s.move === "pull" ? { ...slot(s.k), w: FRAME[TIGHTER[s.size]] * 0.8 } :
    (s.move === "glide" || s.move === "whip") && prev ? { ...slot(prev.k), w: FRAME[prev.size] } :
    to;
  const dur = s.move === "whip" ? 0.35 : s.move === "hold" || s.move === "cut" ? 0.01 : Math.min(1.6, (s.end - s.at) * 0.6);
  const e = interpolate(t, [s.at, s.at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const drift = Math.sin(t * 0.7) * 6;
  const speed = s.move === "whip" && e > 0 && e < 1 ? 1 : 0;
  return { shot: s, index: i, x: from.x + (to.x - from.x) * e + drift, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, speed };
}

export const Animatic: FC<{ spec: EditSpec; beatId: string }> = ({ spec, beatId }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const beat = spec.beats.find((b) => b.id === beatId);
  const shots = placed(spec, beatId);
  const beatNo = spec.beats.findIndex((b) => b.id === beatId) + 1;

  if (!beat || !shots.length) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#101114", alignItems: "center", justifyContent: "center", fontFamily: "Inter, Arial, sans-serif" }}>
        <div style={{ color: DIM, fontSize: 30, letterSpacing: 4 }}>BEAT {beatNo} · NO SHOTS PLANNED YET</div>
        <div style={{ color: INK, fontSize: 56, fontWeight: 700, marginTop: 14 }}>{beat?.label ?? beatId}</div>
      </AbsoluteFill>
    );
  }
  const cam = camera(shots, t);
  const scale = W / cam.w;
  const words = (cam.shot.text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const outIn = cam.shot.transitionOut ? interpolate(t, [cam.shot.end - 0.8, cam.shot.end - 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#101114", fontFamily: "Inter, Arial, sans-serif", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 3840, height: 2160, transformOrigin: "0 0", transform: `translate(${W / 2 - cam.x * scale}px, ${H / 2 - cam.y * scale}px) scale(${scale})`, filter: cam.speed ? "blur(18px)" : undefined }}>
        {/* The world grid, so the camera's movement reads */}
        <svg width={3840} height={2160} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 25 }, (_, i) => <line key={`v${i}`} x1={i * 160} y1={0} x2={i * 160} y2={2160} stroke="#1b1d22" strokeWidth={2} />)}
          {Array.from({ length: 14 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 160} x2={3840} y2={i * 160} stroke="#1b1d22" strokeWidth={2} />)}
        </svg>
        {shots.map((s) => {
          const c = slot(s.k);
          const active = s.id === cam.shot.id;
          return (
            <div key={s.id} style={{ position: "absolute", left: c.x - 300, top: c.y - 170, width: 600, height: 340, borderRadius: 28, border: `4px solid ${active ? ACCENT : "#2a2d34"}`, background: active ? "#1a1c22" : "#15171b", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px" }}>
              <div style={{ color: DIM, fontSize: 26, letterSpacing: 3 }}>SHOT {s.k + 1}</div>
              <div style={{ color: active ? INK : "#8a8a8a", fontSize: 54, fontWeight: 700, lineHeight: 1.1, marginTop: 8 }}>{s.subject}</div>
              <div style={{ color: active ? "#b9b9b9" : "#5c5c5c", fontSize: 32, marginTop: 10 }}>{s.action}</div>
            </div>
          );
        })}
      </div>

      {/* Screen-space HUD: where we are in the plan and what the camera is doing */}
      <div style={{ position: "absolute", left: 48, top: 40, color: DIM, fontSize: 26, letterSpacing: 3 }}>
        BEAT {beatNo} · {beat.label ?? beatId} · SHOT {cam.index + 1}/{shots.length}
      </div>
      <div style={{ position: "absolute", right: 48, top: 36, display: "flex", gap: 12 }}>
        <span style={{ background: "#1f2128", color: INK, fontSize: 26, padding: "6px 16px", borderRadius: 999 }}>{SIZE_LABEL[cam.shot.size]}</span>
        <span style={{ background: ACCENT, color: "#1c0702", fontSize: 26, fontWeight: 700, padding: "6px 16px", borderRadius: 999 }}>{cam.shot.move.toUpperCase()}</span>
      </div>
      {cam.shot.text ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center" }}>
          <span style={{ color: words > 8 ? "#f0506e" : INK, fontSize: 64, fontWeight: 700, background: "rgba(0,0,0,0.55)", padding: "10px 28px", borderRadius: 14 }}>{cam.shot.text}</span>
          {words > 8 ? <div style={{ color: "#f0506e", fontSize: 26, marginTop: 12 }}>{words} words on screen: 8 at most</div> : null}
        </div>
      ) : null}
      {cam.shot.transitionOut ? (
        <div style={{ position: "absolute", right: 48, bottom: 48, opacity: outIn, color: ACCENT, fontSize: 30, letterSpacing: 2 }}>→ {cam.shot.transitionOut}</div>
      ) : null}
    </AbsoluteFill>
  );
};
