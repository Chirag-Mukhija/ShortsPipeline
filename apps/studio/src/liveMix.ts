// Plays the edit with the mix applied live in the browser: the preview's narration through a gain node, and the music bed as a second element whose volume follows the shared curve. A slider change is heard at once; only the final export writes a mixed file.
import { dbToGain, musicGainAt, speechSpansFromPeaks, type EditMix } from "@clipforge/schema";
import { useEffect, useMemo, useRef, type RefObject } from "react";

// How far the music may drift from the video before it is nudged back (seconds); smaller nudges are audible as stutter.
const DRIFT = 0.2;

// A media element can be wired into Web Audio only once, so the wiring is kept per element and the one AudioContext is shared.
const voices = new WeakMap<HTMLMediaElement, GainNode>();
let ctx: AudioContext | null = null;

type LiveMix = { src?: string; musicUrl?: string; mix?: EditMix; duration: number; waveform: number[] };

export function useLiveMix(player: RefObject<HTMLVideoElement | null>, opts: LiveMix) {
  const spans = useMemo(() => speechSpansFromPeaks(opts.waveform), [opts.waveform]);
  const live = useRef({ ...opts, spans });
  live.current = { ...opts, spans };

  useEffect(() => {
    const v = player.current;
    if (!v || !opts.src) return;
    const music = opts.musicUrl ? new Audio(opts.musicUrl) : null;
    if (music) {
      music.loop = true;
      music.preload = "auto";
    }
    let raf = 0;

    // Created on the first play, because browsers only start audio after a click.
    const voice = () => {
      ctx ??= new AudioContext();
      let gain = voices.get(v);
      if (!gain) {
        gain = ctx.createGain();
        ctx.createMediaElementSource(v).connect(gain).connect(ctx.destination);
        voices.set(v, gain);
      }
      if (ctx.state === "suspended") void ctx.resume();
      return gain;
    };
    const musicTime = (t: number) => {
      const start = live.current.mix?.musicStart ?? 0;
      const d = music?.duration ?? NaN;
      return Number.isFinite(d) && d > 0 ? (start + t) % d : start + t;
    };
    const apply = () => {
      const { mix, duration, spans } = live.current;
      if (!mix) return;
      const t = v.currentTime;
      const gain = voices.get(v);
      if (gain && ctx) gain.gain.setTargetAtTime(dbToGain(mix.voiceDb), ctx.currentTime, 0.02);
      if (music) {
        music.volume = Math.min(1, Math.max(0, musicGainAt(t, duration, mix, spans)));
        if (!v.paused && !music.seeking && Math.abs(music.currentTime - musicTime(t)) > DRIFT) music.currentTime = musicTime(t);
      }
    };
    const tick = () => {
      apply();
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      voice();
      if (music) {
        music.currentTime = musicTime(v.currentTime);
        void music.play().catch(() => {});
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      music?.pause();
      cancelAnimationFrame(raf);
    };
    const onSeeked = () => {
      if (music) music.currentTime = musicTime(v.currentTime);
      apply();
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onPause);
    v.addEventListener("seeked", onSeeked);
    if (!v.paused) onPlay();
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onPause);
      v.removeEventListener("seeked", onSeeked);
      if (music) {
        music.pause();
        music.removeAttribute("src");
        music.load();
      }
    };
  }, [player, opts.src, opts.musicUrl]);
}
