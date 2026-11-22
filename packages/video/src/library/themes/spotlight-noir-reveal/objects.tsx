// Drawn stand-ins for spotlight noir: hanging lamps and a bare bulb, the hero router, top-down desk evidence, flow icons, a noir evidence print (or a real photo via src) and a fedora silhouette for cast shadows.
import { useId, type FC, type ReactNode } from "react";
import { interpolateColors } from "remotion";
import { ACCENT, ALARM, CONE, EDGE, LIT, METAL, MONO, NIGHT } from "./theme";

const useUid = () => `o${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

export const G: FC<{ x: number; y: number; s?: number; r?: number; o?: number; children: ReactNode }> = ({ x, y, s = 1, r = 0, o = 1, children }) =>
  o <= 0 ? null : (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={o}>
      {children}
    </g>
  );

// ---------- light fixtures ----------
// A conical shade on a cord from the top of the frame; x, y is the centre of its rim. on: 0..1 brightness, swing: degrees.
export const Lamp: FC<{ x: number; y: number; on: number; swing?: number; w?: number }> = ({ x, y, on, swing = 0, w = 190 }) => {
  const uid = useUid();
  const h = w * 0.46;
  const top = w * 0.3;
  return (
    <g transform={`rotate(${swing} ${x} -40)`}>
      <defs>
        <radialGradient id={`${uid}-bl`}>
          <stop offset={0} stopColor={CONE} stopOpacity={0.9} />
          <stop offset={0.35} stopColor={CONE} stopOpacity={0.35} />
          <stop offset={1} stopColor={CONE} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${uid}-sh`} x1={0} x2={1}>
          <stop offset={0} stopColor="#0E0F13" />
          <stop offset={0.42} stopColor="#2A2D34" />
          <stop offset={1} stopColor="#0B0C0F" />
        </linearGradient>
      </defs>
      <line x1={x} y1={-40} x2={x} y2={y - h} stroke={EDGE} strokeWidth={3} />
      <rect x={x - 12} y={y - h - 16} width={24} height={20} rx={4} fill={METAL} stroke={EDGE} strokeWidth={1.5} />
      <path d={`M ${x - top / 2} ${y - h} L ${x + top / 2} ${y - h} Q ${x + w * 0.36} ${y - h * 0.45} ${x + w / 2} ${y} L ${x - w / 2} ${y} Q ${x - w * 0.36} ${y - h * 0.45} ${x - top / 2} ${y - h} Z`} fill={`url(#${uid}-sh)`} stroke={EDGE} strokeWidth={1.5} />
      <ellipse cx={x} cy={y} rx={w / 2} ry={w * 0.07} fill={interpolateColors(on, [0, 1], [METAL, CONE])} stroke={EDGE} strokeWidth={1.5} />
      {on > 0 && <circle cx={x} cy={y + 6} r={w * 0.7} fill={`url(#${uid}-bl)`} opacity={on} style={{ mixBlendMode: "screen" }} />}
    </g>
  );
};

// A bare bulb on a cord; filament glows warm, and after the light is cut it can hold an ember (afterglow 0..1).
export const Bulb: FC<{ x: number; y: number; on: number; ember?: number; s?: number }> = ({ x, y, on, ember = 0, s = 1 }) => {
  const uid = useUid();
  const fil = Math.max(on, ember);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <radialGradient id={`${uid}-h`}>
          <stop offset={0} stopColor={CONE} stopOpacity={0.95} />
          <stop offset={0.25} stopColor={CONE} stopOpacity={0.4} />
          <stop offset={1} stopColor={CONE} stopOpacity={0} />
        </radialGradient>
      </defs>
      <line x1={0} y1={-y / s - 20} x2={0} y2={-58} stroke={EDGE} strokeWidth={3} />
      <rect x={-17} y={-62} width={34} height={30} rx={3} fill={METAL} stroke={EDGE} strokeWidth={1.5} />
      <path d="M -14 -32 C -14 -14, -46 -6, -46 30 A 46 46 0 0 0 46 30 C 46 -6, 14 -14, 14 -32 Z" fill={interpolateColors(on, [0, 1], ["#101116", "#FFF6DC"])} fillOpacity={0.35 + 0.65 * on} stroke={EDGE} strokeWidth={1.5} />
      <path d="M -10 -30 L -8 14 M 10 -30 L 8 14 M -8 14 l 4 -8 l 4 8 l 4 -8 l 4 8" fill="none" stroke={interpolateColors(fil, [0, 0.4, 1], [EDGE, "#B4471E", "#FFE8A8"])} strokeWidth={2.5} strokeLinejoin="round" opacity={0.4 + 0.6 * fil} />
      {fil > 0 && <circle cx={0} cy={10} r={on > 0 ? 260 : 40} fill={`url(#${uid}-h)`} opacity={on > 0 ? on : ember * 0.8} style={{ mixBlendMode: "screen" }} />}
    </g>
  );
};

// ---------- hero object ----------
// A home router seen from slightly above; cx, base is the bottom centre. led: 0..1 blink of the one red light.
export const Router: FC<{ cx: number; base: number; led?: number; w?: number }> = ({ cx, base, led = 1, w = 500 }) => {
  const uid = useUid();
  const h = w * 0.22;
  const d = w * 0.09;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-f`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#BDB8AB" />
          <stop offset={0.5} stopColor="#5E5D5D" />
          <stop offset={1} stopColor="#202125" />
        </linearGradient>
        <linearGradient id={`${uid}-a`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#F1ECDF" />
          <stop offset={1} stopColor="#55565A" />
        </linearGradient>
      </defs>
      {[-0.32, 0, 0.32].map((k, i) => (
        <rect key={i} x={cx + k * w - 8} y={base - h - d - w * 0.5} width={16} height={w * 0.52} rx={8} fill={`url(#${uid}-a)`} transform={`rotate(${k * 30} ${cx + k * w} ${base - h - d * 0.6})`} />
      ))}
      <polygon points={`${cx - w / 2},${base - h} ${cx + w / 2},${base - h} ${cx + w / 2 - d},${base - h - d} ${cx - w / 2 + d},${base - h - d}`} fill="#ECE7DA" />
      <rect x={cx - w / 2} y={base - h} width={w} height={h} rx={10} fill={`url(#${uid}-f)`} />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={cx - w * 0.42 + i * w * 0.035} y={base - h * 0.72} width={w * 0.016} height={h * 0.34} rx={3} fill="#2A2B30" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={cx + w * 0.12 + i * w * 0.065} cy={base - h * 0.55} r={w * 0.011} fill={ACCENT} opacity={0.85} />
      ))}
      <circle cx={cx + w * 0.12 + 4 * w * 0.065} cy={base - h * 0.55} r={w * 0.013} fill={ALARM} opacity={0.3 + 0.7 * led} />
      <circle cx={cx + w * 0.12 + 4 * w * 0.065} cy={base - h * 0.55} r={w * 0.04} fill={ALARM} opacity={0.35 * led} style={{ mixBlendMode: "screen" }} />
    </g>
  );
};

// ---------- desk evidence (top-down) ----------
export type DeskKind = "phone" | "keys" | "usb" | "note" | "receipt" | "pen" | "coin" | "mug";

export const DeskThing: FC<{ kind: DeskKind; x: number; y: number; r?: number; s?: number; note?: string[] }> = ({ kind, x, y, r = 0, s = 1, note = ["admin", "1234"] }) => {
  let body: ReactNode = null;
  if (kind === "phone")
    body = (
      <>
        <rect x={-78} y={-155} width={156} height={310} rx={24} fill="#3A3C43" />
        <rect x={-68} y={-140} width={136} height={280} rx={16} fill="#0D0E11" />
        <path d="M -68 -40 L 40 -140 L 68 -140 L -68 0 Z" fill={LIT} opacity={0.08} />
        <circle cx={0} cy={-128} r={5} fill="#2C2E34" />
      </>
    );
  if (kind === "keys")
    body = (
      <>
        <circle cx={0} cy={0} r={36} fill="none" stroke="#C9C2AE" strokeWidth={7} />
        {[-28, 34].map((a, i) => (
          <g key={i} transform={`rotate(${a}) translate(36 0)`}>
            <circle cx={22} cy={0} r={26} fill={i ? "#B8AF98" : "#D2CBB7"} />
            <circle cx={14} cy={0} r={8} fill={NIGHT} />
            <path d="M 44 -9 L 150 -9 L 150 2 L 140 2 L 136 9 L 128 2 L 118 9 L 110 2 L 100 9 L 44 9 Z" fill={i ? "#B8AF98" : "#D2CBB7"} />
          </g>
        ))}
      </>
    );
  if (kind === "usb")
    body = (
      <>
        <rect x={-90} y={-30} width={150} height={60} rx={12} fill="#2C2E35" />
        <rect x={60} y={-20} width={52} height={40} rx={3} fill="#CFCAC0" />
        <rect x={74} y={-9} width={10} height={8} fill="#55565A" />
        <rect x={92} y={-9} width={10} height={8} fill="#55565A" />
        <rect x={-70} y={-8} width={90} height={16} rx={3} fill={LIT} opacity={0.75} />
      </>
    );
  if (kind === "note")
    body = (
      <>
        <rect x={-120} y={-120} width={240} height={240} fill={ACCENT} />
        <rect x={-120} y={-120} width={240} height={34} fill="#000" opacity={0.08} />
        {note.map((line, i) => (
          <text key={i} x={-92} y={-20 + i * 62} fontFamily={MONO} fontWeight={600} fontSize={40} fill={NIGHT}>
            {line}
          </text>
        ))}
      </>
    );
  if (kind === "receipt")
    body = (
      <>
        <path d={`M -80 -190 L 80 -190 L 80 170 ${Array.from({ length: 8 }, (_, i) => `L ${80 - (i + 0.5) * 20} ${i % 2 ? 170 : 182} `).join("")} L -80 170 Z`} fill="#E3DED0" />
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={-60} y={-160 + i * 32} width={i % 3 === 2 ? 70 : 120} height={8} rx={4} fill="#8B867B" />
        ))}
      </>
    );
  if (kind === "pen")
    body = (
      <>
        <rect x={-170} y={-11} width={300} height={22} rx={11} fill="#25272D" />
        <path d="M 130 -11 L 175 0 L 130 11 Z" fill="#B9B3A4" />
        <rect x={-120} y={-15} width={60} height={8} rx={3} fill="#9C978C" />
      </>
    );
  if (kind === "coin")
    body = (
      <>
        <circle r={34} fill="#B49E74" />
        <circle r={25} fill="none" stroke="#8E7A55" strokeWidth={3} />
      </>
    );
  if (kind === "mug")
    body = (
      <>
        <rect x={62} y={-20} width={46} height={40} rx={18} fill="none" stroke="#3B3D44" strokeWidth={14} />
        <circle r={78} fill="#33353C" />
        <circle r={62} fill="#1B120C" />
        <ellipse cx={-18} cy={-22} rx={20} ry={8} fill={LIT} opacity={0.12} />
      </>
    );
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <g transform="translate(8 12)" opacity={0.55}>
        <g style={{ filter: "blur(6px) brightness(0)" }}>{body}</g>
      </g>
      {body}
    </g>
  );
};

// ---------- flow icons (line drawings, about 150 px) ----------
export type IconName = "phone" | "tower" | "server" | "eye";

export const Icon: FC<{ name: IconName; x: number; y: number; s?: number; color?: string }> = ({ name, x, y, s = 1, color = LIT }) => {
  const st = { fill: "none", stroke: color, strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: ReactNode = null;
  if (name === "phone")
    body = (
      <>
        <rect x={-42} y={-74} width={84} height={148} rx={16} {...st} fill={NIGHT} />
        <line x1={-12} y1={-58} x2={12} y2={-58} {...st} />
        <circle cx={0} cy={56} r={6} {...st} />
      </>
    );
  if (name === "tower")
    body = (
      <>
        <path d="M 0 -40 L -44 76 M 0 -40 L 44 76 M -29 36 L 29 36 M -15 0 L 15 0 M -29 36 L 15 0 M 29 36 L -15 0" {...st} />
        <circle cx={0} cy={-48} r={8} {...st} fill={color} />
        <path d="M -30 -74 A 40 40 0 0 0 -30 -22 M 30 -74 A 40 40 0 0 1 30 -22 M -52 -90 A 64 64 0 0 0 -52 -6 M 52 -90 A 64 64 0 0 1 52 -6" {...st} />
      </>
    );
  if (name === "server")
    body = (
      <>
        {[-52, 0, 52].map((dy) => (
          <g key={dy}>
            <rect x={-74} y={dy - 20} width={148} height={40} rx={8} {...st} fill={NIGHT} />
            <circle cx={-50} cy={dy} r={5} fill={color} />
            <line x1={-24} y1={dy} x2={50} y2={dy} {...st} strokeWidth={3} />
          </g>
        ))}
      </>
    );
  if (name === "eye")
    body = (
      <>
        <path d="M -82 0 Q 0 -74 82 0 Q 0 74 -82 0 Z" {...st} fill={NIGHT} />
        <circle r={28} {...st} />
        <circle r={11} fill={color} />
      </>
    );
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{body}</g>;
};

// ---------- evidence print ----------
// A noir photo of a dark room (laptop on a desk, webcam LED on, blinds behind), or the creator's own photo via src, in grey.
// Detail points as shares of the image, for leader lines.
export const PRINT_SPOTS = { webcam: [0.43, 0.38], screen: [0.43, 0.56], window: [0.8, 0.27], mug: [0.75, 0.66] } as const;

export const PrintImage: FC<{ w: number; h: number; src?: string; led?: number }> = ({ w, h, src, led = 1 }) => {
  const uid = useUid();
  if (src)
    return <image href={src} width={w} height={h} preserveAspectRatio="xMidYMid slice" style={{ filter: "grayscale(1) contrast(1.2) brightness(0.9)" }} />;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-bg`} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#3A3B40" />
          <stop offset={1} stopColor="#0F1013" />
        </linearGradient>
        <radialGradient id={`${uid}-sc`} cx={0.5} cy={0.45} r={0.7}>
          <stop offset={0} stopColor="#E4DFD2" />
          <stop offset={1} stopColor="#6C6960" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#${uid}-bg)`} />
      <rect x={w * 0.66} y={h * 0.06} width={w * 0.28} height={h * 0.44} fill="#A7A398" />
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x={w * 0.66} y={h * 0.06 + i * h * 0.04} width={w * 0.28} height={h * 0.022} fill="#26272B" />
      ))}
      <rect x={w * 0.795} y={h * 0.06} width={w * 0.012} height={h * 0.44} fill="#26272B" />
      <polygon points={`${w * 0.66},${h * 0.5} ${w * 0.94},${h * 0.5} ${w},${h * 0.66} ${w * 0.52},${h * 0.66}`} fill="#A7A398" opacity={0.12} />
      <rect y={h * 0.66} width={w} height={h * 0.34} fill="#1C1D21" />
      <rect y={h * 0.66} width={w} height={3} fill="#6A675F" />
      <rect x={w * 0.25} y={h * 0.33} width={w * 0.36} height={h * 0.34} rx={6} fill="#141518" />
      <rect x={w * 0.27} y={h * 0.37} width={w * 0.32} height={h * 0.28} fill={`url(#${uid}-sc)`} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={w * 0.3} y={h * (0.43 + i * 0.045)} width={w * (i % 2 ? 0.16 : 0.24)} height={h * 0.014} fill="#57544D" opacity={0.6} />
      ))}
      <polygon points={`${w * 0.22},${h * 0.67} ${w * 0.64},${h * 0.67} ${w * 0.69},${h * 0.74} ${w * 0.17},${h * 0.74}`} fill="#5F5C56" />
      <circle cx={w * PRINT_SPOTS.webcam[0]} cy={h * PRINT_SPOTS.webcam[1] - h * 0.02} r={4} fill={ALARM} opacity={0.4 + 0.6 * led} />
      <circle cx={w * PRINT_SPOTS.webcam[0]} cy={h * PRINT_SPOTS.webcam[1] - h * 0.02} r={16} fill={ALARM} opacity={0.35 * led} />
      <rect x={w * 0.71} y={h * 0.55} width={w * 0.08} height={h * 0.12} rx={4} fill="#2C2D31" />
      <path d={`M ${w * 0.79} ${h * 0.58} q ${w * 0.035} ${h * 0.03} 0 ${h * 0.065}`} fill="none" stroke="#2C2D31" strokeWidth={6} />
    </g>
  );
};

// ---------- silhouette ----------
// A man in a fedora and coat, facing left, in a 400 x 800 box; drawn as a shadow on a lit wall.
export const Fedora: FC<{ x: number; y: number; s?: number; color?: string; opacity?: number }> = ({ x, y, s = 1, color = NIGHT, opacity = 0.92 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={color} opacity={opacity} style={{ filter: "blur(2.5px)" }}>
    <ellipse cx={192} cy={172} rx={168} ry={19} transform="rotate(-3 192 172)" />
    <path d="M 98 170 C 96 120, 104 78, 128 66 C 160 52, 236 50, 262 62 C 284 74, 292 120, 288 166 Z" />
    <path d="M 128 186 C 126 230, 120 246, 104 270 C 98 280, 108 286, 118 288 C 116 300, 122 318, 140 322 C 150 336, 160 346, 170 350 L 168 380 L 262 380 L 262 186 Z" />
    <path d="M -10 800 L 10 470 C 24 410, 96 386, 160 374 L 280 374 C 340 386, 384 420, 396 490 L 410 800 Z" />
    <path d="M 160 374 L 214 470 L 250 374 Z" opacity={0.6} />
  </g>
);
