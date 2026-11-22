// Bento product UI that animates itself: status icons and pills, an issue checklist, the app window mock, a chat thread, the command palette, the feature dock and the logo strip.
import type { FC, ReactNode } from "react";
import { interpolateColors } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { EXPO, HUE, MONO, MUTED, PANEL, RAISED, SANS, SOFT, TEXT, TRACK, fr, hair, litCol, withAlpha } from "./theme";
import { Avatar, Caret, Card, EdgeFade, Icon, IconTile, Mono, PulseDot, appear, exitStyle, type IconName } from "./primitives";
import { GlowBlob } from "./art";
import { TwoToneLine } from "./type";

// ---------- status ----------
export type State = "todo" | "progress" | "review" | "done" | "canceled";
const STATE: Record<State, { label: string; color: string }> = {
  todo: { label: "Todo", color: MUTED },
  progress: { label: "In Progress", color: HUE.amber },
  review: { label: "In Review", color: HUE.green },
  done: { label: "Done", color: HUE.indigo },
  canceled: { label: "Canceled", color: "#5C6068" },
};
export type StateKeys = State | [number, State][];

// Which state a keyed value is in at t, the one before it, and the 0–1 crossfade between them (6 frames).
export const stateAt = (t: number, keys: StateKeys) => {
  if (typeof keys === "string") return { cur: keys, prev: keys, e: 1 };
  let cur = keys[0]![1];
  let prev = cur;
  let at = -1e9;
  for (const [k, s] of keys.slice(1)) {
    if (t < k) break;
    prev = cur;
    cur = s;
    at = k;
  }
  return { cur, prev, e: ramp(t, at, fr(6)) };
};

// The Linear-style status glyph: empty ring, half pie, three-quarter pie, filled check, filled cross.
export const StatusIcon: FC<{ state: State; size?: number }> = ({ state, size = 30 }) => {
  const c = STATE[state].color;
  const pie = (frac: number) => {
    const a = frac * Math.PI * 2;
    return `M12 12 L12 7 A5 5 0 ${frac > 0.5 ? 1 : 0} 1 ${12 + 5 * Math.sin(a)} ${12 - 5 * Math.cos(a)} Z`;
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ flexShrink: 0 }}>
      {state === "done" || state === "canceled" ? (
        <>
          <circle cx={12} cy={12} r={9.5} fill={c} />
          <path d={state === "done" ? "m7.6 12.3 3 3 5.8-6" : "m8.5 8.5 7 7M15.5 8.5l-7 7"} fill="none" stroke="#0B0C0E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx={12} cy={12} r={9} fill="none" stroke={c} strokeWidth={2} />
          {state !== "todo" && <path d={pie(state === "progress" ? 0.5 : 0.75)} fill={c} />}
        </>
      )}
    </svg>
  );
};

// Keyed status glyph: crossfades 6 frames between states.
const KeyedIcon: FC<{ keys: StateKeys; size?: number }> = ({ keys, size = 30 }) => {
  const { t } = useTime();
  const { cur, prev, e } = stateAt(t, keys);
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      {e < 1 && <span style={{ position: "absolute", inset: 0, opacity: 1 - e }}><StatusIcon state={prev} size={size} /></span>}
      <span style={{ position: "absolute", inset: 0, opacity: e, transform: `scale(${0.7 + 0.3 * e})` }}><StatusIcon state={cur} size={size} /></span>
    </span>
  );
};

// A tiny status chip that changes state (Todo → In Progress → Done) with a 6-frame crossfade.
export const StatusPill: FC<{ keys: StateKeys; size?: number }> = ({ keys, size = 30 }) => {
  const { t } = useTime();
  const { cur, prev, e } = stateAt(t, keys);
  const label = (s: State, o: number) => (
    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", opacity: o, whiteSpace: "nowrap" }}>{STATE[s].label}</span>
  );
  const tint = interpolateColors(e, [0, 1], [STATE[prev].color, STATE[cur].color]);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.4, height: size * 1.8, padding: `0 ${size * 0.6}px 0 ${size * 0.4}px`, borderRadius: size, background: withAlpha(tint, 0.1), boxShadow: `inset 0 0 0 1px ${withAlpha(tint, 0.35)}`, fontFamily: SANS, fontWeight: 500, fontSize: size * 0.95, color: TEXT }}>
      <KeyedIcon keys={keys} size={size} />
      <span style={{ position: "relative", display: "inline-block", width: size * 5.6, height: size * 1.2 }}>
        {e < 1 && label(prev, 1 - e)}
        {label(cur, e)}
      </span>
    </span>
  );
};

// ---------- issue checklist (list / steps) ----------
export type Step = { title: string; t: number; id?: string; tag?: { label: string; hue: string } };

// Steps as issues: the list rises in, each step turns In Progress (and highlights) when it's said and Done when the next one starts.
export const IssueSteps: FC<{ steps: Step[]; at: number; finishAt?: number; title?: string; x?: number; y?: number; w?: number; hue?: string; out?: number }> = ({ steps, at, finishAt, title = "Checklist", x = 360, y = 220, w = 1200, hue = HUE.indigo, out }) => {
  const { t } = useTime();
  const card = appear(t, at, { d: 24, y: 40, s: 1.02 });
  const next = (i: number) => steps[i + 1]?.t ?? finishAt;
  const done = steps.filter((_, i) => next(i) !== undefined && t >= next(i)!).length;
  const prog = steps.reduce((s, _, i) => s + (next(i) === undefined ? 0 : ramp(t, next(i)!, fr(12), EXPO)), 0) / steps.length;
  const rowH = 104;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...card.style, ...exitStyle(t, out) }}>
      <Card style={{ height: 96 + rowH * steps.length + 16 }}>
        <div style={{ height: 96, display: "flex", alignItems: "center", gap: 20, padding: "0 36px", borderBottom: `1px solid ${hair(0.06)}`, position: "relative" }}>
          <Icon name="layers" size={34} color={SOFT} />
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 38, color: TEXT, letterSpacing: "-0.015em" }}>{title}</span>
          <span style={{ marginLeft: "auto" }}>
            <Mono color={done === steps.length ? TEXT : MUTED}>{`${done} / ${steps.length} done`}</Mono>
          </span>
          <span style={{ position: "absolute", left: 0, bottom: -1, height: 2, width: `${prog * 100}%`, background: hue, boxShadow: `0 0 12px ${withAlpha(hue, 0.8)}` }} />
        </div>
        {steps.map((s, i) => {
          const row = appear(t, at + fr(10 + 4 * i));
          const n = next(i);
          const keys: [number, State][] = [[0, "todo"], [s.t, "progress"], ...(n !== undefined ? [[n, "done"] as [number, State]] : [])];
          const active = ramp(t, s.t, fr(6)) - (n === undefined ? 0 : ramp(t, n, fr(6)));
          const isDone = n === undefined ? 0 : ramp(t, n, fr(8));
          return (
            <div key={i} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", gap: 26, padding: "0 36px", ...row.style }}>
              <span style={{ position: "absolute", inset: "8px 14px", borderRadius: 12, background: hair(0.045 * active), boxShadow: `inset 0 0 0 1px ${hair(0.09 * active)}` }} />
              <span style={{ position: "relative", fontFamily: MONO, fontSize: 28, color: MUTED, width: 150 }}>{s.id ?? `STEP-${i + 1}`}</span>
              <span style={{ position: "relative" }}><KeyedIcon keys={keys} size={34} /></span>
              <span style={{ position: "relative", fontFamily: SANS, fontWeight: 500, fontSize: 40, letterSpacing: "-0.015em", color: litCol(1 - 0.75 * isDone) }}>{s.title}</span>
              {s.tag && (
                <span style={{ position: "relative", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12, padding: "6px 18px", borderRadius: 30, boxShadow: `inset 0 0 0 1px ${hair(0.1)}`, fontFamily: SANS, fontSize: 28, color: SOFT }}>
                  <span style={{ width: 12, height: 12, borderRadius: 6, background: s.tag.hue }} />
                  {s.tag.label}
                </span>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ---------- the app window mock ----------
export type MockRow = { id: string; title: string; state: StateKeys; tag?: { label: string; hue: string }; who?: string; whoHue?: string };
const SIDEBAR: { icon: IconName; label: string }[] = [
  { icon: "inbox", label: "Inbox" },
  { icon: "user", label: "My issues" },
  { icon: "layers", label: "Projects" },
  { icon: "clock", label: "Cycles" },
  { icon: "sparkle", label: "Agents" },
];

// A faux app window built from DOM: rises 60 px with a 1.02 → 1 settle over 30 frames, its bottom dissolving into the canvas; the selection moves along `active` keys.
export const ProductMock: FC<{ rows: MockRow[]; active?: [number, number][]; at: number; view?: string; workspace?: string; x?: number; y?: number; w?: number; h?: number; out?: number; sideActive?: number }> = ({
  rows,
  active = [[0, 0]],
  at,
  view = "Active issues",
  workspace = "Acme",
  x = 140,
  y = 430,
  w = 1640,
  h = 760,
  out,
  sideActive = 1,
}) => {
  const { t } = useTime();
  const rise = appear(t, at, { d: 30, y: 60, s: 1.02 });
  const rowH = 86;
  const top = 76 + 84;
  let sel = active[0]![1];
  for (const [k, i] of active.slice(1)) {
    if (t < k) break;
    sel = sel + (i - sel) * ramp(t, k, fr(9), EXPO);
  }
  const side = 330;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transformOrigin: "50% 0%", ...rise.style, ...exitStyle(t, out) }}>
      <EdgeFade from={48} style={{ position: "absolute", inset: 0 }}>
        <Card w={w} h={h} radius={18}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: side, borderRight: `1px solid ${hair(0.06)}`, background: "rgba(0,0,0,0.18)", padding: "24px 18px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 12px", height: 56 }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${HUE.indigo}, ${HUE.violet})` }} />
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 32, color: TEXT }}>{workspace}</span>
              <Icon name="search" size={28} style={{ marginLeft: "auto" }} />
            </div>
            <div style={{ margin: "28px 12px 10px" }}><Mono>Workspace</Mono></div>
            {SIDEBAR.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, height: 58, padding: "0 12px", borderRadius: 10, background: i === sideActive ? hair(0.06) : undefined, ...appear(t, at + fr(8 + 2 * i)).style }}>
                <Icon name={s.icon} size={28} color={i === sideActive ? TEXT : MUTED} />
                <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 31, color: i === sideActive ? TEXT : SOFT }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: side, right: 0, top: 0, height: 76, borderBottom: `1px solid ${hair(0.06)}`, display: "flex", alignItems: "center", gap: 18, padding: "0 32px" }}>
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, color: TEXT }}>{view}</span>
            <span style={{ padding: "4px 14px", borderRadius: 8, boxShadow: `inset 0 0 0 1px ${hair(0.1)}`, fontFamily: SANS, fontSize: 28, color: MUTED }}>Display</span>
            <span style={{ marginLeft: "auto" }}><Mono>{`${Math.round(sel) + 1} / ${rows.length}`}</Mono></span>
          </div>
          <div style={{ position: "absolute", left: side, right: 0, top: 76, height: 84, display: "flex", alignItems: "center", gap: 18, padding: "0 32px", background: hair(0.02) }}>
            <StatusIcon state="progress" size={30} />
            <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 31, color: SOFT }}>In Progress</span>
            <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED }}>{rows.length}</span>
          </div>
          <div style={{ position: "absolute", left: side + 12, right: 12, top: top + sel * rowH + 6, height: rowH - 12, borderRadius: 12, background: hair(0.05), boxShadow: `inset 0 0 0 1px ${hair(0.1)}`, opacity: ramp(t, at + fr(24), fr(10)) }} />
          {rows.map((r, i) => {
            const a = appear(t, at + fr(14 + 3 * i));
            const near = clamp01(1 - Math.abs(sel - i));
            return (
              <div key={i} style={{ position: "absolute", left: side, right: 0, top: top + i * rowH, height: rowH, display: "flex", alignItems: "center", gap: 24, padding: "0 40px", ...a.style }}>
                <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED, width: 140 }}>{r.id}</span>
                <KeyedIcon keys={r.state} size={32} />
                <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: litCol(0.55 + 0.45 * near), letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{r.title}</span>
                {r.tag && (
                  <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 12, padding: "4px 16px", borderRadius: 30, boxShadow: `inset 0 0 0 1px ${hair(0.1)}`, fontFamily: SANS, fontSize: 28, color: SOFT }}>
                    <span style={{ width: 12, height: 12, borderRadius: 6, background: r.tag.hue }} />
                    {r.tag.label}
                  </span>
                )}
                {r.who && <span style={{ marginLeft: r.tag ? 0 : "auto" }}><Avatar name={r.who} hue={r.whoHue} size={42} /></span>}
              </div>
            );
          })}
        </Card>
      </EdgeFade>
    </div>
  );
};

// ---------- chat thread ----------
export type Msg = { who: string; text: string; t: number; hue?: string; time?: string; agent?: boolean };

const TypingDots: FC = () => {
  const { f } = useTime();
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", height: 40 }}>
      {[0, 1, 2].map((k) => (
        <span key={k} style={{ width: 11, height: 11, borderRadius: 6, background: MUTED, transform: `translateY(${-7 * Math.max(0, Math.sin(((f - k * 4) / 30) * Math.PI * 3))}px)` }} />
      ))}
    </span>
  );
};

// A thread card: each message is preceded by typing dots and fades up on its time; the composer types a draft (an @mention chip first) and the send button lights.
export const ChatThreadCard: FC<{ messages: Msg[]; at: number; draft?: { text: string; at: number; mention?: string }; typeSpeed?: number; channel?: string; x?: number; y?: number; w?: number; h?: number; out?: number }> = ({
  messages,
  at,
  draft,
  typeSpeed = 22,
  channel = "#product",
  x = 96,
  y = 140,
  w = 860,
  h = 840,
  out,
}) => {
  const { t } = useTime();
  const card = appear(t, at, { d: 24, y: 40, s: 1.02 });
  const typed = draft ? Math.floor(clamp01((t - draft.at) / (draft.text.length / typeSpeed)) * draft.text.length) : 0;
  const sent = draft ? ramp(t, draft.at + draft.text.length / typeSpeed + 0.2, fr(8)) : 0;
  const shown = messages.filter((m) => t >= m.t - 0.6);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...card.style, ...exitStyle(t, out) }}>
      <Card w={w} h={h} radius={18}>
        <div style={{ height: 80, display: "flex", alignItems: "center", gap: 16, padding: "0 32px", borderBottom: `1px solid ${hair(0.06)}` }}>
          <Icon name="chat" size={30} color={SOFT} />
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 32, color: TEXT }}>Thread</span>
          <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED }}>{channel}</span>
          <span style={{ marginLeft: "auto" }}><PulseDot color={HUE.green} size={12} /></span>
        </div>
        <div style={{ padding: "26px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
          {shown.map((m, i) => {
            const typing = t < m.t;
            const a = appear(t, m.t - 0.6, { d: 12, y: 12 });
            const body = appear(t, m.t, { d: 12, y: 8 });
            return (
              <div key={i} style={{ display: "flex", gap: 20, ...a.style }}>
                {m.agent ? <IconTile name="sparkle" hue={HUE.indigo} size={52} /> : <Avatar name={m.who} hue={m.hue} size={52} />}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: TEXT }}>{m.who}</span>
                    {m.time && <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED }}>{m.time}</span>}
                  </div>
                  {typing ? <TypingDots /> : <div style={{ ...body.style, fontFamily: SANS, fontSize: 36, lineHeight: 1.3, color: m.agent ? TEXT : SOFT, letterSpacing: "-0.01em" }}>{m.text}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {draft && (
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 24, height: 170, borderRadius: 14, background: RAISED, boxShadow: `inset 0 0 0 1px ${hair(0.1 + 0.12 * ramp(t, draft.at - 0.3, fr(8)))}`, padding: "22px 24px", boxSizing: "border-box" }}>
            <div style={{ fontFamily: SANS, fontSize: 36, color: TEXT, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
              {draft.mention && t >= draft.at - 0.3 && (
                <span style={{ padding: "2px 10px", marginRight: 10, borderRadius: 8, background: withAlpha(HUE.indigo, 0.22), color: "#B9C0FF", ...appear(t, draft.at - 0.3, { d: 8, y: 4 }).style, display: "inline-block" }}>{draft.mention}</span>
              )}
              {draft.text.slice(0, typed)}
              {t >= draft.at - 0.6 && sent < 1 && <Caret h={38} />}
              {t < draft.at - 0.6 && <span style={{ color: MUTED }}>Reply…</span>}
            </div>
            <div style={{ position: "absolute", left: 24, right: 24, bottom: 18, display: "flex", alignItems: "center", gap: 18 }}>
              <Icon name="clipboard" size={30} />
              <Icon name="smile" size={30} />
              <Icon name="code" size={30} />
              <span style={{ marginLeft: "auto", width: 72, height: 46, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: interpolateColors(sent, [0, 1], [hair(0.08), HUE.indigo]), boxShadow: sent > 0 ? `0 0 ${24 * sent}px ${withAlpha(HUE.indigo, 0.6)}` : undefined }}>
                <Icon name="arrow" size={28} color={TEXT} />
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// ---------- command palette ----------
export type PaletteResult = { title: string; kind: string; icon: IconName; hue?: string };

// A floating search box: the query types, results fade in, the highlight walks down a row every 6 frames to `pick`, then the pick flashes as if Enter was pressed.
export const CommandPalette: FC<{ query: string; results: PaletteResult[]; pick: number; at: number; typeAt?: number; typeSpeed?: number; hue?: string; x?: number; y?: number; w?: number; out?: number }> = ({
  query,
  results,
  pick,
  at,
  typeAt = at + 0.4,
  typeSpeed = 20,
  hue = HUE.red,
  x = 410,
  y = 170,
  w = 1100,
  out,
}) => {
  const { t } = useTime();
  const box = appear(t, at, { d: 18, y: 24, s: 0.98, blur: 6 });
  const typeEnd = typeAt + query.length / typeSpeed;
  const typed = Math.floor(clamp01((t - typeAt) / (typeEnd - typeAt)) * query.length);
  const listAt = typeEnd + 0.1;
  const walk = Math.min(pick, Math.max(0, Math.floor((t - listAt - fr(8)) / fr(6))));
  const enter = ramp(t, listAt + fr(8) + fr(6) * pick + fr(10), fr(6));
  const rowH = 84;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...exitStyle(t, out) }}>
      <GlowBlob x={w / 2} y={180 + rowH * results.length * 0.5} r={460} hue={hue} at={at - 0.2} strength={1.1} />
      <div style={{ position: "relative", ...box.style }}>
        <Card w={w} h={180 + rowH * results.length + 78} radius={20} lit={0.25}>
          <div style={{ height: 104, display: "flex", alignItems: "center", gap: 22, padding: "0 34px", borderBottom: `1px solid ${hair(0.07)}` }}>
            <Icon name="search" size={38} color={SOFT} />
            <span style={{ fontFamily: SANS, fontSize: 42, color: TEXT, letterSpacing: "-0.015em" }}>
              {typed === 0 && t < typeAt ? <span style={{ color: MUTED }}>Search for apps and commands…</span> : query.slice(0, typed)}
              {t >= typeAt && t < listAt + 0.5 && <Caret h={42} />}
            </span>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 28, color: MUTED, padding: "4px 12px", borderRadius: 8, boxShadow: `inset 0 0 0 1px ${hair(0.12)}` }}>⌘ K</span>
          </div>
          <div style={{ padding: "20px 18px 0" }}>
            <div style={{ padding: "0 18px 12px", opacity: ramp(t, listAt, fr(8)) }}><Mono>Results</Mono></div>
            <div style={{ position: "relative" }}>
              {t >= listAt + fr(8) && (
                <div style={{ position: "absolute", left: 0, right: 0, top: walk * rowH, height: rowH, borderRadius: 12, background: interpolateColors(enter, [0, 1], [hair(0.07), withAlpha(hue, 0.28)]), boxShadow: `inset 0 0 0 1px ${hair(0.1)}` }} />
              )}
              {results.map((r, i) => {
                const a = appear(t, listAt + fr(2 * i), { d: 12, y: 8 });
                return (
                  <div key={i} style={{ position: "relative", height: rowH, display: "flex", alignItems: "center", gap: 22, padding: "0 18px", ...a.style }}>
                    <IconTile name={r.icon} hue={r.hue} size={52} />
                    <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 36, color: i === walk ? TEXT : SOFT, letterSpacing: "-0.01em" }}>{r.title}</span>
                    <span style={{ marginLeft: "auto", fontFamily: SANS, fontSize: 28, color: MUTED }}>{r.kind}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 74, borderTop: `1px solid ${hair(0.07)}`, background: hair(0.015), display: "flex", alignItems: "center", gap: 28, padding: "0 32px", fontFamily: SANS, fontSize: 28, color: MUTED }}>
            <span style={{ marginLeft: "auto", color: enter > 0.5 ? TEXT : SOFT }}>Open</span>
            <span style={{ fontFamily: MONO, padding: "2px 10px", borderRadius: 6, boxShadow: `inset 0 0 0 1px ${hair(0.12)}` }}>↵</span>
            <span>Actions</span>
            <span style={{ fontFamily: MONO, padding: "2px 10px", borderRadius: 6, boxShadow: `inset 0 0 0 1px ${hair(0.12)}` }}>⌘ ↵</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ---------- feature dock ----------
export type DockItem = { icon: IconName; label: string; lead: string; tail?: string; hue: string; stage?: ReactNode };

// Raycast's dock: a dark stage over a big blurred glow, a row of icon buttons; on each activeAt the active icon lifts, the glow changes hue and the caption crossfades (8 frames).
export const FeatureDock: FC<{ items: DockItem[]; activeAt: number[]; at: number; x?: number; y?: number; w?: number; h?: number; out?: number }> = ({ items, activeAt, at, x = 280, y = 110, w = 1360, h = 660, out }) => {
  const { t } = useTime();
  const stage = appear(t, at, { d: 24, y: 40, s: 1.02 });
  let idx = 0;
  activeAt.forEach((k, i) => {
    if (t >= k) idx = i;
  });
  const sw = ramp(t, activeAt[idx] ?? at, fr(8));
  const prevIdx = idx > 0 ? idx - 1 : 0;
  const hueKeys = activeAt.map((k, i) => [k, items[i]!.hue] as [number, string]);
  const btn = 92;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, ...exitStyle(t, out) }}>
      <div style={{ position: "relative", height: h, ...stage.style }}>
        <Card w={w} h={h} radius={26}>
          <GlowBlob x={w / 2} y={h * 0.42} r={300} keys={hueKeys} at={at} />
          {items.map((it, i) => {
            const o = i === idx ? sw : i === prevIdx && idx !== prevIdx ? 1 - sw : 0;
            if (o <= 0) return null;
            return (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, opacity: o, transform: `scale(${0.96 + 0.04 * o})`, filter: `blur(${(1 - o) * 6}px)` }}>
                {it.stage ?? (
                  <>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 170, height: 170, borderRadius: 40, background: `linear-gradient(180deg, ${hair(0.14)}, ${hair(0.04)})`, boxShadow: `inset 0 1px 0 ${hair(0.25)}, inset 0 0 0 1px ${hair(0.12)}, 0 30px 60px rgba(0,0,0,0.5)` }}>
                      <Icon name={it.icon} size={84} color={TEXT} sw={1.5} />
                    </span>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 64, letterSpacing: TRACK, color: TEXT }}>{it.label}</span>
                  </>
                )}
              </div>
            );
          })}
          <div style={{ position: "absolute", left: "50%", bottom: 36, transform: "translateX(-50%)", display: "flex", gap: 14, padding: 12, borderRadius: 24, background: withAlpha(PANEL, 0.85), boxShadow: `inset 0 0 0 1px ${hair(0.1)}, 0 20px 40px rgba(0,0,0,0.5)` }}>
            {items.map((it, i) => {
              const on = i === idx ? sw : i === prevIdx && idx !== prevIdx ? 1 - sw : 0;
              return (
                <span key={i} style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: btn, height: btn, borderRadius: 18, transform: `translateY(${-10 * on}px)`, background: on > 0 ? hair(0.1 * on) : undefined, boxShadow: `inset 0 0 0 1px ${hair(0.06 + 0.24 * on)}` }}>
                  <Icon name={it.icon} size={40} color={interpolateColors(on, [0, 1], [MUTED, TEXT])} />
                </span>
              );
            })}
          </div>
        </Card>
      </div>
      <div style={{ position: "relative", height: 120, marginTop: 40 }}>
        {items.map((it, i) => {
          const o = i === idx ? sw : i === prevIdx && idx !== prevIdx ? 1 - sw : 0;
          return o <= 0 ? null : <TwoToneLine key={i} lead={it.lead} tail={it.tail} size={44} style={{ position: "absolute", left: 0, right: 0, textAlign: "center", opacity: o * stage.p }} />;
        })}
      </div>
    </div>
  );
};

// ---------- logo strip ----------
const MARKS: (() => ReactNode)[] = [
  () => <><circle cx={12} cy={12} r={9} /><path d="M12 3v18" /></>,
  () => <path d="M12 3 21 20H3z" />,
  () => <><rect x={3} y={4} width={7} height={16} rx={2} /><rect x={14} y={4} width={7} height={16} rx={2} /></>,
  () => <path d="m12 2.5 8.5 5v9l-8.5 5-8.5-5v-9z" />,
  () => <><circle cx={12} cy={12} r={9} /><circle cx={12} cy={12} r={4} /></>,
  () => <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />,
];
const STYLES = [
  { fontFamily: SANS, fontWeight: 600, letterSpacing: "-0.03em" },
  { fontFamily: MONO, fontWeight: 500, letterSpacing: "0.02em" },
  { fontFamily: SANS, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase" as const, fontSize: "0.72em" },
  { fontFamily: SANS, fontWeight: 400, letterSpacing: "-0.02em" },
];

// Grey wordmarks (drawn, fictional) staggering in 3 frames apart; at highlightAt one lights white and the rest drop back.
export const LogoStrip: FC<{ names: string[]; at: number; highlight?: number; highlightAt?: number; caption?: string; y?: number; out?: number }> = ({ names, at, highlight, highlightAt, caption, y = 860, out }) => {
  const { t } = useTime();
  const hl = highlight === undefined || highlightAt === undefined ? 0 : ramp(t, highlightAt, fr(12), EXPO);
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, ...exitStyle(t, out) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {names.map((n, i) => {
          const a = appear(t, at + fr(3 * i));
          const me = i === highlight ? hl : 0;
          const col = interpolateColors(me, [0, 1], [MUTED, TEXT]);
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 46, color: col, ...STYLES[i % STYLES.length], ...a.style, opacity: (a.p > 0 ? clamp01(a.p * 1.4) : 0) * (1 - 0.6 * hl * (i === highlight ? 0 : 1)), textShadow: me > 0 ? `0 0 30px ${hair(0.35 * me)}` : undefined }}>
              <svg viewBox="0 0 24 24" width={40} height={40} fill="none" stroke={col} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{MARKS[i % MARKS.length]!()}</svg>
              {n}
            </span>
          );
        })}
      </div>
      {caption && <div style={{ marginTop: 34, ...appear(t, at + fr(3 * names.length + 4)).style }}><Mono>{caption}</Mono></div>}
    </div>
  );
};
