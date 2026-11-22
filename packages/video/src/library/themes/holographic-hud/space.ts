// Holographic HUD 2.5D math: a pinhole camera that projects floor-plane world points to the screen, so grids, pads and standing cards share one perspective.
export type Cam = { h: number; d: number; f: number; cx: number; cy: number; yaw?: number };
export type Pt = { x: number; y: number; s: number; z: number };

// World: X right, Y up, Z away from the viewer; the camera sits at (0, h, -d) looking at the origin, which lands on (cx, cy).
export const project = (cam: Cam, X: number, Y: number, Z: number): Pt => {
  const yaw = ((cam.yaw ?? 0) * Math.PI) / 180;
  const x = X * Math.cos(yaw) - Z * Math.sin(yaw);
  const z = X * Math.sin(yaw) + Z * Math.cos(yaw);
  const th = Math.atan2(cam.h, cam.d);
  const py = Y - cam.h;
  const pz = z + cam.d;
  const yc = py * Math.cos(th) + pz * Math.sin(th);
  const zc = Math.max(1, -py * Math.sin(th) + pz * Math.cos(th));
  return { x: cam.cx + (cam.f * x) / zc, y: cam.cy - (cam.f * yc) / zc, s: cam.f / zc, z: zc };
};

// A circle lying on the floor, as an SVG polygon in screen space.
export const floorRing = (cam: Cam, X: number, Z: number, r: number, n = 40) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const p = project(cam, X + Math.cos(a) * r, 0, Z + Math.sin(a) * r);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
