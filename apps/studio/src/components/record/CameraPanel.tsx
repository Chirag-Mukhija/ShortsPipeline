// Face cam picker with a live mirrored preview: turn the camera on, choose which one, and see your framing before you record.
import { useEffect, useRef } from "react";
import type { Camera } from "../../record/camera";
import { Button } from "../ui";

type Props = {
  camera: Camera | null;
  devices: MediaDeviceInfo[];
  disabled: boolean;
  error: string | null;
  recording: boolean;
  onTurnOn: () => void;
  onTurnOff: () => void;
  onSelect: (deviceId: string) => void;
};

export function CameraPanel({ camera, devices, disabled, error, recording, onTurnOn, onTurnOff, onSelect }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = camera?.stream ?? null;
  }, [camera]);

  if (!camera) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted">Record your face with the voice. Off means a voice-only take.</p>
        <Button size="sm" disabled={disabled} onClick={onTurnOn}>
          Turn on camera
        </Button>
        {error ? <p className="text-xs text-bad">{error}</p> : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className={`relative overflow-hidden rounded-lg border ${recording ? "border-bad" : "border-line"} bg-black`}>
        {/* Mirrored like a selfie camera so moving feels natural; the recording itself is not mirrored. */}
        <video ref={video} autoPlay muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
        {/* Thirds guide: keep your eyes near the top line. */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="border-[0.5px] border-white/40" />
          ))}
        </div>
        {recording ? <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-bad px-1.5 py-0.5 text-[10px] font-semibold text-white"><span className="size-1.5 animate-pulse rounded-full bg-white" />REC</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <select className="field !h-8 min-w-0 flex-1 !py-0 text-xs" value={camera.deviceId ?? ""} disabled={disabled} onChange={(event) => onSelect(event.target.value)}>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || "Camera"}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={disabled} onClick={onTurnOff}>
          Off
        </Button>
      </div>
      <p className="font-mono text-[10px] text-dim">{camera.size}</p>
    </div>
  );
}
