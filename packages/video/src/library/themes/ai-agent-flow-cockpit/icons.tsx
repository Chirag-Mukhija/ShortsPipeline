// Drawn line icons for the cockpit (sources, tools, agents, states): generic 24-unit glyphs, no product logos.
import type { FC } from "react";

export type IconName =
  | "survey" | "star" | "mail" | "ticket" | "doc" | "sheet" | "search" | "globe" | "code" | "db" | "calc"
  | "agent" | "user" | "book" | "chart" | "scan" | "send" | "plus" | "arrow" | "retry" | "bolt" | "chev"
  | "check" | "x" | "list" | "pen" | "clock";

const glyph = (name: IconName) => {
  switch (name) {
    case "survey":
      return <><rect x={5} y={4.5} width={14} height={16} rx={2} /><path d="M9 3.5h6v3H9z M8.5 11h7 M8.5 14.5h7 M8.5 18h4" /></>;
    case "star":
      return <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />;
    case "mail":
      return <><rect x={3.5} y={5.5} width={17} height={13} rx={2} /><path d="M4.2 7.2l7.8 6 7.8-6" /></>;
    case "ticket":
      return <><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z" /><path d="M10 8v8" strokeDasharray="1.6 2.2" /></>;
    case "doc":
      return <path d="M7 3.5h7l4 4V20a.6.6 0 0 1-.6.6H7.1a.6.6 0 0 1-.6-.6V4a.5.5 0 0 1 .5-.5z M14 3.5V8h4 M9.5 12h5 M9.5 15.5h5" />;
    case "sheet":
      return <><rect x={4} y={5} width={16} height={14} rx={2} /><path d="M4 10h16 M4 14.5h16 M10 5v14" /></>;
    case "search":
      return <><circle cx={11} cy={11} r={6} /><path d="M15.5 15.5L20 20" /></>;
    case "globe":
      return <><circle cx={12} cy={12} r={8.5} /><ellipse cx={12} cy={12} rx={3.8} ry={8.5} /><path d="M3.5 12h17" /></>;
    case "code":
      return <path d="M9 8l-4 4 4 4 M15 8l4 4-4 4 M13.2 6l-2.4 12" />;
    case "db":
      return <><ellipse cx={12} cy={6.5} rx={7} ry={2.8} /><path d="M5 6.5v11c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-11 M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" /></>;
    case "calc":
      return <><rect x={6} y={3.5} width={12} height={17} rx={2} /><rect x={8.5} y={6} width={7} height={3.5} rx={0.6} /><path d="M9 13h.01 M12 13h.01 M15 13h.01 M9 16.5h.01 M12 16.5h.01 M15 16.5h.01" strokeWidth={2.6} /></>;
    case "agent":
      return <><circle cx={12} cy={12.5} r={3.2} /><circle cx={5} cy={6} r={1.8} /><circle cx={19} cy={6} r={1.8} /><circle cx={12} cy={20.5} r={1.6} /><path d="M6.4 7.3l3.2 3 M17.6 7.3l-3.2 3 M12 15.7v3.2" /></>;
    case "user":
      return <><circle cx={12} cy={8.5} r={3.5} /><path d="M5 19.5c1.2-3.3 3.9-5 7-5s5.8 1.7 7 5" /></>;
    case "book":
      return <path d="M4 5.6c2.6-1 5.4-1 8 .9 2.6-1.9 5.4-1.9 8-.9v12.8c-2.6-1-5.4-1-8 .9-2.6-1.9-5.4-1.9-8-.9z M12 6.5v12.8" />;
    case "chart":
      return <path d="M5 19.5v-7 M10 19.5V6 M15 19.5v-4.5 M20 19.5V9.5" />;
    case "scan":
      return <path d="M4 8.5v-3A1.5 1.5 0 0 1 5.5 4h3 M15.5 4h3A1.5 1.5 0 0 1 20 5.5v3 M20 15.5v3a1.5 1.5 0 0 1-1.5 1.5h-3 M8.5 20h-3A1.5 1.5 0 0 1 4 18.5v-3 M8 12h8" />;
    case "send":
      return <path d="M12 19V5.5 M6.5 11L12 5.5l5.5 5.5" />;
    case "plus":
      return <path d="M12 5v14 M5 12h14" />;
    case "arrow":
      return <path d="M5 12h14 M13 6l6 6-6 6" />;
    case "retry":
      return <path d="M19.2 9A7.5 7.5 0 1 0 20 14 M19.5 4v5h-5" />;
    case "bolt":
      return <path d="M13.5 3L5.5 13.5h6L10.5 21l8-10.5h-6z" />;
    case "chev":
      return <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />;
    case "check":
      return <path d="M5 12.5l4.5 4.5L19 7.5" />;
    case "x":
      return <path d="M6.5 6.5l11 11 M17.5 6.5l-11 11" />;
    case "list":
      return <path d="M9 7h11 M9 12h11 M9 17h11 M4.5 7h.01 M4.5 12h.01 M4.5 17h.01" />;
    case "pen":
      return <path d="M4.5 19.5l1-4.2L16 4.8a1.6 1.6 0 0 1 2.3 0l.9.9a1.6 1.6 0 0 1 0 2.3L8.7 18.5z M14.2 6.6l3.2 3.2" />;
    case "clock":
      return <><circle cx={12} cy={12} r={8.5} /><path d="M12 7.5V12l3 2" /></>;
  }
};

export const Icon: FC<{ name: IconName; size?: number; color?: string; stroke?: number }> = ({ name, size = 28, color = "currentColor", stroke = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
    {glyph(name)}
  </svg>
);
