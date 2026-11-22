// "Orbit", the drawn stand-in app for demos without a recording: sidebar, projects and settings pages, a new-project dialog and a command palette, with named hit targets for cursor keys.
import type { CSSProperties, FC, ReactNode } from "react";
import { interpolateColors } from "remotion";
import { ACCENT, ACCENT_DEEP, BAD, GOOD, MONO, SANS, UI, VIOLET, WARN, type Look } from "./theme";
import type { Rect } from "./motion";

// Hit targets in the app's 1360 × 765 design space; aim cursor keys at center(ORBIT.x).
export const ORBIT = {
  search: { x: 24, y: 100, w: 252, h: 56 },
  nav: (i: number): Rect => ({ x: 16, y: 184 + i * 62, w: 268, h: 54 }),
  newBtn: { x: 1072, y: 38, w: 240, h: 60 },
  card: (i: number): Rect => ({ x: 348 + i * 326, y: 168, w: 312, h: 172 }),
  row: (i: number): Rect => ({ x: 348, y: 412 + i * 86, w: 964, h: 76 }),
  dialog: { x: 510, y: 140, w: 640, h: 480 },
  nameField: { x: 550, y: 292, w: 560, h: 72 },
  chip: (i: number): Rect => ({ x: 550 + i * 192, y: 434, w: 176, h: 60 }),
  cancel: { x: 778, y: 530, w: 156, h: 60 },
  create: { x: 950, y: 530, w: 160, h: 60 },
  toggle: (i: number): Rect => ({ x: 1218, y: 199 + i * 112, w: 84, h: 46 }),
  setRow: (i: number): Rect => ({ x: 348, y: 176 + i * 112, w: 964, h: 96 }),
  palette: { x: 340, y: 92, w: 680, h: 400 },
  paletteRow: (i: number): Rect => ({ x: 352, y: 186 + i * 72, w: 656, h: 64 }),
};
export const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const ICONS: Record<string, string> = {
  home: "M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z",
  folder: "M3 7 a2 2 0 0 1 2 -2 H10 L12 7.5 H19 a2 2 0 0 1 2 2 V17 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z",
  rocket: "M12 3 C16 6 17 10 15.5 15 H8.5 C7 10 8 6 12 3 Z M8.5 15 L6 18 L9 18 M15.5 15 L18 18 L15 18 M12 9.5 a1.5 1.5 0 1 0 0.01 0",
  chart: "M4 20 H20 M7 16 V11 M12 16 V6 M17 16 V13",
  gear: "M12 8.5 a3.5 3.5 0 1 0 0.01 0 M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3",
  search: "M10.5 4 a6.5 6.5 0 1 0 0.01 0 M15.5 15.5 L20 20",
  plus: "M12 5 V19 M5 12 H19",
  check: "M5 12.5 L10 17 L19 7",
  x: "M6 6 L18 18 M18 6 L6 18",
  spark: "M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z",
  branch: "M7 4 V20 M7 14 C7 10 17 12 17 8 M17 4 a2 2 0 1 0 0.01 0",
  moon: "M19 14.5 A7.5 7.5 0 1 1 9.5 5 A6 6 0 0 0 19 14.5 Z",
  bell: "M6 16 V11 a6 6 0 0 1 12 0 V16 L19.5 18 H4.5 Z M10 20.5 H14",
  link: "M10 14 L14 10 M8.5 11.5 L6.5 13.5 a3 3 0 0 0 4 4 L12.5 15.5 M15.5 12.5 L17.5 10.5 a3 3 0 0 0 -4 -4 L11.5 8.5",
};
export type IconName = keyof typeof ICONS;

export const Icon: FC<{ name: IconName | string; size?: number; color?: string; w?: number; fill?: boolean }> = ({ name, size = 28, color = "currentColor", w = 2, fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: "block" }}>
    <path d={ICONS[name] ?? ""} fill={fill ? color : "none"} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The app icon: a squircle with an orbit ring, reused for title cards and lower thirds.
export const AppIcon: FC<{ size?: number; style?: CSSProperties }> = ({ size = 44, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.28, background: `linear-gradient(140deg, ${ACCENT} 0%, ${VIOLET} 100%)`, boxShadow: `0 ${size * 0.08}px ${size * 0.25}px rgba(60,80,200,0.35), inset 0 1px 0 rgba(255,255,255,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
    <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24">
      <ellipse cx={12} cy={12} rx={10} ry={4.2} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.8} transform="rotate(-28 12 12)" />
      <circle cx={12} cy={12} r={4.4} fill="#FFFFFF" />
      <circle cx={19.6} cy={8} r={1.8} fill="#FFFFFF" />
    </svg>
  </div>
);

const abs = (r: Rect): CSSProperties => ({ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h });

export const Kbd: FC<{ k: string; look?: Look; size?: number }> = ({ k, look = "light", size = 28 }) => (
  <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 500, color: UI[look].soft, padding: "0 10px", borderRadius: 8, border: `1.5px solid ${UI[look].line}`, background: UI[look].win, lineHeight: `${size * 1.35}px` }}>{k}</span>
);

const NAV: [IconName, string][] = [["home", "Home"], ["folder", "Projects"], ["rocket", "Deploys"], ["chart", "Insights"], ["gear", "Settings"]];

const PROJECTS = [
  { name: "Portfolio site", meta: "Next.js · 2 min ago", status: "Live", col: GOOD, hue: ACCENT },
  { name: "Habit tracker", meta: "React Native · building", status: "Building", col: WARN, hue: "#F07A3E" },
  { name: "Discord bot", meta: "Python · 3 days ago", status: "Paused", col: "#9AA0B2", hue: "#7A5CFA" },
  { name: "Study planner", meta: "SvelteKit · 1 h ago", status: "Live", col: GOOD, hue: "#21B8A6" },
];

const STATS = [
  { label: "Deploys", value: "128", delta: "↑ 24%", up: true },
  { label: "Uptime", value: "99.98%", delta: "30 days", up: true },
  { label: "Build time", value: "41 s", delta: "↓ 12%", up: true },
];

const SETTINGS = [
  { icon: "moon", label: "Dark mode", desc: "Use the dark theme everywhere" },
  { icon: "rocket", label: "Auto-deploy on push", desc: "Ship every commit to main" },
  { icon: "link", label: "Preview links", desc: "A URL for every branch" },
  { icon: "bell", label: "Weekly email", desc: "A digest every Monday" },
];

const Spark: FC<{ seed: number; color: string }> = ({ seed, color }) => {
  const pts = Array.from({ length: 9 }, (_, i) => [i * 13, 34 - (Math.sin(i * 1.3 + seed) * 9 + i * 2.6)]);
  return (
    <svg width={110} height={44} viewBox="0 0 110 44">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const Toggle: FC<{ on: number; look?: Look }> = ({ on, look = "light" }) => (
  <div style={{ width: 84, height: 46, borderRadius: 23, background: interpolateColors(on, [0, 1], [look === "light" ? "#DADDE6" : "#3A3A45", ACCENT]), position: "relative" }}>
    <div style={{ position: "absolute", top: 4, left: 4 + on * 38, width: 38, height: 38, borderRadius: 19, background: "#FFFFFF", boxShadow: "0 2px 6px rgba(0,0,0,0.22)" }} />
  </div>
);

export type OrbitProps = {
  look?: Look;
  page?: "projects" | "settings";
  // Settings toggles, 0..1 each, so a click can animate one.
  toggles?: number[];
  // 0..1 press on the New project button (it darkens and sinks a little).
  press?: number;
  // 0..1 hover glow on a project row.
  hoverRow?: [number, number];
  // A project that was just created: lands at the top of Recent with an accent flash as p goes 0 → 1.
  added?: { name: string; meta: string; p: number };
  children?: ReactNode;
};

export const OrbitApp: FC<OrbitProps> = ({ look = "light", page = "projects", toggles = [0, 1, 1, 0], press = 0, hoverRow, added, children }) => {
  const u = UI[look];
  const rows = added && added.p > 0 ? [{ name: added.name, meta: added.meta, status: "Building", col: WARN, hue: ACCENT_DEEP }, ...PROJECTS.slice(0, 3)] : PROJECTS;
  const active = page === "projects" ? 1 : 4;
  return (
    <div style={{ position: "absolute", inset: 0, width: 1360, height: 765, background: u.win, fontFamily: SANS, color: u.text, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 300, height: 765, background: u.side, borderRight: `1px solid ${u.line}` }}>
        <div style={{ position: "absolute", left: 28, top: 30, display: "flex", alignItems: "center", gap: 14 }}>
          <AppIcon size={44} />
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>Orbit</span>
        </div>
        <div style={{ ...abs(ORBIT.search), borderRadius: 14, background: u.field, border: `1px solid ${u.line}`, display: "flex", alignItems: "center", gap: 10, padding: "0 12px 0 16px", boxSizing: "border-box", color: u.faint }}>
          <Icon name="search" size={24} />
          <span style={{ fontSize: 28, flex: 1 }}>Search</span>
          <Kbd k="⌘K" look={look} size={22} />
        </div>
        {NAV.map(([ic, label], i) => {
          const on = i === active;
          return (
            <div key={label} style={{ ...abs(ORBIT.nav(i)), borderRadius: 14, background: on ? `${ACCENT}1F` : "transparent", display: "flex", alignItems: "center", gap: 16, paddingLeft: 22, boxSizing: "border-box", color: on ? (look === "light" ? ACCENT_DEEP : "#AFC4FF") : u.soft }}>
              <Icon name={ic} size={28} w={on ? 2.4 : 2} />
              <span style={{ fontSize: 28, fontWeight: on ? 600 : 500 }}>{label}</span>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 28, top: 686, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "linear-gradient(135deg,#FFB86B,#F0566B)" }} />
          <span style={{ fontSize: 28, fontWeight: 600 }}>You</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: ACCENT, border: `1.5px solid ${ACCENT}`, borderRadius: 8, padding: "1px 8px" }}>PRO</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 348, top: 40, fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>{page === "projects" ? "Projects" : "Settings"}</div>
      <div style={{ position: "absolute", left: 348, top: 106, fontSize: 28, color: u.soft }}>{page === "projects" ? "4 projects · all systems normal" : "Workspace preferences"}</div>

      {page === "projects" && (
        <>
          <div style={{ ...abs(ORBIT.newBtn), borderRadius: 16, background: interpolateColors(press, [0, 1], [ACCENT, ACCENT_DEEP]), color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 28, fontWeight: 600, boxShadow: `0 ${8 - press * 6}px 20px -6px ${ACCENT}AA`, transform: `scale(${1 - press * 0.04})` }}>
            <Icon name="plus" size={26} w={3} color="#FFFFFF" />
            New project
          </div>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ ...abs(ORBIT.card(i)), borderRadius: 20, background: u.card, border: `1px solid ${u.line}`, boxShadow: look === "light" ? "0 2px 10px rgba(20,30,80,0.05)" : "none", padding: "22px 24px", boxSizing: "border-box" }}>
              <div style={{ fontSize: 28, color: u.soft, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 58, fontWeight: 700, letterSpacing: -1.5, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ position: "absolute", right: 22, bottom: 22 }}>
                <Spark seed={i * 2} color={i === 0 ? ACCENT : i === 1 ? GOOD : VIOLET} />
              </div>
              <div style={{ position: "absolute", right: 24, top: 24, fontSize: 22, fontWeight: 700, color: i === 1 ? u.faint : GOOD }}>{s.delta}</div>
            </div>
          ))}
          <div style={{ position: "absolute", left: 348, top: 366, fontSize: 28, fontWeight: 600, color: u.soft }}>Recent</div>
          {rows.map((p, i) => {
            const fresh = added && added.p > 0 && i === 0 ? added.p : 0;
            const hov = Math.max(hoverRow && hoverRow[0] === i ? hoverRow[1] : 0, fresh > 0 ? 1.6 - fresh * 0.6 : 0);
            return (
              <div key={p.name} style={{ ...abs(ORBIT.row(i)), borderRadius: 16, background: hov > 0 ? `rgba(91,140,255,${0.1 * hov})` : "transparent", borderBottom: `1px solid ${u.line}`, display: "flex", alignItems: "center", boxSizing: "border-box", padding: "0 16px", opacity: fresh > 0 ? Math.min(1, fresh * 2) : 1, transform: `translateY(${fresh > 0 ? (1 - fresh) * -24 : 0}px)` }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: p.hue, color: "#FFFFFF", fontWeight: 700, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.name[0]}</div>
                <div style={{ marginLeft: 20, width: 330, fontSize: 30, fontWeight: 600 }}>{p.name}</div>
                <div style={{ flex: 1, fontSize: 28, color: u.soft }}>{p.meta}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 600, color: p.col, background: `${p.col}1F`, borderRadius: 999, padding: "6px 18px" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: p.col }} />
                  {p.status}
                </div>
              </div>
            );
          })}
        </>
      )}

      {page === "settings" &&
        SETTINGS.map((s, i) => (
          <div key={s.label} style={{ ...abs(ORBIT.setRow(i)), borderRadius: 20, background: u.card, border: `1px solid ${u.line}`, display: "flex", alignItems: "center", padding: "0 26px", boxSizing: "border-box", gap: 22 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: u.field, display: "flex", alignItems: "center", justifyContent: "center", color: u.soft }}>
              <Icon name={s.icon} size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 30, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, color: u.soft, marginTop: 2 }}>{s.desc}</div>
            </div>
            <Toggle on={toggles[i] ?? 0} look={look} />
          </div>
        ))}
      {children}
    </div>
  );
};

// Dims the app behind a dialog or palette.
const Scrim: FC<{ p: number; look: Look }> = ({ p, look }) => <div style={{ position: "absolute", inset: 0, background: UI[look].dim, opacity: p }} />;

export type DialogProps = { look?: Look; p?: number; name?: string; caret?: boolean; focus?: number; template?: number; createPress?: number };

export const NewProjectDialog: FC<DialogProps> = ({ look = "light", p = 1, name = "", caret = false, focus = 0, template = 0, createPress = 0 }) => {
  const u = UI[look];
  if (p <= 0) return null;
  return (
    <>
      <Scrim p={p} look={look} />
      <div style={{ ...abs(ORBIT.dialog), borderRadius: 26, background: u.win, boxShadow: "0 40px 90px -20px rgba(10,14,40,0.45), 0 0 0 1px rgba(0,0,0,0.06)", opacity: p, transform: `scale(${0.96 + 0.04 * p}) translateY(${(1 - p) * 14}px)` }}>
        <div style={{ position: "absolute", left: 40, top: 36, fontSize: 40, fontWeight: 700, letterSpacing: -0.8 }}>New project</div>
        <div style={{ position: "absolute", right: 34, top: 42, color: u.faint }}>
          <Icon name="x" size={30} />
        </div>
        <div style={{ position: "absolute", left: 40, top: 112, fontSize: 28, fontWeight: 600, color: u.soft }}>Name</div>
      </div>
      <div style={{ ...abs(ORBIT.nameField), opacity: p, borderRadius: 14, background: u.field, border: `2px solid ${interpolateColors(focus, [0, 1], [u.line, ACCENT])}`, boxShadow: `0 0 0 ${focus * 6}px ${ACCENT}33`, display: "flex", alignItems: "center", paddingLeft: 22, boxSizing: "border-box", fontSize: 32 }}>
        <span style={{ color: name ? u.text : u.faint, whiteSpace: "pre" }}>{name || (caret ? "" : "My new app")}</span>
        {caret && <span style={{ width: 3, height: 38, background: ACCENT, marginLeft: 2, borderRadius: 2 }} />}
      </div>
      <div style={{ position: "absolute", left: 550, top: 392, opacity: p, fontSize: 28, fontWeight: 600, color: u.soft }}>Template</div>
      {["Next.js", "Python", "Blank"].map((c, i) => (
        <div key={c} style={{ ...abs(ORBIT.chip(i)), opacity: p, borderRadius: 14, border: `2px solid ${i === template ? ACCENT : u.line}`, background: i === template ? `${ACCENT}14` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600, color: i === template ? ACCENT : u.soft }}>
          {c}
        </div>
      ))}
      <div style={{ ...abs(ORBIT.cancel), opacity: p, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600, color: u.soft }}>Cancel</div>
      <div style={{ ...abs(ORBIT.create), opacity: p, borderRadius: 14, background: interpolateColors(createPress, [0, 1], [ACCENT, ACCENT_DEEP]), transform: `scale(${1 - createPress * 0.04})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600, color: "#FFFFFF", boxShadow: `0 8px 20px -8px ${ACCENT}` }}>
        Create
      </div>
    </>
  );
};

const PALETTE_ROWS: { icon: IconName; label: string; hint: string }[] = [
  { icon: "rocket", label: "Deploy to production", hint: "⌘↵" },
  { icon: "branch", label: "Create preview branch", hint: "⌘B" },
  { icon: "chart", label: "Open insights", hint: "⌘I" },
  { icon: "gear", label: "Settings", hint: "⌘," },
];

export const CommandPalette: FC<{ look?: Look; p?: number; query?: string; caret?: boolean; selected?: number }> = ({ look = "light", p = 1, query = "", caret = false, selected = 0 }) => {
  const u = UI[look];
  if (p <= 0) return null;
  const rows = PALETTE_ROWS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase().trim()) || !query);
  return (
    <>
      <Scrim p={p} look={look} />
      <div style={{ ...abs({ ...ORBIT.palette, h: 110 + rows.length * 72 }), borderRadius: 24, background: u.win, boxShadow: "0 40px 90px -20px rgba(10,14,40,0.5), 0 0 0 1px rgba(0,0,0,0.07)", opacity: p, transform: `scale(${0.94 + 0.06 * p})`, transformOrigin: "50% 0", overflow: "hidden" }}>
        <div style={{ height: 84, display: "flex", alignItems: "center", gap: 16, padding: "0 26px", borderBottom: `1px solid ${u.line}`, fontSize: 34, color: query ? u.text : u.faint }}>
          <Icon name="search" size={30} color={u.faint} />
          <span style={{ whiteSpace: "pre" }}>{query || (caret ? "" : "Type a command…")}</span>
          {caret && <span style={{ width: 3, height: 40, background: ACCENT, marginLeft: -14, borderRadius: 2 }} />}
        </div>
        {rows.map((r, i) => (
          <div key={r.label} style={{ position: "absolute", left: 12, top: 94 + i * 72, width: 656, height: 64, borderRadius: 14, background: i === selected ? ACCENT : "transparent", color: i === selected ? "#FFFFFF" : u.text, display: "flex", alignItems: "center", gap: 18, padding: "0 18px", boxSizing: "border-box" }}>
            <Icon name={r.icon} size={28} />
            <span style={{ flex: 1, fontSize: 30, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontFamily: MONO, fontSize: 28, opacity: 0.75 }}>{r.hint}</span>
          </div>
        ))}
      </div>
    </>
  );
};

// A toast the app shows after an action ("Project created").
export const Toast: FC<{ p: number; text: string; look?: Look; ok?: boolean }> = ({ p, text, look = "light", ok = true }) => {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 40, bottom: 36, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, display: "flex", alignItems: "center", gap: 14, padding: "16px 26px 16px 18px", borderRadius: 18, background: look === "light" ? "#14161F" : "#FFFFFF", color: look === "light" ? "#FFFFFF" : "#14161F", fontSize: 28, fontWeight: 600, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.4)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, background: ok ? GOOD : BAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name={ok ? "check" : "x"} size={22} w={3} color="#FFFFFF" />
      </div>
      {text}
    </div>
  );
};

// The phone version of Orbit, in 390 × 844 design space.
export const OrbitMobile: FC<{ look?: Look }> = ({ look = "light" }) => {
  const u = UI[look];
  return (
    <div style={{ position: "absolute", inset: 0, background: look === "light" ? "#F4F6FB" : u.win, fontFamily: SANS, color: u.text }}>
      <div style={{ position: "absolute", top: 18, left: 34, fontSize: 22, fontWeight: 700 }}>9:41</div>
      <div style={{ position: "absolute", top: 70, left: 26, fontSize: 28, color: u.soft, fontWeight: 500 }}>Good morning</div>
      <div style={{ position: "absolute", top: 104, left: 26, fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>Projects</div>
      <div style={{ position: "absolute", top: 188, left: 20, right: 20, height: 190, borderRadius: 26, background: `linear-gradient(140deg, ${ACCENT}, ${VIOLET})`, color: "#FFFFFF", padding: 24, boxSizing: "border-box", boxShadow: `0 18px 36px -14px ${ACCENT}` }}>
        <div style={{ fontSize: 28, opacity: 0.85, fontWeight: 500 }}>Deploys this week</div>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, marginTop: 4 }}>128</div>
        <div style={{ position: "absolute", right: 22, bottom: 24, fontSize: 26, fontWeight: 700, background: "rgba(255,255,255,0.22)", borderRadius: 999, padding: "4px 14px" }}>↑ 24%</div>
      </div>
      {PROJECTS.slice(0, 4).map((p, i) => (
        <div key={p.name} style={{ position: "absolute", left: 20, right: 20, top: 404 + i * 92, height: 80, borderRadius: 20, background: u.card, display: "flex", alignItems: "center", padding: "0 18px", gap: 16, boxShadow: "0 2px 8px rgba(20,30,80,0.05)" }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: p.hue, color: "#FFFFFF", fontWeight: 700, fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.name[0]}</div>
          <div style={{ flex: 1, fontSize: 28, fontWeight: 600 }}>{p.name}</div>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: p.col }} />
        </div>
      ))}
      <div style={{ position: "absolute", bottom: 14, left: "50%", width: 140, height: 6, borderRadius: 3, transform: "translateX(-50%)", background: u.text, opacity: 0.8 }} />
    </div>
  );
};
