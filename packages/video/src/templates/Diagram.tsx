// Explainer diagram: nodes on a 3x5 grid, edges that draw themselves, and cue-driven reveals, highlights and data packets.
import type { DiagramEdge, DiagramNode, DiagramProps } from "@clipforge/schema";
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, colors, tones } from "../brand";
import { Glyph } from "../components/Glyph";
import { fonts } from "../fonts";
import { CLAMP, SPRING_POP, cueFrames, fitFontSize, parseTarget, pulseAt, springAt } from "../lib/anim";
import type { TemplateProps } from "./types";

type Point = { x: number; y: number };
type Placement = Point & { w: number; h: number; compact: boolean };
type Box = DiagramNode & Placement & { key: string; appear: number };
type Link = DiagramEdge & { key: string; a: Box; b: Box; appear: number };

const PACKET_FRAMES = 18;

function layoutNodes(nodes: DiagramNode[], hasTitle: boolean): Placement[] {
  const cols = nodes.map((node) => Math.min(2, Math.max(0, Math.round(node.col))));
  const rows = nodes.map((node) => Math.min(4, Math.max(0, Math.round(node.row))));
  const midCol = (Math.min(...cols) + Math.max(...cols)) / 2;
  // Decision: rows are laid out by rank, so a model that spreads two rows as 0 and 4 still gets full-size nodes.
  const distinctRows = [...new Set(rows)].sort((a, b) => a - b);
  const ranks = rows.map((row) => distinctRows.indexOf(row));
  const top = hasTitle ? 380 : 250;
  const bottom = 1100;
  const span = distinctRows.length - 1;
  const rowGap = span === 0 ? 0 : Math.min(300, (bottom - top - 150) / span);
  const compact = span > 0 && rowGap < 240;
  const centerY = (top + bottom) / 2;
  return nodes.map((node, i) => ({
    x: 540 + ((cols[i] ?? 1) - midCol) * 345,
    y: centerY + ((ranks[i] ?? 0) - span / 2) * rowGap,
    w: compact ? 280 : 262,
    h: compact ? 112 : node.icon ? 200 : 132,
    compact,
  }));
}

function borderPoint(from: Box, toward: Point, pad = 14): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return { x: from.x, y: from.y };
  const sx = dx === 0 ? Infinity : (from.w / 2 + pad) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (from.h / 2 + pad) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: from.x + dx * s, y: from.y + dy * s };
}

function edgeEnds(link: Link): { start: Point; end: Point } {
  return { start: borderPoint(link.a, link.b), end: borderPoint(link.b, link.a) };
}

function matchesEdge(link: Link, id: string): "forward" | "backward" | null {
  const from = link.a.key;
  const to = link.b.key;
  if (id === `${from}-${to}` || id === `${from}->${to}`) return "forward";
  if (id === `${to}-${from}` || id === `${to}->${from}`) return "backward";
  return null;
}

export const Diagram: FC<TemplateProps<DiagramProps>> = ({ props, cues }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const geometry = layoutNodes(props.nodes, Boolean(props.title));

  const nodeReveal = (key: string) =>
    cueFrames(cues, "reveal", (t) => (t.kind === "node" || t.kind === "other") && t.id === key)[0];

  const boxes: Box[] = props.nodes.map((node, i) => {
    const key = node.id.toLowerCase();
    const place = geometry[i] ?? { x: 540, y: 700, w: 270, h: 120, compact: false };
    return { ...node, ...place, key, appear: nodeReveal(key) ?? 4 + i * 5 };
  });
  const byKey = new Map(boxes.map((box) => [box.key, box]));

  const links: Link[] = [];
  for (const edge of props.edges) {
    const a = byKey.get(edge.from.toLowerCase());
    const b = byKey.get(edge.to.toLowerCase());
    if (!a || !b || a === b) continue;
    const draft: Link = { ...edge, key: `${a.key}-${b.key}`, a, b, appear: 0 };
    const cue = cueFrames(
      cues,
      "reveal",
      (t) => (t.kind === "edge" || t.kind === "other") && matchesEdge(draft, t.id) !== null,
    )[0];
    links.push({ ...draft, appear: cue ?? Math.max(a.appear, b.appear) + 8 });
  }

  const highlightEvents = cues
    .filter((cue) => cue.action === "highlight")
    .map((cue) => ({ frame: cue.frame, target: parseTarget(cue.target) }))
    .filter((event) => event.frame <= frame && byKey.has(event.target.id));
  const activeKey = highlightEvents[highlightEvents.length - 1]?.target.id ?? null;

  const packets = cues
    .filter((cue) => cue.action === "packet")
    .flatMap((cue) => {
      const target = parseTarget(cue.target);
      for (const link of links) {
        const direction = matchesEdge(link, target.id);
        if (direction) return [{ frame: cue.frame, link, direction }];
      }
      const fallback = links[0];
      return fallback && !cue.target ? [{ frame: cue.frame, link: fallback, direction: "forward" as const }] : [];
    });

  const titleIn = springAt(frame, fps, 0, SPRING_POP);

  return (
    <AbsoluteFill>
      {props.title ? (
        <div
          style={{
            position: "absolute",
            top: 240,
            left: 72,
            right: 72,
            textAlign: "center",
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: fitFontSize(props.title.length, 936, 70, 42, 0.55),
            whiteSpace: "nowrap",
            letterSpacing: -1.5,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * -30}px)`,
          }}
        >
          {props.title}
        </div>
      ) : null}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {links.map((link) => {
          const { start, end } = edgeEnds(link);
          const progress = interpolate(frame, [link.appear, link.appear + 12], [0, 1], {
            ...CLAMP,
            easing: Easing.out(Easing.cubic),
          });
          if (progress <= 0) return null;
          const x = start.x + (end.x - start.x) * progress;
          const y = start.y + (end.y - start.y) * progress;
          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const hot = packets.some((p) => p.link === link && frame >= p.frame && frame <= p.frame + PACKET_FRAMES);
          const stroke = hot ? colors.accent : alpha(colors.text, 0.42);
          const head = [
            end,
            { x: end.x - 28 * Math.cos(angle) + 15 * Math.sin(angle), y: end.y - 28 * Math.sin(angle) - 15 * Math.cos(angle) },
            { x: end.x - 28 * Math.cos(angle) - 15 * Math.sin(angle), y: end.y - 28 * Math.sin(angle) + 15 * Math.cos(angle) },
          ];
          return (
            <g key={link.key}>
              <line
                x1={start.x}
                y1={start.y}
                x2={x}
                y2={y}
                stroke={stroke}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={link.dashed ? "16 14" : undefined}
              />
              {progress > 0.92 ? <polygon points={head.map((p) => `${p.x},${p.y}`).join(" ")} fill={stroke} /> : null}
            </g>
          );
        })}
        {packets.map((packet, i) => {
          const t = (frame - packet.frame) / PACKET_FRAMES;
          if (t < 0 || t > 1) return null;
          const { start, end } = edgeEnds(packet.link);
          const [from, to] = packet.direction === "forward" ? [start, end] : [end, start];
          const eased = Easing.inOut(Easing.cubic)(t);
          const cx = from.x + (to.x - from.x) * eased;
          const cy = from.y + (to.y - from.y) * eased;
          return (
            <g key={`packet-${i}`}>
              <circle cx={cx} cy={cy} r={34} fill={alpha(colors.accent, 0.22)} />
              <circle cx={cx} cy={cy} r={16} fill={colors.accent} />
            </g>
          );
        })}
      </svg>
      {boxes.map((box) => {
        if (frame < box.appear) return null;
        const s = springAt(frame, fps, box.appear, SPRING_POP);
        const active = activeKey === box.key;
        const toneColor = tones[box.tone ?? "neutral"];
        const pulse = pulseAt(
          frame,
          cueFrames(cues, "pulse", (t) => t.id === box.key),
          12,
          0.1,
        );
        return (
          <div
            key={box.key}
            style={{
              position: "absolute",
              left: box.x - box.w / 2,
              top: box.y - box.h / 2,
              width: box.w,
              height: box.h,
              borderRadius: 30,
              background: active ? alpha(colors.accent, 0.16) : colors.surface,
              border: `4px solid ${active ? colors.accent : alpha(box.tone ? toneColor : colors.muted, 0.6)}`,
              boxShadow: active ? `0 0 70px ${alpha(colors.accent, 0.45)}` : "0 22px 50px rgba(0,0,0,0.45)",
              transform: `scale(${(0.5 + 0.5 * s) * pulse * (active ? 1.06 : 1)})`,
              opacity: Math.min(1, s * 1.5),
              display: "flex",
              flexDirection: box.compact ? "row" : "column",
              alignItems: "center",
              justifyContent: "center",
              gap: box.compact ? 16 : 12,
              padding: box.compact ? "0 20px" : 16,
            }}
          >
            {box.icon ? (
              <Glyph
                icon={box.icon}
                size={box.compact ? 56 : 84}
                color={active ? colors.accent : box.tone ? toneColor : colors.text}
              />
            ) : null}
            <div
              style={{
                fontFamily: fonts.body,
                fontWeight: 700,
                fontSize: box.compact ? 33 : 38,
                lineHeight: 1.1,
                textAlign: box.compact && box.icon ? "left" : "center",
                color: colors.text,
              }}
            >
              {box.label}
            </div>
          </div>
        );
      })}
      {links.map((link) => {
        if (!link.label || frame < link.appear + 8) return null;
        const { start, end } = edgeEnds(link);
        const show = springAt(frame, fps, link.appear + 8, SPRING_POP);
        const horizontal = Math.abs(end.y - start.y) < 24;
        const labelY = horizontal
          ? Math.min(link.a.y - link.a.h / 2, link.b.y - link.b.h / 2) - 34
          : (start.y + end.y) / 2;
        return (
          <div
            key={`label-${link.key}`}
            style={{
              position: "absolute",
              left: (start.x + end.x) / 2,
              top: labelY,
              transform: `translate(-50%, -50%) scale(${show})`,
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: 28,
              color: colors.text,
              background: colors.surfaceHigh,
              border: `2px solid ${colors.line}`,
              padding: "6px 16px",
              borderRadius: 999,
              whiteSpace: "nowrap",
            }}
          >
            {link.label}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
