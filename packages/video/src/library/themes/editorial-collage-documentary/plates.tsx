// Photo treatments (duotone, newsprint halftone, red plate) as SVG filters over a real `src` image or a drawn stand-in subject, so any frame takes footage later.
import { useId, type FC, type ReactNode } from "react";
import { INK, PAPER, PLATE, RED, SHEET } from "./theme";

export type Treatment = "news" | "plate" | "red" | "mono";
export type Subject = "portrait" | "laptop" | "skyline" | "chip" | "server" | "phone" | "crowd";

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);

// Shadow → highlight colours per treatment, plus how strongly the ink halftone prints over it.
const LOOK: Record<Treatment, { lo: string; hi: string; dots: number; cell: number }> = {
  news: { lo: "#8d877a", hi: SHEET, dots: 1, cell: 8 },
  plate: { lo: "#1f2a38", hi: "#d9d6cc", dots: 0.42, cell: 7 },
  red: { lo: "#7d1410", hi: "#f6b6a8", dots: 0.38, cell: 7 },
  mono: { lo: "#262421", hi: "#ebe5d8", dots: 0.18, cell: 6 },
};

// One cell of the halftone screen: black in the middle, white at the corners. Added to the image's luminance and
// thresholded, it turns dark areas into big dots and light areas into small ones (a real AM screen, not a pattern fill).
const dotTile = (c: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${c}' height='${c}'><defs><radialGradient id='g' r='0.72'><stop offset='0' stop-color='#000'/><stop offset='1' stop-color='#fff'/></radialGradient></defs><rect width='${c}' height='${c}' fill='url(#g)'/></svg>`,
  )}`;

const LUM = "0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 0 1";

// The halftone pass: the filtered group is rotated 45° and its content counter-rotated, so the dot screen runs on the
// diagonal like real print while the picture stays upright.
const Halftone: FC<{ id: string; cell: number; children: ReactNode; opacity: number; w: number; h: number }> = ({ id, cell, children, opacity, w, h }) => {
  const [r, g, b] = hex(INK);
  return (
    <g opacity={opacity} style={{ mixBlendMode: "multiply" }}>
      <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB" primitiveUnits="userSpaceOnUse">
        <feColorMatrix in="SourceGraphic" type="matrix" values={LUM} result="lum" />
        <feImage href={dotTile(cell)} x="0" y="0" width={cell} height={cell} preserveAspectRatio="none" result="cell" />
        <feTile in="cell" result="screen" />
        <feComposite in="lum" in2="screen" operator="arithmetic" k1="0" k2="1.08" k3="1" k4="-0.52" result="sum" />
        <feComponentTransfer in="sum" result="bw">
          <feFuncR type="discrete" tableValues="0 1" />
          <feFuncG type="discrete" tableValues="0 1" />
          <feFuncB type="discrete" tableValues="0 1" />
        </feComponentTransfer>
        <feColorMatrix in="bw" type="matrix" values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  -1 0 0 0 1`} />
      </filter>
      <g transform={`rotate(45 ${w / 2} ${h / 2})`} filter={`url(#${id})`}>
        <g transform={`rotate(-45 ${w / 2} ${h / 2})`}>{children}</g>
      </g>
    </g>
  );
};

const Duotone: FC<{ id: string; lo: string; hi: string; children: ReactNode }> = ({ id, lo, hi, children }) => {
  const a = hex(lo);
  const b = hex(hi);
  // Three-point tables lift the mids a little so stand-ins and real photos both keep detail in the plate colour.
  const tv = (i: number) => `${a[i]} ${(a[i]! * 0.4 + b[i]! * 0.6).toFixed(3)} ${b[i]}`;
  return (
    <>
      <filter id={id} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={LUM} />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={tv(0)} />
          <feFuncG type="table" tableValues={tv(1)} />
          <feFuncB type="table" tableValues={tv(2)} />
        </feComponentTransfer>
      </filter>
      <g filter={`url(#${id})`}>{children}</g>
    </>
  );
};

export type PhotoProps = { w: number; h: number; src?: string; subject?: Subject; treatment?: Treatment; zoom?: number; focus?: [number, number] };

// A treated photo filling 0,0 → w,h. With `src` it prints that image; without, it prints the drawn stand-in `subject`.
// `zoom` (1 = fit) and `focus` (0..1 of the frame) drive Ken Burns pushes from outside.
export const Photo: FC<PhotoProps> = ({ w, h, src, subject = "skyline", treatment = "plate", zoom = 1, focus = [0.5, 0.5] }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const look = LOOK[treatment];
  const fx = focus[0] * w;
  const fy = focus[1] * h;
  const body = (
    <g transform={`translate(${fx} ${fy}) scale(${zoom}) translate(${-fx} ${-fy})`}>
      <rect width={w} height={h} fill="#fff" />
      {src ? (
        <image href={src} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <svg viewBox="0 0 800 600" width={w} height={h} preserveAspectRatio="xMidYMid slice">
          <StandIn subject={subject} />
        </svg>
      )}
    </g>
  );
  return (
    <g clipPath={`url(#cl${uid})`}>
      <clipPath id={`cl${uid}`}>
        <rect width={w} height={h} />
      </clipPath>
      <rect width={w} height={h} fill={look.hi} />
      <Duotone id={`du${uid}`} lo={look.lo} hi={look.hi}>{body}</Duotone>
      {look.dots > 0 && <Halftone id={`ht${uid}`} cell={look.cell} opacity={look.dots} w={w} h={h}>{body}</Halftone>}
    </g>
  );
};

// ---------- drawn stand-ins (greys only: the treatment decides the colour) ----------
const G: FC<{ id: string; stops: [number, string][]; x2?: number; y2?: number; radial?: boolean; cx?: number; cy?: number; r?: number }> = ({ id, stops, x2 = 0, y2 = 1, radial, cx = 0.5, cy = 0.5, r = 0.6 }) =>
  radial ? (
    <radialGradient id={id} cx={cx} cy={cy} r={r}>
      {stops.map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}
    </radialGradient>
  ) : (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map(([o, c], i) => <stop key={i} offset={o} stopColor={c} />)}
    </linearGradient>
  );

const Portrait: FC<{ k: string }> = ({ k }) => (
  <>
    <defs>
      <G id={`${k}bg`} radial cx={0.22} cy={0.28} r={0.95} stops={[[0, "#f6f6f6"], [0.5, "#b4b4b4"], [1, "#505050"]]} />
      <G id={`${k}sk`} radial cx={0.34} cy={0.4} r={0.78} stops={[[0, "#f0f0f0"], [0.55, "#a2a2a2"], [1, "#3a3a3a"]]} />
      <G id={`${k}co`} x2={1} y2={0.4} stops={[[0, "#6a6a6a"], [0.45, "#2c2c2c"], [1, "#111"]]} />
      <G id={`${k}hair`} x2={1} y2={1} stops={[[0, "#3a3a3a"], [1, "#0e0e0e"]]} />
    </defs>
    <rect width={800} height={600} fill={`url(#${k}bg)`} />
    <path d="M140 600 C160 468 255 418 330 404 L470 404 C565 418 645 468 665 600 Z" fill={`url(#${k}co)`} />
    <path d="M338 404 L400 492 L462 404 Z" fill="#dcdcdc" />
    <path d="M362 325 L362 412 Q400 446 438 412 L438 325 Z" fill="#7a7a7a" />
    <path d="M362 360 Q400 392 438 360 L438 330 L362 330 Z" fill="#555" opacity={0.6} />
    <ellipse cx={304} cy={258} rx={15} ry={27} fill="#a8a8a8" />
    <ellipse cx={496} cy={258} rx={13} ry={25} fill="#5e5e5e" />
    <path d="M308 236 C306 156 352 120 402 120 C456 120 498 156 494 240 L492 300 C486 352 448 378 400 378 C352 378 314 352 308 300 Z" fill={`url(#${k}sk)`} />
    <ellipse cx={366} cy={250} rx={22} ry={9} fill="#3d3d3d" opacity={0.75} />
    <ellipse cx={440} cy={250} rx={21} ry={9} fill="#2d2d2d" opacity={0.8} />
    <path d="M338 232 Q366 220 392 230 M414 230 Q442 220 466 232" stroke="#262626" strokeWidth={8} fill="none" strokeLinecap="round" />
    <path d="M404 256 L414 304 Q404 312 390 306" stroke="#4a4a4a" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.7} />
    <path d="M372 336 Q402 346 432 334" stroke="#3a3a3a" strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.8} />
    <path d="M300 250 C286 150 340 96 408 98 C478 100 520 150 502 248 C496 206 482 184 470 176 C440 196 382 196 344 176 C324 192 310 214 300 250 Z" fill={`url(#${k}hair)`} />
  </>
);

const Laptop: FC<{ k: string }> = ({ k }) => (
  <>
    <defs>
      <G id={`${k}wall`} stops={[[0, "#555"], [1, "#8a8a8a"]]} />
      <G id={`${k}desk`} stops={[[0, "#c9c9c9"], [1, "#707070"]]} />
      <G id={`${k}scr`} radial cx={0.35} cy={0.35} r={0.9} stops={[[0, "#ffffff"], [0.5, "#c8c8c8"], [1, "#7a7a7a"]]} />
      <G id={`${k}base`} x2={1} y2={0} stops={[[0, "#9a9a9a"], [0.5, "#e2e2e2"], [1, "#8e8e8e"]]} />
    </defs>
    <rect width={800} height={600} fill={`url(#${k}wall)`} />
    <rect y={400} width={800} height={200} fill={`url(#${k}desk)`} />
    <ellipse cx={400} cy={498} rx={310} ry={26} fill="#3a3a3a" opacity={0.6} />
    <path d="M232 128 L568 128 Q584 128 584 144 L584 420 L216 420 L216 144 Q216 128 232 128 Z" fill="#202020" />
    <rect x={234} y={146} width={332} height={256} fill={`url(#${k}scr)`} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <rect key={i} x={262 + (i % 3) * 24} y={176 + i * 30} width={[180, 120, 210, 90, 160, 140, 70][i]} height={12} rx={6} fill="#4a4a4a" opacity={0.75} />
    ))}
    <path d="M190 420 L610 420 L660 486 L140 486 Z" fill={`url(#${k}base)`} />
    <path d="M340 470 L460 470 L466 482 L334 482 Z" fill="#7a7a7a" />
    <rect x={648} y={380} width={70} height={96} rx={10} fill="#e6e6e6" />
    <path d="M718 400 Q752 404 750 430 Q748 456 718 458" fill="none" stroke="#e6e6e6" strokeWidth={10} />
    <ellipse cx={683} cy={384} rx={35} ry={8} fill="#3b3b3b" />
  </>
);

const Skyline: FC<{ k: string }> = ({ k }) => {
  const far = [[0, 330, 120], [110, 290, 90], [190, 350, 140], [320, 270, 70], [380, 320, 120], [490, 300, 100], [580, 340, 130], [700, 300, 100]];
  const near = [[20, 300, 96], [140, 220, 74], [232, 340, 116], [362, 130, 86], [470, 250, 104], [592, 200, 74], [680, 310, 120]];
  return (
    <>
      <defs>
        <G id={`${k}sky`} stops={[[0, "#6e6e6e"], [0.55, "#dcdcdc"], [1, "#ffffff"]]} />
        <G id={`${k}tw`} x2={1} y2={0} stops={[[0, "#1d1d1d"], [0.35, "#4e4e4e"], [0.36, "#2a2a2a"], [1, "#151515"]]} />
        <G id={`${k}sun`} radial stops={[[0, "#ffffff"], [0.5, "#f2f2f2"], [1, "rgba(255,255,255,0)"]]} />
      </defs>
      <rect width={800} height={600} fill={`url(#${k}sky)`} />
      <circle cx={560} cy={210} r={150} fill={`url(#${k}sun)`} />
      <circle cx={560} cy={210} r={54} fill="#fff" />
      {far.map(([x, top, w], i) => <rect key={`f${i}`} x={x} y={top} width={w} height={600 - top!} fill="#9a9a9a" />)}
      {near.map(([x, top, w], i) => (
        <g key={i}>
          <rect x={x} y={top} width={w} height={600 - top!} fill={`url(#${k}tw)`} />
          {i % 2 === 0 && <rect x={x! + w! * 0.2} y={top! - 24} width={w! * 0.6} height={26} fill="#262626" />}
          {Array.from({ length: Math.floor((560 - top!) / 26) }, (_, r) => (
            <rect key={r} x={x! + 6} y={top! + 14 + r * 26} width={w! - 12} height={7} fill="#d8d8d8" opacity={(r + i) % 4 === 0 ? 0.75 : 0.22} />
          ))}
        </g>
      ))}
      <rect x={403} y={40} width={4} height={92} fill="#1d1d1d" />
      <rect y={556} width={800} height={44} fill="#121212" />
    </>
  );
};

const Chip: FC<{ k: string }> = ({ k }) => (
  <>
    <defs>
      <G id={`${k}pcb`} radial cx={0.5} cy={0.45} r={0.8} stops={[[0, "#6a6a6a"], [1, "#1a1a1a"]]} />
      <G id={`${k}body`} x2={1} y2={1} stops={[[0, "#9c9c9c"], [0.45, "#3a3a3a"], [1, "#181818"]]} />
      <G id={`${k}die`} x2={1} y2={1} stops={[[0, "#ffffff"], [0.5, "#b8b8b8"], [1, "#6a6a6a"]]} />
    </defs>
    <rect width={800} height={600} fill={`url(#${k}pcb)`} />
    {Array.from({ length: 14 }, (_, i) => (
      <path key={i} d={`M0 ${40 + i * 40} L${120 + (i % 4) * 30} ${40 + i * 40} L${180 + (i % 4) * 30} ${80 + i * 34}`} stroke="#9a9a9a" strokeWidth={4} fill="none" opacity={0.5} />
    ))}
    {Array.from({ length: 14 }, (_, i) => (
      <path key={`r${i}`} d={`M800 ${30 + i * 42} L${690 - (i % 3) * 30} ${30 + i * 42} L${630 - (i % 3) * 30} ${70 + i * 36}`} stroke="#9a9a9a" strokeWidth={4} fill="none" opacity={0.5} />
    ))}
    {Array.from({ length: 12 }, (_, i) => (
      <g key={`p${i}`} fill="#d0d0d0">
        <rect x={238 + i * 28} y={128} width={12} height={30} />
        <rect x={238 + i * 28} y={442} width={12} height={30} />
        <rect x={208} y={158 + i * 24} width={30} height={10} />
        <rect x={562} y={158 + i * 24} width={30} height={10} />
      </g>
    ))}
    <rect x={232} y={152} width={336} height={296} rx={14} fill={`url(#${k}body)`} />
    <rect x={318} y={228} width={164} height={144} rx={6} fill={`url(#${k}die)`} />
    <circle cx={258} cy={178} r={9} fill="#cfcfcf" />
  </>
);

const Server: FC<{ k: string }> = ({ k }) => (
  <>
    <defs>
      <G id={`${k}glow`} radial cx={0.5} cy={0.42} r={0.5} stops={[[0, "#ffffff"], [0.3, "#bdbdbd"], [1, "#222"]]} />
    </defs>
    <rect width={800} height={600} fill={`url(#${k}glow)`} />
    {[-1, 1].map((side) =>
      Array.from({ length: 6 }, (_, i) => {
        const near = 1 - i / 6;
        const x0 = 400 + side * (60 + 340 * near);
        const x1 = 400 + side * (60 + 340 * (1 - (i + 1) / 6));
        const y0 = 250 - 230 * near;
        const y1 = 250 - 230 * (1 - (i + 1) / 6);
        const b0 = 260 + 330 * near;
        const b1 = 260 + 330 * (1 - (i + 1) / 6);
        const tone = Math.round(20 + 18 * i);
        return (
          <g key={`${side}${i}`}>
            <path d={`M${x0} ${y0} L${x1} ${y1} L${x1} ${b1} L${x0} ${b0} Z`} fill={`rgb(${tone},${tone},${tone})`} stroke="#000" strokeWidth={2} />
            {Array.from({ length: 5 }, (_, r) => {
              const v = 0.18 + r * 0.16;
              const ya = y0 + (b0 - y0) * v;
              const yb = y1 + (b1 - y1) * v;
              return <path key={r} d={`M${x0 + (x1 - x0) * 0.2} ${ya + (yb - ya) * 0.2} L${x0 + (x1 - x0) * 0.3} ${ya + (yb - ya) * 0.3}`} stroke="#f0f0f0" strokeWidth={Math.max(2, 6 * near)} strokeLinecap="round" opacity={(r + i) % 3 ? 0.9 : 0.35} />;
            })}
          </g>
        );
      }),
    )}
    <path d="M0 600 L340 262 L460 262 L800 600 Z" fill="#5a5a5a" opacity={0.55} />
    {[0.2, 0.42, 0.66].map((v, i) => (
      <line key={i} x1={400 - 60 - 340 * v} y1={262 + 338 * v} x2={400 + 60 + 340 * v} y2={262 + 338 * v} stroke="#2a2a2a" strokeWidth={3} />
    ))}
  </>
);

const Phone: FC<{ k: string }> = ({ k }) => (
  <>
    <defs>
      <G id={`${k}tbl`} radial cx={0.3} cy={0.2} r={1} stops={[[0, "#d8d8d8"], [1, "#4a4a4a"]]} />
      <G id={`${k}scr`} x2={0.6} y2={1} stops={[[0, "#ffffff"], [0.6, "#a8a8a8"], [1, "#5d5d5d"]]} />
    </defs>
    <rect width={800} height={600} fill={`url(#${k}tbl)`} />
    <g transform="rotate(-14 400 300)">
      <rect x={300} y={70} width={230} height={470} rx={34} fill="#2a2a2a" opacity={0.55} transform="translate(26 22)" />
      <rect x={300} y={70} width={230} height={470} rx={34} fill="#141414" />
      <rect x={314} y={96} width={202} height={418} rx={20} fill={`url(#${k}scr)`} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={334 + (i % 3) * 62} y={190 + Math.floor(i / 3) * 70} width={42} height={42} rx={11} fill="#3d3d3d" opacity={0.25 + ((i * 5) % 4) * 0.18} />
      ))}
      <rect x={340} y={130} width={120} height={22} rx={6} fill="#4a4a4a" opacity={0.6} />
      <rect x={385} y={82} width={60} height={8} rx={4} fill="#3a3a3a" />
    </g>
  </>
);

const Crowd: FC<{ k: string }> = ({ k }) => {
  const r = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
  const rows = [
    { y: 330, s: 0.55, tone: 120, n: 10 },
    { y: 420, s: 0.8, tone: 70, n: 7 },
    { y: 540, s: 1.15, tone: 25, n: 5 },
  ];
  return (
    <>
      <defs>
        <G id={`${k}bg`} radial cx={0.5} cy={0.15} r={0.9} stops={[[0, "#ffffff"], [0.5, "#d0d0d0"], [1, "#707070"]]} />
      </defs>
      <rect width={800} height={600} fill={`url(#${k}bg)`} />
      {rows.map((row, ri) =>
        Array.from({ length: row.n }, (_, i) => {
          const x = (i + 0.5 + (r(ri * 20 + i) - 0.5) * 0.5) * (800 / row.n);
          const c = `rgb(${row.tone},${row.tone},${row.tone})`;
          const s = row.s * (0.9 + r(ri * 7 + i) * 0.2);
          return (
            <g key={`${ri}-${i}`} transform={`translate(${x} ${row.y}) scale(${s})`}>
              <ellipse cx={0} cy={-120} rx={46} ry={56} fill={c} />
              <path d="M-110 120 C-100 0 -60 -50 0 -54 C60 -50 100 0 110 120 Z" fill={c} />
            </g>
          );
        }),
      )}
    </>
  );
};

export const StandIn: FC<{ subject: Subject }> = ({ subject }) => {
  const k = `si${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  switch (subject) {
    case "portrait": return <Portrait k={k} />;
    case "laptop": return <Laptop k={k} />;
    case "chip": return <Chip k={k} />;
    case "server": return <Server k={k} />;
    case "phone": return <Phone k={k} />;
    case "crowd": return <Crowd k={k} />;
    default: return <Skyline k={k} />;
  }
};

// Plain colour plates for full-frame cards and slips.
export const PLATES = { paper: PAPER, sheet: SHEET, ink: INK, red: RED, plate: PLATE };
