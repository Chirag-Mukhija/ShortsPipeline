// Moments only a riso print can do: the overprint test sheet, a three-drum halftone sunset whose dots breathe, and colour separations sliding together into one print.
import type { FC, ReactNode } from "react";
import { Easing } from "remotion";
import { INOUT, ramp, useTime } from "../../core/time";
import { BLUE, PINK, YELLOW } from "./theme";
import { Plate, Stage, roughRectD } from "./press";
import { Halftone, linearTone, radialTone } from "./halftone";
import { CropMarks, Slug } from "./marks";
import { Kicker } from "./pieces";

// ---------- overprint test sheet ----------
// Solid columns crossed by 60 % tint rows, one pair per drum: every ink and every mix on one sheet.
export const OverprintChart: FC<{ at: number; out?: number; title?: string }> = ({ at, out, title = "OVERPRINT TEST · SHEET 01" }) => {
  const inks = [PINK, BLUE, YELLOW];
  const cols = [500, 760, 1020], cw = 180, cy0 = 210, cy1 = 900;
  const rows = [300, 510, 720], rh = 130, rx0 = 370, rx1 = 1330;
  const colNames = ["FLUO PINK", "MED. BLUE", "YELLOW"];
  return (
    <Stage>
      <Kicker x={370} y={150} text={title} at={at} out={out} />
      {inks.map((ink, i) => (
        <Plate key={`c${i}`} ink={ink} at={at + 0.2 + i * 0.25} k={i} out={out}>
          <path d={roughRectD(cols[i]!, cy0, cw, cy1 - cy0, 70 + i, 2)} />
        </Plate>
      ))}
      {inks.map((ink, i) => (
        <Plate key={`r${i}`} ink={ink} at={at + 1.0 + i * 0.25} k={i} reg={4} out={out}>
          <Halftone x={rx0} y={rows[i]!} w={rx1 - rx0} h={rh} cell={14} ink={ink} tone={() => 0.6} breathe={false} />
        </Plate>
      ))}
      {colNames.map((n, i) => (
        <Slug key={n} x={cols[i]! + cw / 2} y={955} text={n} size={28} anchor="middle" at={at + 0.4 + i * 0.25} out={out} />
      ))}
      {["PINK 60%", "BLUE 60%", "YELLOW 60%"].map((n, i) => (
        <Slug key={n} x={rx1 + 36} y={rows[i]! + rh / 2 + 10} text={n} size={28} at={at + 1.2 + i * 0.25} out={out} />
      ))}
    </Stage>
  );
};

// ---------- halftone sunset ----------
// A three-drum print for music-only holds and chapter art: yellow sun and glow, pink sky screen, blue sea screen.
export const HalftoneSunset: FC<{ at: number; out?: number; caption?: string }> = ({ at, out, caption = "NO. 03 — SUNSET IN THREE DRUMS" }) => {
  const { t } = useTime();
  const X = 200, Y = 110, Wd = 1520, Hd = 760, HY = 600;
  const g = (s: number) => ramp(t, s, 0.6, Easing.out(Easing.cubic));
  const sky = `M${X} ${Y} H${X + Wd} V${HY} H${X} Z`;
  const sea = `M${X} ${HY} H${X + Wd} V${Y + Hd} H${X} Z`;
  // The pink screen skips the sun, so the sun prints as clean yellow.
  const skyNoSun = `${sky} M${960 + 205} 580 A205 205 0 1 0 ${960 - 205} 580 A205 205 0 1 0 ${960 + 205} 580 Z`;
  return (
    <Stage>
      <Plate ink={YELLOW} at={at} out={out}>
        <Halftone x={X} y={Y} w={Wd} h={HY - Y} cell={22} ink={YELLOW} tone={radialTone(960, 560, 560, 0.9, 0)} grow={g(at)} clip={sky} />
        <circle cx={960} cy={580} r={190 * g(at)} clipPath="url(#riso-sun-clip)" />
        <clipPath id="riso-sun-clip">
          <rect x={X} y={Y} width={Wd} height={HY - Y - 4} />
        </clipPath>
        {[0, 1, 2, 3, 4].map((i) => {
          const w = (360 - i * 62) * g(at + 0.2 + i * 0.05);
          return <rect key={i} x={960 - w / 2} y={HY + 26 + i * 46} width={w} height={16} rx={8} />;
        })}
      </Plate>
      <Plate ink={PINK} at={at + 0.3} k={1} out={out}>
        <Halftone x={X} y={Y} w={Wd} h={HY - Y} cell={20} ink={PINK} tone={linearTone(0, Y, 0, HY, 0.95, 0.12)} grow={g(at + 0.3)} clip={skyNoSun} />
      </Plate>
      <Plate ink={BLUE} at={at + 0.6} k={2} out={out}>
        <Halftone x={X} y={HY} w={Wd} h={Y + Hd - HY} cell={18} ink={BLUE} tone={linearTone(0, HY, 0, Y + Hd, 0.3, 1)} grow={g(at + 0.6)} clip={sea} />
        <path d={`M${X} ${HY} L${X} ${HY - 70} C${X + 160} ${HY - 150} ${X + 300} ${HY - 40} ${X + 420} ${HY - 90} C${X + 520} ${HY - 130} ${X + 600} ${HY - 30} ${X + 680} ${HY} Z`} opacity={g(at + 0.6)} />
        <path d={`M${X + Wd} ${HY} L${X + Wd} ${HY - 110} C${X + Wd - 140} ${HY - 170} ${X + Wd - 260} ${HY - 60} ${X + Wd - 380} ${HY - 80} C${X + Wd - 470} ${HY - 95} ${X + Wd - 540} ${HY - 20} ${X + Wd - 600} ${HY} Z`} opacity={g(at + 0.6)} />
      </Plate>
      <CropMarks x={X} y={Y} w={Wd} h={Hd} at={at + 0.9} />
      <Slug x={X} y={Y + Hd + 96} text={caption} size={30} at={at + 1.1} out={out} />
    </Stage>
  );
};

// ---------- colour separations ----------
export type SepPlate = { ink: string; name: string; art: ReactNode };

// Each plate shown alone in its ink, then all of them slide together and land in (near) register as one print.
export const Separations: FC<{ plates: SepPlate[]; at: number; join: number; caption?: string; out?: number }> = ({ plates, at, join, caption, out }) => {
  const { t } = useTime();
  const slide = ramp(t, join, 0.7, INOUT);
  const n = plates.length;
  return (
    <Stage>
      {plates.map((p, i) => {
        const fx = 960 + (i - (n - 1) / 2) * 560, fy = 450, fs = 0.56;
        const x = fx + (960 - fx) * slide, y = fy + (500 - fy) * slide, s = fs + (1.3 - fs) * slide;
        return (
          <g key={i}>
            <g transform={`translate(${x} ${y}) scale(${s})`}>
              <Plate ink={p.ink} at={at + i * 0.3} k={i} reg={4} kick={join + 0.7} out={out}>
                {p.art}
              </Plate>
            </g>
            <CropMarks x={fx - 190} y={fy - 190} w={380} h={380} at={at + i * 0.3} out={join} />
            <Slug x={fx} y={fy + 270} text={`PLATE ${i + 1} · ${p.name}`} size={30} anchor="middle" at={at + i * 0.3 + 0.15} out={join} />
          </g>
        );
      })}
      {caption && <Slug x={960} y={950} text={caption} size={34} anchor="middle" at={join + 0.9} out={out} />}
    </Stage>
  );
};

// The default subject: a laptop split into its three plates (yellow glow, pink body, blue code and shadow), local coords around 0,0.
export const laptopPlates = (): SepPlate[] => [
  {
    ink: YELLOW,
    name: "YELLOW",
    art: (
      <>
        <Halftone x={-300} y={-300} w={600} h={560} cell={22} ink={YELLOW} tone={radialTone(0, -40, 300, 1, 0.1)} breathe={false} clip="M0 -310 A290 290 0 1 1 -0.1 -310 Z" />
        <rect x={-200} y={-185} width={400} height={250} />
      </>
    ),
  },
  {
    ink: PINK,
    name: "PINK",
    art: (
      <>
        <path fillRule="evenodd" d="M-232 -217 H232 V93 H-232 Z M-200 -185 V65 H200 V-185 Z" />
        <path d="M-310 95 H310 L338 142 H-338 Z" />
      </>
    ),
  },
  {
    ink: BLUE,
    name: "BLUE",
    art: (
      <>
        {[
          [0, 170],
          [36, 230],
          [36, 130],
          [72, 200],
          [0, 90],
        ].map(([ix, w], i) => (
          <rect key={i} x={-165 + ix!} y={-150 + i * 40} width={w} height={18} rx={9} />
        ))}
        <rect x={-165 + 104} y={10} width={26} height={30} />
        <ellipse cx={0} cy={182} rx={330} ry={18} />
        <rect x={-60} y={108} width={120} height={10} rx={5} />
      </>
    ),
  },
];
