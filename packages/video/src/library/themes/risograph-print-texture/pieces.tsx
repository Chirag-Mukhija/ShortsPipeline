// Riso explainer pieces: zine cover, numbered zine list, two-pass big number, overprinted A-vs-B cards, pull quote and the taped source slug, each printing on its cue times.
import type { CSSProperties, FC, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { BLACK, BLUE, DISPLAY, MONO, PAPER, PINK, SHOUT, YELLOW } from "./theme";
import { Ink, Page, Plate, Stage, Svg, blobD, roughRectD, type PlateCue } from "./press";
import { DotPattern, Halftone, radialTone } from "./halftone";
import { ColorBars, Slug, StampLabel } from "./marks";
import { MisregisterText } from "./type";

// Courier Prime is metric-compatible with Courier: every glyph advances 0.6 em.
export const monoWidth = (text: string, size: number, spacing = 0) => text.length * (size * 0.6 + spacing);

// A Courier kicker sitting on a strip of pink ink, the zine's section header.
export const Kicker: FC<PlateCue & { x: number; y: number; text: string; size?: number; ink?: string }> = ({ x, y, text, size = 34, ink = PINK, ...cue }) => {
  const sp = size * 0.08;
  const w = monoWidth(text, size, sp);
  return (
    <>
      <Plate ink={ink} {...cue}>
        <path d={roughRectD(x - 14, y - size * 0.86, w + 28, size * 1.18, 41, 2)} />
      </Plate>
      <Slug x={x} y={y} text={text} size={size} {...cue} at={cue.at + 0.08} />
    </>
  );
};

// ---------- zine cover / title card ----------
export const ZineCover: FC<{ at: number; kicker: string; lines: string[]; sub?: string; stamp?: string; size?: number; out?: number }> = ({ at, kicker, lines, sub, stamp, size = 150, out }) => {
  const base = 480;
  const step = size * 1.06;
  return (
    <Stage>
      <Plate ink={YELLOW} at={at} out={out}>
        <path d={blobD(800, 520, 640, 300, 7, 0.1)} />
      </Plate>
      <Kicker x={180} y={230} text={kicker} at={at + 0.15} out={out} />
      {lines.map((l, i) => (
        <MisregisterText key={i} text={l} x={176} y={base + i * step} size={size} font={SHOUT} weight={400} anchor="start" inks={[PINK, BLUE]} at={at + 0.35 + i * 0.25} reg={9} dir={25} out={out} />
      ))}
      {sub && (
        <Plate ink={BLACK} tex="type" at={at + 0.4 + lines.length * 0.25} out={out}>
          <text x={182} y={base + (lines.length - 1) * step + 120} fontFamily={DISPLAY} fontWeight={500} fontSize={50}>{sub}</text>
        </Plate>
      )}
      {stamp && <StampLabel x={1580} y={290} text={stamp} ink={PINK} echo={BLUE} r={-10} size={58} at={at + 1.3} out={out} />}
      <ColorBars x={1236} y={850} at={at + 0.9} size={44} />
    </Stage>
  );
};

// ---------- numbered zine list ----------
export type ListItem = { label: string; note?: string; t: number };
export const ZineList: FC<{ title: string; items: ListItem[]; at: number; out?: number; art?: boolean }> = ({ title, items, at, out, art = true }) => {
  const y0 = 340, gap = 200;
  return (
    <Stage>
      {art && (
        <>
          <Plate ink={BLUE} at={at} out={out}>
            <Halftone x={1150} y={230} w={640} h={640} cell={20} ink={BLUE} tone={radialTone(1470, 550, 330, 1, 0.15)} clip={blobD(1470, 550, 320, 320, 12, 0.05)} />
          </Plate>
          <Plate ink={PINK} at={at} k={1} out={out}>
            <path d={blobD(1560, 450, 170, 170, 13, 0.08)} />
          </Plate>
        </>
      )}
      <Kicker x={190} y={190} text={title} at={at} out={out} />
      {items.map((it, i) => {
        const y = y0 + i * gap;
        return (
          <g key={i}>
            <Plate ink={YELLOW} at={it.t - 0.12} out={out}>
              <path d={blobD(250, y, 74, 74, 20 + i, 0.07)} />
            </Plate>
            <MisregisterText text={String(i + 1)} x={252} y={y + 38} size={104} font={SHOUT} weight={400} inks={[PINK, BLUE]} at={it.t - 0.08} reg={4} out={out} />
            <Plate ink={BLACK} tex="type" at={it.t} out={out}>
              <text x={372} y={y + (it.note ? 4 : 22)} fontFamily={DISPLAY} fontWeight={800} fontSize={66}>{it.label}</text>
              {it.note && <text x={375} y={y + 60} fontFamily={MONO} fontSize={36}>{it.note}</text>}
            </Plate>
            {i < items.length - 1 && (
              <Plate ink={BLACK} tex="none" at={it.t + 0.2} out={out} opacity={0.45}>
                <line x1={190} y1={y + 102} x2={1080} y2={y + 102} stroke={BLACK} strokeWidth={3} strokeDasharray="3 12" strokeLinecap="round" />
              </Plate>
            )}
          </g>
        );
      })}
    </Stage>
  );
};

// ---------- big number ----------
export const BigStat: FC<{ value: number; at: number; land: number; label: string; note?: string; prefix?: string; suffix?: string; decimals?: number; size?: number; out?: number }> = ({ value, at, land, label, note, prefix = "", suffix = "", decimals = 0, size = 290, out }) => {
  const { t } = useTime();
  const c = ramp(t, at, Math.max(0.2, land - at), Easing.out(Easing.cubic));
  const shown = `${prefix}${(value * c).toFixed(decimals)}${suffix}`;
  // Punch on the spoken number: 1 → 1.08 → 1 over 6 frames.
  const punch = 1 + 0.08 * Math.sin(Math.PI * clamp01((t - land) / 0.2));
  const cy = 560;
  const num = (
    <text x={960} y={cy + size * 0.36} textAnchor="middle" fontFamily={SHOUT} fontSize={size}>
      {shown}
    </text>
  );
  return (
    <Stage>
      <Plate ink={YELLOW} at={at - 0.15} out={out}>
        <Halftone x={500} y={150} w={920} h={820} cell={24} ink={YELLOW} tone={radialTone(960, cy, 440, 0.75, 0)} grow={ramp(t, at - 0.15, 0.5)} />
      </Plate>
      <g transform={`translate(960 ${cy}) scale(${punch}) translate(-960 ${-cy})`}>
        <defs>
          <pattern id="riso-stat-dots" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
            <circle cx={4.5} cy={4.5} r={3.7} fill={BLUE} />
          </pattern>
        </defs>
        <g transform="translate(18 16)">
          <Plate ink={BLUE} at={at} k={1} reg={2} kick={land} out={out} tex="none">
            <g fill="url(#riso-stat-dots)">{num}</g>
          </Plate>
        </g>
        <Plate ink={PINK} at={at} kick={land} out={out}>
          {num}
        </Plate>
      </g>
      <Plate ink={BLACK} tex="type" at={land + 0.25} out={out}>
        <text x={960} y={850} textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize={58}>{label}</text>
      </Plate>
      {note && <Slug x={960} y={912} text={note} anchor="middle" size={30} at={land + 0.4} out={out} />}
    </Stage>
  );
};

// ---------- A vs B ----------
export type Side = { tag: string; title: string; notes: string[] };
export const Versus: FC<{ left: Side; right: Side; at: { left: number; right: number; vs: number }; out?: number }> = ({ left, right, at, out }) => {
  const words = (s: Side, x: number, fill?: string) => (
    <g fill={fill}>
      <text x={x} y={330} fontFamily={MONO} fontWeight={700} fontSize={32} letterSpacing={3}>{s.tag}</text>
      <text x={x - 4} y={470} fontFamily={DISPLAY} fontWeight={800} fontSize={112}>{s.title}</text>
      {s.notes.map((n, i) => (
        <text key={i} x={x} y={580 + i * 58} fontFamily={MONO} fontWeight={700} fontSize={40}>{`▪ ${n}`}</text>
      ))}
    </g>
  );
  return (
    <Stage>
      <g transform="rotate(-2.5 575 520)">
        <Plate ink={PINK} at={at.left} out={out}>
          <path d={roughRectD(160, 240, 830, 570, 51, 4)} />
        </Plate>
        <Plate ink={BLACK} tex="type" at={at.left + 0.15} out={out}>
          {words(left, 230)}
        </Plate>
      </g>
      <g transform="rotate(2 1345 530)">
        {/* The right card is a knockout: its words are holes in the blue plate, so the paper shows through. */}
        <Plate ink={BLUE} at={at.right} out={out}>
          <defs>
            <mask id="riso-vs-knock" maskUnits="userSpaceOnUse" x={0} y={0} width={1920} height={1080}>
              <rect x={0} y={0} width={1920} height={1080} fill="#fff" />
              {words(right, 1000, "#000")}
            </mask>
          </defs>
          <path d={roughRectD(930, 250, 830, 570, 52, 4)} mask="url(#riso-vs-knock)" />
        </Plate>
      </g>
      <Plate ink={YELLOW} at={at.vs} out={out}>
        <path d={blobD(962, 520, 128, 128, 53, 0.06)} />
      </Plate>
      <MisregisterText text="VS" x={962} y={556} size={92} font={SHOUT} weight={400} inks={[BLACK]} at={at.vs + 0.1} kick={at.vs + 0.1} out={out} />
    </Stage>
  );
};

// ---------- pull quote ----------
// A "6"-shaped mark: a ball with a tail curling up and to the right, so the giant quote has the classic silhouette in any font.
const tailD = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} C${cx - r} ${cy - 1.5 * r} ${cx - 0.2 * r} ${cy - 2.3 * r} ${cx + 0.9 * r} ${cy - 2.5 * r} L${cx + 0.95 * r} ${cy - 2.05 * r} C${cx + 0.1 * r} ${cy - 1.85 * r} ${cx - 0.15 * r} ${cy - 1.3 * r} ${cx + 0.2 * r} ${cy - 0.8 * r} Z`;

// Giant opening quote marks: solid yellow, then a pink halftone pass printed well off-register on top.
export const QuoteMarks: FC<PlateCue & { x: number; y: number; r?: number }> = ({ x, y, r = 66, ...cue }) => {
  const shapes = (fill?: string) =>
    [0, 1].map((i) => {
      const cx = x + i * r * 2.7;
      return (
        <g key={i} fill={fill}>
          <circle cx={cx} cy={y} r={r} />
          <path d={tailD(cx, y, r)} />
        </g>
      );
    });
  return (
    <>
      <Plate ink={YELLOW} {...cue} k={0}>{shapes()}</Plate>
      <Plate ink={PINK} {...cue} k={1} reg={14} dir={30}>
        <defs>
          <DotPattern id="riso-quote-dots" color={PINK} tone={0.55} cell={15} angle={15} />
        </defs>
        {shapes("url(#riso-quote-dots)")}
      </Plate>
    </>
  );
};

const Line: FC<{ children: ReactNode; style?: CSSProperties; under?: ReactNode; inks: { ink: string; at: number; k?: number; out?: number }[] }> = ({ children, style, under, inks }) => (
  <div style={{ position: "relative", width: "fit-content", ...style }}>
    <span style={{ visibility: "hidden", whiteSpace: "pre" }}>{children}</span>
    {under}
    {inks.map((p, i) => (
      <Ink key={i} ink={p.ink} at={p.at} k={p.k} out={p.out} style={{ left: 0, top: 0, whiteSpace: "pre" }}>
        {children}
      </Ink>
    ))}
  </div>
);

export const PullQuote: FC<{ lines: string[]; hl?: number; hlAt?: number; who: string; role?: string; at: number; out?: number }> = ({ lines, hl, hlAt, who, role, at, out }) => {
  const { t } = useTime();
  const sweep = hlAt == null ? 0 : ramp(t, hlAt, 0.35, Easing.inOut(Easing.cubic));
  return (
    <Page>
      <Svg>
        <QuoteMarks x={196} y={430} r={60} at={at - 0.2} out={out} />
      </Svg>
      <div style={{ position: "absolute", left: 540, top: 300, width: 1200, fontFamily: DISPLAY, fontWeight: 800, fontSize: 68, lineHeight: 1.22 }}>
        {lines.map((l, i) => (
          <Line
            key={i}
            inks={[{ ink: BLACK, at: at + i * 0.2, out }]}
            under={
              i === hl && sweep > 0 ? (
                <Ink ink={PINK} tex="ink" at={hlAt!} out={out} style={{ left: -12, right: -12, top: "30%", bottom: "2%", background: "currentColor", clipPath: `inset(0 ${(1 - sweep) * 100}% 0 0)` }} />
              ) : null
            }
          >
            <span style={{ display: "inline-block" }}>{l}</span>
          </Line>
        ))}
        <div style={{ height: 40 }} />
        <Line style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, lineHeight: 1.3 }} inks={[{ ink: BLUE, at: at + lines.length * 0.2 + 0.2, out }]}>{`— ${who}`}</Line>
        {role && <Line style={{ fontFamily: MONO, fontWeight: 400, fontSize: 34, lineHeight: 1.3, paddingLeft: 48 }} inks={[{ ink: BLACK, at: at + lines.length * 0.2 + 0.3, out }]}>{role}</Line>}
      </div>
    </Page>
  );
};

// ---------- source slug / lower third ----------
// A strip of yellow ink rolled on left to right, then the words printed over it; a pink tab carries the tag.
export const SourceSlug: FC<{ tag?: string; title: string; detail?: string; at: number; out?: number; x?: number; bottom?: number }> = ({ tag = "SOURCE", title, detail, at, out, x = 120, bottom = 120 }) => {
  const { t } = useTime();
  const roll = ramp(t, at, 0.35, Easing.inOut(Easing.cubic));
  const pad: CSSProperties = { padding: "22px 34px 20px" };
  const body = (
    <div style={pad}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, lineHeight: 1.05, whiteSpace: "pre" }}>{title}</div>
      {detail && <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, marginTop: 10, whiteSpace: "pre" }}>{detail}</div>}
    </div>
  );
  const tabIn = interpolate(t, [at + 0.3, at + 0.3 + 5 / 30], [1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Page>
      <div style={{ position: "absolute", left: x, bottom }}>
        <div style={{ position: "relative" }}>
          <div style={{ visibility: "hidden" }}>{body}</div>
          {roll > 0 && <Ink ink={YELLOW} tex="ink" at={at} out={out} style={{ inset: 0, background: "currentColor", clipPath: `inset(0 ${(1 - roll) * 100}% 0 0)` }} />}
          <Ink ink={BLACK} at={at + 0.25} out={out} style={{ left: 0, top: 0 }}>{body}</Ink>
          <div style={{ position: "absolute", left: -10, top: -44, rotate: "-4deg", scale: `${tabIn}` }}>
            <div style={{ position: "relative", fontFamily: SHOUT, fontSize: 30, letterSpacing: 2 }}>
              <div style={{ visibility: "hidden", padding: "8px 16px" }}>{tag}</div>
              <Ink ink={PINK} tex="ink" at={at + 0.3} out={out} style={{ inset: 0, background: "currentColor" }} />
              <Ink ink={PAPER} tex="none" at={at + 0.3} out={out} style={{ left: 0, top: 0, padding: "8px 16px", mixBlendMode: "normal" }}>{tag}</Ink>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};
