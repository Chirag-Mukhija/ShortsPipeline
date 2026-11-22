// Paper evidence: a newspaper clipping the camera zooms into, a typed memo that gets redacted, and the red-string evidence board.
import type { CSSProperties, FC } from "react";
import { Easing } from "remotion";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { COND, INK, MUTED, RED, SERIF, SHEET, TYPE, YELLOW, hardShadow } from "./theme";
import { noise1, q12, smoothD, stepIn, tornClip, type P } from "./rough";
import { Cutout, FullStage, Pin, Slip, TypeLine } from "./paper";
import { Hi } from "./marks";
import { Photo, type Subject, type Treatment } from "./plates";
import { RubberStamp } from "./pieces";

// ---------- newspaper clipping ----------
const PW = 1200;
const PH = 1400;
const COL2: [number, number] = [620, 500];

export type NewsClipProps = {
  at: number;
  zoomAt: number;
  hiAt: number;
  masthead?: string;
  dateline?: string;
  headline?: string;
  dek?: string;
  // The highlighted sentence opens column two; the camera lands on it.
  quote?: string;
  col1?: string[];
  col2?: string[];
  photo?: Subject;
  // A real screenshot instead of the drawn page: `focus` is the point (page px, page is 1200×1400) and scale to zoom to,
  // `hiBox` the sentence's box to highlight.
  src?: string;
  focus?: { x: number; y: number; s: number };
  hiBox?: { x: number; y: number; w: number; h: number };
};

// A newspaper page tilted on the desk; the camera pushes in to one sentence and the highlighter wipes across it.
export const NewsClip: FC<NewsClipProps> = ({
  at, zoomAt, hiAt, masthead = "The Morning Ledger", dateline = "VOL. CXII · No. 41 · TUESDAY", headline = "", dek, quote = "", col1 = [], col2 = [], photo = "phone", src, focus, hiBox,
}) => {
  const { t } = useTime();
  const e = stepIn(t, at, 0.36);
  if (e <= 0) return null;
  const z = ramp(t, zoomAt, 1.1, INOUT);
  const target = focus ?? { x: COL2[0] + 250, y: COL2[1] + 95, s: 1.62 };
  const s = 0.72 + (target.s - 0.72) * z;
  const fx = PW / 2 + (target.x - PW / 2) * z;
  const fy = 640 + (target.y - 640) * z;
  const body: CSSProperties = { fontFamily: SERIF, fontWeight: 400, fontSize: 28, lineHeight: 1.45, color: "#2a2723", textAlign: "justify", hyphens: "auto", margin: "0 0 18px" };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: PW, height: PH, transformOrigin: "0 0", transform: `translate(${960 - fx * s}px, ${540 - fy * s + (1 - e) * -200}px) scale(${s}) rotate(${-1.6 * (1 - z * 0.6)}deg)`, filter: hardShadow(1 / s) }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(100deg, rgba(0,0,0,0.05), transparent 30%, transparent 75%, rgba(0,0,0,0.08)), #f3eee2`, clipPath: tornClip(611, { left: 3, right: 10, top: 3, bottom: 12 }, { w: PW, h: PH }) }}>
        {src ? (
          <img src={src} style={{ width: PW, height: PH, objectFit: "cover", filter: "grayscale(1) contrast(1.1) sepia(0.15)" }} />
        ) : (
          <>
            <div style={{ position: "absolute", top: 34, left: 0, right: 0, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 92, color: INK }}>{masthead}</div>
            <div style={{ position: "absolute", top: 150, left: 60, right: 60, borderTop: `3px solid ${INK}`, borderBottom: `1px solid ${INK}`, height: 4 }} />
            <div style={{ position: "absolute", top: 166, left: 60, right: 60, display: "flex", justifyContent: "space-between", fontFamily: TYPE, fontSize: 24, color: MUTED }}>
              <span>{dateline}</span>
              <span>PRICE 2¢</span>
            </div>
            <div style={{ position: "absolute", top: 222, left: 60, width: 1080, fontFamily: SERIF, fontWeight: 900, fontSize: 80, lineHeight: 1.04, color: INK }}>{headline}</div>
            {dek && <div style={{ position: "absolute", top: 410, left: 60, width: 1080, fontFamily: SERIF, fontStyle: "italic", fontSize: 36, color: "#3a3631" }}>{dek}</div>}
            <div style={{ position: "absolute", top: COL2[1], left: 60, width: 520 }}>
              <svg width={520} height={300} style={{ display: "block" }}>
                <Photo w={520} h={300} subject={photo} treatment="news" />
              </svg>
              <div style={{ fontFamily: TYPE, fontSize: 20, color: MUTED, margin: "8px 0 18px" }}>FIG. 1 — File photo.</div>
              {col1.map((p, i) => <p key={i} style={body}>{p}</p>)}
            </div>
            <div style={{ position: "absolute", top: COL2[1], left: COL2[0], width: 520 }}>
              <p style={{ ...body, fontWeight: 700, color: INK }}><Hi at={hiAt} dur={0.5}>{quote}</Hi></p>
              {col2.map((p, i) => <p key={i} style={body}>{p}</p>)}
            </div>
            <div style={{ position: "absolute", top: COL2[1], bottom: 40, left: 599, width: 1, background: "rgba(21,21,21,0.3)" }} />
          </>
        )}
        {src && hiBox && (
          <div style={{ position: "absolute", left: hiBox.x, top: hiBox.y, width: hiBox.w, height: hiBox.h, background: YELLOW, mixBlendMode: "multiply", transformOrigin: "0 50%", transform: `scaleX(${ramp(t, hiAt, 0.5, Easing.out(Easing.quad))})` }} />
        )}
      </div>
    </div>
  );
};

// ---------- redacted memo ----------
export type RedactSeg = string | { r: string; at: number; reveal?: number };

// A black bar over one phrase: wipes on in three stepped frames, peels up and away on `reveal` to show the word highlighted.
const Bar: FC<{ seg: { r: string; at: number; reveal?: number }; seed: number }> = ({ seg, seed }) => {
  const { t } = useTime();
  const p = Math.floor(clamp01((t - seg.at) / 0.2) * 3 + 1e-6) / 3;
  const off = seg.reveal === undefined ? 0 : ramp(t, seg.reveal, 0.3, Easing.in(Easing.quad));
  const word = seg.reveal !== undefined && t >= seg.reveal ? <Hi at={seg.reveal + 0.15}>{seg.r}</Hi> : seg.r;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {word}
      {off < 1 && (
        <span
          style={{
            position: "absolute", left: -6, right: -6, top: "0.08em", bottom: "-0.06em", background: INK,
            clipPath: tornClip(seed, { left: 4, right: 4, top: 2, bottom: 2 }),
            transformOrigin: "0 50%",
            transform: `translateY(${-off * 70}px) rotate(${-off * 9}deg) scaleX(${p})`,
            opacity: 1 - off * 0.6,
            boxShadow: off > 0 ? "6px 8px 0 rgba(21,21,21,0.3)" : undefined,
          }}
        />
      )}
    </span>
  );
};

export const Redaction: FC<{ title?: string; memoNo?: string; fields?: RedactSeg[][]; lines: RedactSeg[][]; at: number; stampAt?: number; stampText?: string }> = ({ title = "INTERNAL MEMO", memoNo = "No. 0417", fields = [], lines, at, stampAt, stampText = "CONFIDENTIAL" }) => {
  const { t } = useTime();
  const e = stepIn(t, at, 0.36);
  if (e <= 0) return null;
  const row = (segs: RedactSeg[], i: number, size: number) => (
    <div key={i} style={{ fontFamily: TYPE, fontSize: size, lineHeight: 1.55, color: INK, whiteSpace: "pre" }}>
      {segs.map((s, j) => (typeof s === "string" ? <span key={j}>{s}</span> : <Bar key={j} seg={s} seed={700 + i * 17 + j} />))}
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 960, top: 540, transform: `translate(-50%, -50%) translateY(${(1 - e) * -160}px) rotate(-1.2deg)`, filter: hardShadow() }}>
      <div style={{ width: 1380, background: `repeating-linear-gradient(transparent 0 68px, rgba(60,74,92,0.10) 68px 70px), ${SHEET}`, clipPath: tornClip(721, { top: 2, left: 2, right: 2, bottom: 12 }, { w: 1380, h: 760 }), padding: "56px 90px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `4px solid ${INK}`, paddingBottom: 10, marginBottom: 20 }}>
          <span style={{ fontFamily: COND, fontWeight: 700, fontSize: 60, letterSpacing: "0.06em", color: INK }}>{title}</span>
          <span style={{ fontFamily: TYPE, fontSize: 34, color: MUTED }}>{memoNo}</span>
        </div>
        {fields.map((f, i) => row(f, i, 36))}
        <div style={{ height: 22 }} />
        {lines.map((l, i) => row(l, i + 50, 46))}
      </div>
      {stampAt !== undefined && (
        <div style={{ position: "absolute", right: 70, top: 40 }}>
          <RubberStamp at={stampAt} w={560} h={150} rot={-9} seed={13}>
            <text x={280} y={98} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={78} letterSpacing={8} fill={RED}>{stampText}</text>
          </RubberStamp>
        </div>
      )}
    </div>
  );
};

// ---------- evidence board ----------
export type EvidenceNode = { x: number; y: number; w: number; h: number; label: string; at: number; rot?: number; subject?: Subject; src?: string; treatment?: Treatment; note?: string };
export type EvidenceLink = { from: number; to: number; at: number };

// An index card for the board: red top rule, faint blue lines, typed note.
const NoteCard: FC<{ w: number; h: number; text: string }> = ({ w, h, text }) => (
  <foreignObject width={w} height={h}>
    <div style={{ width: w, height: h, background: `repeating-linear-gradient(transparent 0 46px, rgba(60,74,92,0.22) 46px 48px), #fbf8f0`, borderTop: `6px solid ${RED}`, padding: "54px 26px 0", boxSizing: "border-box", fontFamily: TYPE, fontSize: 40, lineHeight: "48px", color: INK }}>{text}</div>
  </foreignObject>
);

// A string sagging between two pins, drawn on from `from` to `to`; a thin shadow sits under it.
const RedString: FC<{ a: P; b: P; at: number; seed: number }> = ({ a, b, at, seed }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.45, Easing.inOut(Easing.quad));
  if (p <= 0) return null;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = noise1(seed);
  const sway = n(q12(t) * 0.8) * 3;
  const pts: P[] = Array.from({ length: 21 }, (_, i) => {
    const u = i / 20;
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + Math.sin(u * Math.PI) * (len * 0.09 + sway)];
  });
  const d = smoothD(pts);
  return (
    <>
      <path d={d} transform="translate(4 7)" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke="rgba(21,21,21,0.25)" strokeWidth={4} />
      <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} fill="none" stroke={RED} strokeWidth={4.5} strokeLinecap="round" />
    </>
  );
};

// Photos and notes pinned to the desk, joined by red string as the narrator connects them: the "follow the thread" diagram.
export const EvidenceBoard: FC<{ nodes: EvidenceNode[]; links: EvidenceLink[] }> = ({ nodes, links }) => {
  const { t } = useTime();
  const pin = (n: EvidenceNode): P => [n.x, n.y - n.h / 2 + 30];
  return (
    <>
      {nodes.map((n, i) => (
        <div key={i}>
          <Cutout x={n.x} y={n.y} w={n.w} h={n.h} rot={n.rot ?? 0} seed={210 + i * 9} at={n.at} from="pop" subject={n.subject} src={n.src} treatment={n.treatment ?? "news"} tape="none" rim={n.note ? 0 : 8} edges={n.note ? { top: 1, right: 1, bottom: 1, left: 1 } : undefined}>
            {n.note ? (
              <svg width={n.w} height={n.h}>
                <NoteCard w={n.w} h={n.h} text={n.note} />
              </svg>
            ) : undefined}
          </Cutout>
          {t >= n.at + 0.2 && (
            <div style={{ position: "absolute", left: n.x, top: n.y + n.h / 2 - 8, transform: "translateX(-50%)" }}>
              <Slip seed={260 + i} rot={(i % 2 ? 2 : -2)} style={{ fontFamily: TYPE, fontSize: 32, padding: "6px 22px", whiteSpace: "nowrap" }}>{n.label}</Slip>
            </div>
          )}
        </div>
      ))}
      <FullStage>
        {links.map((l, i) => <RedString key={i} a={pin(nodes[l.from]!)} b={pin(nodes[l.to]!)} at={l.at} seed={300 + i} />)}
        {nodes.map((n, i) => {
          const [x, y] = pin(n);
          return <Pin key={i} x={x} y={y} at={n.at + 0.15} />;
        })}
      </FullStage>
    </>
  );
};

// A typed caption line that sits under any piece: "SOURCE — The Morning Ledger, 12 May 2009".
export const SourceLine: FC<{ text: string; at: number; x?: number; y?: number; style?: CSSProperties }> = ({ text, at, x = 96, y = 960, style }) => {
  const { t } = useTime();
  if (t < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, ...style }}>
      <Slip seed={881} rot={-0.8} edges={{ left: 5, right: 9 }} style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 26px" }}>
        <span style={{ fontFamily: COND, fontWeight: 700, fontSize: 30, letterSpacing: "0.12em", color: RED }}>SOURCE</span>
        <TypeLine text={text} at={at + 0.1} size={32} cursor={false} />
      </Slip>
    </div>
  );
};
