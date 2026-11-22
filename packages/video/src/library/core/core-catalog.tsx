// Catalog of theme-free items (camera, transitions), demoed on plain neutral shapes so they read without any theme.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { LibraryTheme } from "./catalog";
import { camAt } from "./camera";
import { blurIn, blurOut } from "./transitions";
import { INOUT, ramp, useTime } from "./time";
import { H, W } from "./video";
import { Track, useSong } from "./beat";
import { motionEntries } from "./catalog-motion";
import { cameraEntries } from "./catalog-camera";

const Blocks: FC = () => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i}>
        <rect x={160 + i * 330} y={420} width={260} height={240} rx={18} fill={i === 2 ? "#ff6b50" : "#3a3a40"} />
        <text x={290 + i * 330} y={555} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize={44} fontWeight={700} fill="#f5f5f2">{i + 1}</text>
      </g>
    ))}
  </svg>
);

// Five blocks: the one on the current beat lights and pulses; bigger in the peak section.
const BeatBlocks: FC = () => {
  const { pulse, energy, pos } = useSong();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {[0, 1, 2, 3].map((i) => {
        const on = pos.beatInBar === i + 1;
        const s = on ? 1 + 0.25 * pulse * (0.5 + energy) : 1;
        return <rect key={i} x={360 + i * 320 - 110 * (s - 1)} y={420 - 110 * (s - 1)} width={220 * s} height={220 * s} rx={20} fill={on ? "#ff6b50" : "#3a3a40"} />;
      })}
      <text x={960} y={800} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize={48} fontWeight={700} fill="#f5f5f2">bar {pos.bar} · beat {pos.beatInBar}</text>
    </svg>
  );
};

const Neutral: FC = () => <AbsoluteFill style={{ backgroundColor: "#16161a" }} />;

export const core: LibraryTheme = {
  slug: "core",
  name: "Core (any theme)",
  summary: "Theme-free building blocks: timing helpers, keyed camera, blur and fade transitions. Every theme may use these.",
  feel: ["neutral"],
  status: "ready",
  Background: Neutral,
  entries: [
    ...cameraEntries,
    ...motionEntries,
    {
      id: "beat-clock",
      kind: "primitive",
      title: "Beat clock (music-only timing)",
      useFor: "Driving any theme from the music: wrap a scene in <Track spec={{ bpm, sections }}> and read beat, bar, pulse and section energy with useSong(). Cues can be seconds or { bar, beat }.",
      api: "<Track spec={{ bpm, offsetSec?, signature?, sections? }} from?> · useSong() → { pulse, energy, pos } · holdFor(words)",
      seconds: 4,
      origin: "lyric-visualiser-music-only theme",
      Demo: () => (
        <Track spec={{ bpm: 120, sections: [{ name: "build", start: 0, end: 2 }, { name: "peak", start: 2, end: 4 }] }}>
          <BeatBlocks />
        </Track>
      ),
    },
    {
      id: "camera-keys",
      kind: "camera",
      title: "Keyed pan and zoom",
      useFor: "Walking the viewer through a wide world-space scene: zoom into one part, pan along, pull back out. Includes a slow hand-held drift.",
      api: "<g transform={camAt(t, [{ t, x, y, s, d? }])}>…</g>",
      seconds: 4,
      origin: "video 001, Beat 2",
      Demo: () => {
        const { t } = useTime();
        return (
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            <g transform={camAt(t, [{ t: 0, x: 960, y: 540, s: 1 }, { t: 0.6, x: 290, y: 540, s: 2.2, d: 1 }, { t: 2.0, x: 950, y: 540, s: 2.2, d: 0.9 }, { t: 3.1, x: 960, y: 540, s: 1, d: 0.8 }])}>
              <foreignObject x={0} y={0} width={W} height={H}><Blocks /></foreignObject>
            </g>
          </svg>
        );
      },
    },
    {
      id: "blur-out-up",
      kind: "transition",
      title: "Blur-fade out, drifting up",
      useFor: "Clearing a scene so the next one lands on a clean page; the creator's sketch asked for 'go up / blur'.",
      api: "<AbsoluteFill style={blurOut(e, { blur, dx, dy })}>",
      seconds: 2,
      origin: "video 001, Beat 1",
      Demo: () => {
        const { t } = useTime();
        return (
          <AbsoluteFill style={blurOut(ramp(t, 0.6, 0.8, INOUT), { blur: 18, dy: -300 })}>
            <Blocks />
          </AbsoluteFill>
        );
      },
    },
    {
      id: "blur-in",
      kind: "transition",
      title: "Blur-fade in",
      useFor: "A scene arriving out of focus and settling; pairs with blur-out for soft scene changes.",
      api: "<AbsoluteFill style={blurIn(e, { blur, dy })}>",
      seconds: 1.6,
      Demo: () => {
        const { t } = useTime();
        return (
          <AbsoluteFill style={blurIn(ramp(t, 0.2, 0.8, INOUT), { blur: 14, dy: 40 })}>
            <Blocks />
          </AbsoluteFill>
        );
      },
    },
  ],
};

export default core;
