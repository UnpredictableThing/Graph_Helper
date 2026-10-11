import type { Viewport } from "./types";

export function screenToWorld(
  sx: number,
  sy: number,
  vp: Viewport,
): { x: number; y: number } {
  return { x: (sx - vp.x) / vp.k, y: (sy - vp.y) / vp.k };
}

export function worldToScreen(
  wx: number,
  wy: number,
  vp: Viewport,
): { x: number; y: number } {
  return { x: wx * vp.k + vp.x, y: wy * vp.k + vp.y };
}

export function zoomAt(
  vp: Viewport,
  sx: number,
  sy: number,
  factor: number,
  min = 0.1,
  max = 4,
): Viewport {
  const k = Math.min(max, Math.max(min, vp.k * factor));
  const world = screenToWorld(sx, sy, vp);
  return {
    k,
    x: sx - world.x * k,
    y: sy - world.y * k,
  };
}