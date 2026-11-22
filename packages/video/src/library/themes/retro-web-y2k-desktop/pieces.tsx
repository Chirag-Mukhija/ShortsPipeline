// Explainer pieces in fake-OS form: setup-wizard steps, A-vs-B windows with a frozen loser, the guestbook quote, the network map, chunked progress and the address-bar source label.
import type { FC } from "react";
import { useTime } from "../../core/time";
import { H } from "../../core/video";
import { CREAM, GREY, GREY_DK, INK, NAVY, PINK, PINK_HOT, PIXEL, TEAL, TYPE, UI, WHITE, WORD, YELLOW, raised, sunken } from "./theme";
import { Btn, Field, Marquee, OsWindow, TypeOn } from "./chrome";
import { FakeCursor } from "./cursor";
import { COMPUTER, DOC, FLOPPY, G_CHECK, G_PLAY, GLOBE, HEART, HOURGLASS_A, HOURGLASS_B, ICONS, MAIL, Pix, STARMARK, type IconName, type Sprite } from "./pixels";
import { WordArt } from "./type";
import { blink, clamp, fr, lerp, local, popS, quant } from "./motion";

// ---------- chunked bar ----------
export const Blocks: FC<{ n: number; lit: number; w: number; h?: number; color?: string }> = ({ n, lit, w, h = 48, color = NAVY }) => (
  <div style={{ width: w, height: h, background: WHITE, ...sunken(), padding: 8, boxSizing: "border-box", display: "flex", gap: 5 }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ flex: 1, background: i < lit ? color : "transparent" }} />
    ))}
  </div>
);

// ---------- setup wizard ----------
export type WizardStep = { label: string; at: number };

export const SetupWizard: FC<{ steps: WizardStep[]; title?: string; heading?: string; doneAt?: number; x?: number; y?: number; w?: number; h?: number; at?: number }> = ({ steps, title = "Setup Wizard", heading = "Installing", doneAt, x = 260, y = 140, w = 1400, h = 790, at }) => {
  const { f } = useTime();
  const t = f / 30;
  const cur = steps.reduce((k, s, i) => (t >= s.at ? i : k), -1);
  const done = (i: number) => (i < cur || (doneAt !== undefined && t >= doneAt)) && t >= steps[i]!.at;
  const nDone = steps.filter((_, i) => done(i)).length;
  const next = { x: x + 1040, y: y + h - 64 };
  return (
    <>
      <OsWindow x={x} y={y} w={w} h={h} title={title} icon={FLOPPY} body="grey" pad={0} at={at}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 360, background: `linear-gradient(180deg, ${TEAL} 0%, ${NAVY} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40, overflow: "hidden" }}>
          {[[40, 60], [280, 120], [90, 520], [300, 600], [200, 40]].map(([sx, sy], i) => (
            <div key={i} style={{ position: "absolute", left: sx, top: sy, width: 6, height: 6, background: WHITE, opacity: blink(f + i * 5, 1) ? 0.9 : 0.3 }} />
          ))}
          <Pix sprite={FLOPPY} px={10} />
          <Pix sprite={COMPUTER} px={8} />
        </div>
        <div style={{ position: "absolute", left: 410, top: 40, right: 40 }}>
          <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 34, color: INK }}>STEP {Math.max(1, cur + 1)} OF {steps.length}</div>
          <div style={{ fontFamily: PIXEL, fontSize: 50, color: GREY_DK, marginTop: 6, marginBottom: 26 }}>{heading}</div>
          {steps.map((s, i) => {
            const shown = t >= s.at - 0.5 || i <= cur;
            const isCur = i === cur && !done(i);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, height: 76, opacity: shown ? 1 : 0.35 }}>
                <div style={{ width: 30 }}>{isCur && blink(f, 2) && <Pix sprite={G_PLAY} px={4} recolor={{ k: NAVY }} />}</div>
                <div style={{ width: 50, height: 50, background: WHITE, ...sunken(), display: "flex", alignItems: "center", justifyContent: "center" }}>{done(i) && <Pix sprite={G_CHECK} px={5} />}</div>
                <div style={{ fontFamily: PIXEL, fontSize: 60, color: done(i) ? INK : isCur ? NAVY : GREY_DK, textDecoration: isCur ? "underline" : "none", textUnderlineOffset: 8 }}>{s.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 410, right: 40, bottom: 120, height: 4, borderTop: `2px solid ${GREY_DK}`, borderBottom: `2px solid ${WHITE}` }} />
        <div style={{ position: "absolute", left: 410, right: 40, bottom: 150, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontFamily: UI, fontSize: 28, color: INK }}>PROGRESS</div>
          <Blocks n={steps.length * 5} lit={nDone * 5} w={760} h={56} />
        </div>
        <div style={{ position: "absolute", right: 28, bottom: 28, display: "flex", gap: 16 }}>
          <Btn label="< Back" w={220} />
          <Btn label="Next >" w={220} primary down={steps.some((s, i) => i > 0 && local(f, s.at) >= 0 && local(f, s.at) < 3)} />
          <Btn label="Cancel" w={200} />
        </div>
      </OsWindow>
      <FakeCursor
        at={steps[0]!.at}
        keys={[{ t: steps[0]!.at, x: next.x + 260, y: next.y - 220 }, { t: (steps[1]?.at ?? steps[0]!.at + 1) - 0.4, x: next.x + 10, y: next.y + 6 }]}
        clicks={steps.slice(1).map((s) => s.at)}
      />
    </>
  );
};

// ---------- A vs B ----------
export type Side = { title: string; name: string; lines: string[]; icon?: IconName };

const SideBody: FC<{ s: Side; at: number }> = ({ s, at }) => {
  const { f } = useTime();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
        <Pix sprite={ICONS[s.icon ?? "doc"]} px={5} />
        <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 46, color: INK }}>{s.name}</div>
      </div>
      {s.lines.map((ln, i) => (
        <div key={i} style={{ display: "flex", gap: 16, fontFamily: PIXEL, fontSize: 52, lineHeight: 1.25, color: INK, visibility: local(f, at + 0.3 + i * 0.3) >= 0 ? "visible" : "hidden" }}>
          <span style={{ color: TEAL }}>{">"}</span>
          {ln}
        </div>
      ))}
    </div>
  );
};

export const Versus: FC<{ a: Side; b: Side; at: { a: number; b: number; vs: number; verdict: number }; winner: "a" | "b" }> = ({ a, b, at, winner }) => {
  const { f } = useTime();
  const lv = local(f, at.verdict);
  const frozen = lv < 0 ? 0 : clamp(quant(lv, 3) / 9);
  const L = { x: 120, y: 270, w: 720, h: 500 };
  const R = { x: 1080, y: 270, w: 720, h: 500 };
  const win = winner === "a" ? L : R;
  const lose = winner === "a" ? R : L;
  const badge = lv >= 0 ? popS(lv) : 0;
  return (
    <>
      <OsWindow {...L} title={a.title} icon={ICONS[a.icon ?? "doc"]} at={at.a} active={winner === "a" || lv < 0} frozen={winner === "b" ? frozen : 0} status={winner === "b" && frozen >= 1 ? "Waiting for program..." : "Ready"}>
        <SideBody s={a} at={at.a} />
      </OsWindow>
      <OsWindow {...R} title={b.title} icon={ICONS[b.icon ?? "doc"]} at={at.b} active={winner === "b" || lv < 0} frozen={winner === "a" ? frozen : 0} status={winner === "a" && frozen >= 1 ? "Waiting for program..." : "Ready"}>
        <SideBody s={b} at={at.b} />
      </OsWindow>
      <WordArt text="VS" x={960} y={520} size={170} at={at.vs} look="sunset" shape="flat" />
      {badge > 0 && (
        <div style={{ position: "absolute", left: win.x + win.w - 360, top: win.y - 104, transform: `scale(${badge}) rotate(4deg)`, padding: "12px 24px", background: YELLOW, ...raised(4), display: "flex", alignItems: "center", gap: 16, fontFamily: UI, fontWeight: 700, fontSize: 38, color: INK, visibility: lv < 30 && !blink(lv) ? "hidden" : "visible" }}>
          <Pix sprite={STARMARK} px={4} recolor={{ y: PINK_HOT }} />
          WINNER!
          <Pix sprite={STARMARK} px={4} recolor={{ y: PINK_HOT }} />
        </div>
      )}
      <FakeCursor
        at={at.verdict - 0.8}
        keys={[{ t: at.verdict - 0.8, x: 960, y: 760 }, { t: at.verdict, x: lose.x + lose.w / 2 + 60, y: lose.y + 330 }]}
        kinds={[[0, "arrow"], [at.verdict, "wait"]]}
      />
    </>
  );
};

// ---------- guestbook quote ----------
const SMILEY: Sprite = [
  "...kkkkkk...",
  "..kyyyyyyk..",
  ".kyyyyyyyyk.",
  "kyykyyyykyyk",
  "kyykyyyykyyk",
  "kyyyyyyyyyyk",
  "kykyyyyyykyk",
  "kyykyyyykyyk",
  ".kyykkkkyyk.",
  "..kyyyyyyk..",
  "...kkkkkk...",
];

export const Guestbook: FC<{ quote: string; author: string; meta?: string; at: number; cps?: number; entry?: string; title?: string }> = ({ quote, author, meta, at, cps = 40, entry = "Entry #0042", title = "guestbook.htm" }) => {
  const { f } = useTime();
  const typed = local(f, at + quote.length / cps + 0.3) >= 0;
  return (
    <OsWindow x={220} y={150} w={1480} h={770} title={title} icon={MAIL} tone="pastel" body="cream" pad={0} at={at - 0.4}>
      <div style={{ height: 84, background: PINK, borderBottom: `3px solid ${INK}`, display: "flex", alignItems: "center" }}>
        <Marquee text="~*~ sign my guestbook ~*~ thanks for stopping by ~*~" width={1474} size={50} font={WORD} color={PINK_HOT} speed={5} />
      </div>
      <div style={{ display: "flex", gap: 44, padding: "44px 56px 0" }}>
        <div style={{ width: 190, height: 190, flex: "none", background: WHITE, border: `3px solid ${INK}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Pix sprite={SMILEY} px={12} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: UI, fontSize: 30, color: GREY_DK, marginBottom: 16 }}>
            <span>{entry}</span>
            {meta && <span style={{ fontFamily: PIXEL, fontSize: 40 }}>{meta}</span>}
          </div>
          <div style={{ fontFamily: TYPE, fontWeight: 700, fontSize: 54, lineHeight: 1.28, color: INK, minHeight: 280 }}>
            <span style={{ color: PINK_HOT }}>“</span>
            <TypeOn text={quote} at={at} cps={cps} caret={!typed} />
            {typed && <span style={{ color: PINK_HOT }}>”</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 18, fontFamily: UI, fontWeight: 700, fontSize: 34, color: INK, opacity: typed ? 1 : 0 }}>
            — {author}
            <Pix sprite={HEART} px={5} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 36, borderTop: `3px dashed ${INK}`, paddingTop: 18, display: "flex", justifyContent: "space-between", fontFamily: PIXEL, fontSize: 42, color: "#1A3BFF", textDecoration: "underline" }}>
        <span>{"<< previous entry"}</span>
        <span>sign the book!</span>
        <span>{"next entry >>"}</span>
      </div>
    </OsWindow>
  );
};

// ---------- network map ----------
export type NetNode = { label: string; icon: IconName; at: number };

export const NetworkMap: FC<{ nodes: NetNode[]; links?: string[]; packetAt?: number; hop?: number; title?: string; y?: number; x0?: number; x1?: number }> = ({ nodes, links = [], packetAt, hop = 0.8, title, y = 560, x0 = 290, x1 = 1630 }) => {
  const { f } = useTime();
  const n = nodes.length;
  const xs = nodes.map((_, i) => lerp(x0, x1, n > 1 ? i / (n - 1) : 0.5));
  const hf = fr(hop);
  const lp = packetAt === undefined ? -1 : local(f, packetAt);
  const cycle = (n - 1) * hf + 12;
  const pc = lp < 0 ? -1 : lp % cycle;
  const seg = pc < 0 ? -1 : Math.floor(pc / hf);
  const arrived = (i: number) => pc >= 0 && i > 0 && (seg === i || (seg >= n - 1 && i === n - 1)) && pc - i * hf < 6 && pc - i * hf >= 0;
  return (
    <>
      {title && (
        <div style={{ position: "absolute", left: "50%", top: 200, transform: "translateX(-50%)", padding: "16px 40px", background: GREY, ...raised(4), fontFamily: UI, fontWeight: 700, fontSize: 46, color: INK, whiteSpace: "nowrap" }}>{title}</div>
      )}
      <svg width={1920} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
        {xs.slice(1).map((x, i) => {
          const p = clamp((local(f, nodes[i + 1]!.at) + 1) / 6);
          if (p <= 0) return null;
          const a = xs[i]! + 110;
          const b = lerp(a, x - 110, quant(p * 6, 1) / 6);
          return (
            <g key={i}>
              <line x1={a} y1={y} x2={b} y2={y} stroke={INK} strokeWidth={12} />
              <line x1={a} y1={y} x2={b} y2={y} stroke={YELLOW} strokeWidth={6} strokeDasharray="12 12" strokeDashoffset={-quant(f, 3) * 4} />
            </g>
          );
        })}
      </svg>
      {xs.slice(1).map((x, i) =>
        links[i] && local(f, nodes[i + 1]!.at) >= 6 ? (
          <div key={`l${i}`} style={{ position: "absolute", left: (xs[i]! + x) / 2, top: y - 104, transform: "translateX(-50%)", fontFamily: PIXEL, fontSize: 50, color: INK, background: CREAM, border: `3px solid ${INK}`, padding: "0 14px", whiteSpace: "nowrap" }}>{links[i]}</div>
        ) : null,
      )}
      {nodes.map((nd, i) => {
        const s = popS(local(f, nd.at));
        if (s <= 0) return null;
        const flash = arrived(i) && blink(f, 6);
        return (
          <div key={i} style={{ position: "absolute", left: xs[i]! - 140, top: y - 96, width: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, transform: `scale(${s})` }}>
            <div style={{ padding: 8, background: flash ? YELLOW : "transparent" }}>
              <Pix sprite={ICONS[nd.icon]} px={11} />
            </div>
            <div style={{ fontFamily: UI, fontSize: 34, color: WHITE, background: NAVY, padding: "4px 14px", outline: `3px dotted ${YELLOW}`, outlineOffset: 3, whiteSpace: "nowrap" }}>{nd.label}</div>
          </div>
        );
      })}
      {seg >= 0 && seg < n - 1 && (() => {
        const k = quant(pc - seg * hf, 3) / hf;
        const px = lerp(xs[seg]! + 90, xs[seg + 1]! - 90, k);
        const py = y - 40 - Math.sin(k * Math.PI) * 90;
        return <Pix sprite={MAIL} px={6} x={px - 48} y={py - 25} style={{ filter: "drop-shadow(4px 4px 0 rgba(0,0,0,0.4))" }} />;
      })()}
    </>
  );
};

// ---------- progress blocks ----------
export const ProgressBlocks: FC<{ file: string; to?: number; at: number; dur?: number; blocks?: number; remaining?: string[]; title?: string; from?: Sprite; dest?: Sprite }> = ({
  file, to = 1, at, dur = 3, blocks = 22, remaining = ["about 2 minutes", "about 4 hours", "about 11 seconds"], title = "Downloading...", from = FLOPPY, dest = GLOBE,
}) => {
  const { f } = useTime();
  const l = local(f, at);
  const u = clamp(quant(Math.max(0, l), 3) / (dur * 30));
  // Monotonic but lumpy: it stalls and lurches the way old progress bars did.
  const p = to * clamp(u + 0.06 * Math.sin(u * Math.PI * 3));
  const lit = Math.floor(p * blocks);
  const rem = remaining[Math.floor(Math.max(0, l) / 24) % remaining.length];
  return (
    <OsWindow x={360} y={250} w={1200} h={560} title={title} icon={from} body="grey" pad={36} at={at - 0.3}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 150, position: "relative", padding: "0 40px" }}>
        <Pix sprite={from} px={8} />
        {[0, 1, 2].map((k) => {
          const ph = ((quant(Math.max(0, l), 3) / 30 / 1.2 + k / 3) % 1 + 1) % 1;
          if (l < 0 || (u >= 1 && to >= 1)) return null;
          return <Pix key={k} sprite={DOC} px={3.5} x={200 + ph * 590} y={30 - Math.sin(ph * Math.PI) * 60} />;
        })}
        <Pix sprite={dest} px={8} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 20, fontFamily: PIXEL, fontSize: 50, color: INK }}>
        <Pix sprite={Math.floor(f / 15) % 2 ? HOURGLASS_B : HOURGLASS_A} px={4} />
        {file}
      </div>
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 24 }}>
        <Blocks n={blocks} lit={lit} w={940} h={62} />
        <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 40, color: INK, width: 140, textAlign: "right" }}>{Math.round(p * 100)}%</div>
      </div>
      <div style={{ marginTop: 18, fontFamily: PIXEL, fontSize: 44, color: GREY_DK }}>{u >= 1 && to >= 1 ? "Download complete." : `Time remaining: ${rem}`}</div>
    </OsWindow>
  );
};

// ---------- address-bar source label ----------
export const AddressBar: FC<{ url: string; at: number; label?: string; status?: string; x?: number; w?: number }> = ({ url, at, label = "SOURCE", status = "Done", x = 96, w = 1160 }) => {
  const { f } = useTime();
  const l = local(f, at);
  if (l < 0) return null;
  const rise = [90, 50, 18, 0][Math.min(3, Math.floor(l / 3))]!;
  const typedAt = at + 0.25;
  const endType = local(f, typedAt + url.length / 34);
  const go = endType >= 0 && endType < 3;
  const loaded = endType >= 9;
  const h = 196;
  return (
    <div style={{ position: "absolute", left: x, top: H - 96 - h + rise, width: w }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: NAVY, color: WHITE, fontFamily: UI, fontWeight: 700, fontSize: 28, padding: "6px 18px 4px", border: `3px solid ${INK}`, borderBottom: "none" }}>
        <Pix sprite={STARMARK} px={3} />
        {label}
      </div>
      <div style={{ background: GREY, ...raised(), padding: 14, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, boxShadow: `${raised().boxShadow}, 10px 10px 0 rgba(0,0,0,0.35)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: UI, fontSize: 28, color: INK }}>
            <span style={{ textDecoration: "underline" }}>A</span>ddress
          </div>
          <Field style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, height: 70, padding: "0 16px" }}>
            <Pix sprite={GLOBE} px={3} />
            <span style={{ fontFamily: PIXEL, fontSize: 48, color: INK, whiteSpace: "nowrap", overflow: "hidden" }}>
              <TypeOn text={url} at={typedAt} cps={34} caret={!loaded} />
            </span>
          </Field>
          <Btn label="Go" w={110} h={70} down={go} />
        </div>
        <div style={{ height: 50, ...sunken(2), display: "flex", alignItems: "center", gap: 16, padding: "0 14px", fontFamily: PIXEL, fontSize: 38, color: INK }}>
          <Pix sprite={loaded ? STARMARK : DOC} px={loaded ? 3 : 2} recolor={{ y: TEAL }} />
          {loaded ? status : endType >= 0 ? "Opening page..." : "Connecting..."}
          <div style={{ flex: 1 }} />
          {!loaded && endType >= 0 && <Blocks n={8} lit={Math.floor(endType)} w={220} h={36} />}
        </div>
      </div>
    </div>
  );
};

// Convenience: a desktop icon with a caption, popping in stepped, for icon grids and "folders" lists.
export const DeskIcon: FC<{ icon: IconName; label: string; x: number; y: number; at?: number; selected?: boolean }> = ({ icon, label, x, y, at = 0, selected }) => {
  const { f } = useTime();
  const s = popS(local(f, at));
  if (s <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x - 110, top: y, width: 220, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transform: `scale(${s})` }}>
      <Pix sprite={ICONS[icon]} px={6} />
      <div style={{ fontFamily: UI, fontSize: 28, color: WHITE, background: selected ? NAVY : "transparent", padding: "2px 10px", textShadow: selected ? "none" : `3px 3px 0 ${INK}`, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
};
