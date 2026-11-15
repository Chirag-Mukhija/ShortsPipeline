// Microphone picker with a live level meter, a red warning while the mic glitches, and a switch to hear yourself in earphones before you record.
import { useEffect, useRef, useState } from "react";
import type { Mic } from "../../record/mic";

type Props = {
  mic: Mic | null;
  devices: MediaDeviceInfo[];
  selected: string | null;
  disabled: boolean;
  error: string | null;
  onTurnOn: () => void;
  onSelect: (deviceId: string) => void;
};

const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -100);
// Meter scale: -60 dBFS at the left edge, 0 at the right.
const width = (v: number) => `${Math.max(0, Math.min(100, ((db(v) + 60) / 60) * 100))}%`;

export function MicPanel({ mic, devices, selected, disabled, error, onTurnOn, onSelect }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const peak = useRef<HTMLDivElement>(null);
  const [warning, setWarning] = useState<{ text: string; glitch: boolean } | null>(null);
  const [monitor, setMonitor] = useState(false);

  useEffect(() => {
    if (!mic) return;
    let raf = 0;
    let loudAt = performance.now();
    const draw = () => {
      const { rms, peak: p, clippedAt } = mic.level;
      if (bar.current) bar.current.style.width = width(rms * 1.4);
      if (peak.current) peak.current.style.left = width(p);
      const now = performance.now();
      // Decision: "quiet" means you've been talking for 3 s and the peaks never passed -22 dBFS.
      if (p > 0.08 || !mic.speakingRecently(500)) loudAt = now;
      // Decision: a glitch warning stays up for 3 s after the last crackle, long enough to notice between sentences.
      const next =
        now - mic.glitchAt < 3000
          ? "The mic is crackling or cutting out. Check the cable and USB port, then say a line to test."
          : now - clippedAt < 2500
            ? "Clipping. Turn the mic's gain down a little."
            : now - loudAt > 3000
              ? "Quite quiet. Move closer or turn the gain up."
              : null;
      setWarning((current) => (current?.text === next ? current : next ? { text: next, glitch: next.startsWith("The mic is crackling") } : null));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mic]);

  useEffect(() => setMonitor(mic?.monitoring ?? false), [mic]);

  if (!mic) {
    return (
      <div className="flex flex-col gap-2">
        <button onClick={onTurnOn} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink hover:brightness-110">
          Turn on the microphone
        </button>
        {error ? <p className="text-xs text-bad">{error}</p> : <p className="text-xs text-muted">Your browser will ask for permission the first time.</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <select
        value={selected ?? mic.deviceId ?? ""}
        disabled={disabled}
        onChange={(event) => onSelect(event.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none disabled:opacity-50"
      >
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || "Microphone"}
          </option>
        ))}
      </select>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface">
        <div ref={bar} className="h-full rounded-full bg-gradient-to-r from-good via-good to-warn" style={{ width: 0 }} />
        <div ref={peak} className="absolute top-0 h-full w-0.5 bg-ink/80" style={{ left: 0 }} />
        <div className="absolute top-0 h-full w-px bg-bad/70" style={{ left: "95%" }} />
      </div>
      {warning?.glitch ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-bad/40 bg-bad/10 px-2.5 py-2 text-xs text-bad">
          <span className="mt-1 size-2 shrink-0 animate-pulse rounded-full bg-bad" />
          {warning.text}
        </p>
      ) : (
        <p className={`text-xs ${warning ? "text-warn" : "text-muted"}`}>{warning?.text ?? `${mic.rate / 1000} kHz · say a sentence: the bar should reach the yellow, never the red line.`}</p>
      )}
      <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          className="mt-0.5 accent-[var(--color-accent)]"
          checked={monitor}
          onChange={(event) => {
            const on = event.target.checked;
            setMonitor(on);
            void mic.setMonitor(on);
          }}
        />
        <span>
          <span className="text-ink">Hear myself</span> in earphones. Use wired ones: speakers will howl, and Bluetooth adds a delay that makes it hard to talk.
        </span>
      </label>
    </div>
  );
}
