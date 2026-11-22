// The hand-held device: a drawn flat-illustration hand (sleeve, palm, fingertips behind, thumb in front) gripping any gadget, rising in and rotating -6° → 0 while the device stays the hero.
import type { FC, ReactNode } from "react";
import { useTime } from "../../core/time";
import { GREY } from "./theme";
import { ease, EXPO_OUT, squash } from "./motion";
import { FloorShadow } from "./gadgets";

const SKIN = "#B97A5B";
const SKIN_LO = "#985C42";
const SKIN_HI = "#D49A7D";
const NAIL = "#EAC9B6";
const SLEEVE = GREY;
const SLEEVE_LO = "#5F6265";

const fat = (x1: number, y1: number, x2: number, y2: number, w: number, c: string) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeLinecap="round" />;

// Hand drawn around a 300 × 610 device centred on (0, 0); it comes in from the lower right.
const HandBack: FC = () => (
  <g>
    {fat(470, 700, 760, 1100, 300, SLEEVE)}
    {fat(260, 420, 470, 700, 200, SKIN_LO)}
    {fat(250, 410, 450, 680, 186, SKIN)}
    <path d="M 330 600 Q 470 520 560 640" stroke={SLEEVE_LO} strokeWidth={26} fill="none" strokeLinecap="round" />
    {fat(420, 650, 600, 900, 290, SLEEVE)}
    <rect x={430} y={560} width={46} height={46} rx={23} fill="#E6E6E2" transform="rotate(-34 453 583)" />
    <ellipse cx={110} cy={250} rx={190} ry={140} fill={SKIN} transform="rotate(-38 110 250)" />
    {/* four fingertips wrap the far edge, peeking out past the left side */}
    {[-10, 72, 150, 222].map((fy, i) => (
      <g key={i}>
        {fat(-188 + i * 4, fy, 40, fy + 30, 70 - i * 4, SKIN_LO)}
        {fat(-180 + i * 4, fy - 4, 40, fy + 26, 62 - i * 4, SKIN)}
        <path d={`M ${-176 + i * 4} ${fy - 22} q 14 -6 28 0`} stroke={SKIN_HI} strokeWidth={6} fill="none" strokeLinecap="round" />
      </g>
    ))}
  </g>
);

const HandFront: FC = () => (
  <g>
    <ellipse cx={205} cy={290} rx={92} ry={128} fill={SKIN} transform="rotate(-30 205 290)" />
    <path d="M 150 360 Q 200 300 250 210" stroke={SKIN_LO} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.6} />
    {fat(220, 230, 110, 70, 84, SKIN_LO)}
    {fat(214, 226, 104, 66, 76, SKIN)}
    <ellipse cx={110} cy={74} rx={26} ry={32} fill={NAIL} transform="rotate(-36 110 74)" />
    <path d="M 172 158 q 18 6 30 -4" stroke={SKIN_LO} strokeWidth={6} fill="none" strokeLinecap="round" />
    <path d="M 200 220 Q 230 170 196 128" stroke={SKIN_HI} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.7} />
  </g>
);

// `device` is any gadget drawn around (0, 0) at about 300 × 610. Enters at `at`: rises from below and rotates -6° → 0 with the squash spring.
export const HeldDevice: FC<{ x: number; y: number; at: number; device: ReactNode; angle?: number; scale?: number; shadow?: boolean }> = ({ x, y, at, device, angle = 16, scale = 1, shadow = true }) => {
  const { t } = useTime();
  const s = squash(t, at);
  const rise = ease(t, at, 0.7, EXPO_OUT);
  const rot = angle - 6 * (1 - s) + Math.sin(t * 1.3) * 0.6;
  return (
    <g transform={`translate(${x} ${y + (1 - rise) * 500}) scale(${scale})`}>
      {shadow && <FloorShadow x={60} y={430} rx={300} ry={40} o={0.12 * rise} />}
      <g transform={`rotate(${rot} 300 600)`}>
        <HandBack />
        {device}
        <HandFront />
      </g>
    </g>
  );
};
