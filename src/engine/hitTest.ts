import type { GraphNode, GraphEdge } from "./types";
import { catmullRom, edgeControlPoints } from "./spline";

export function hitNode(
  nodes: GraphNode[],
  wx: number,
  wy: number,
): GraphNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) {
      return n;
    }
  }
  return null;
}

/**
 * Hit-test связи. Если у связи есть точки изгиба — проверяет расстояние
 * до сплайна. Если нет — до прямой.
 */
export function hitEdge(
  nodes: GraphNode[],
  edges: GraphEdge[],
  wx: number,
  wy: number,
  tolerance: number = 8,
): string | null {
  let bestEdge: string | null = null;
  let bestDist = tolerance;

  for (const e of edges) {
  const a = nodes.find((n) => n.id === e.from);
  const b = nodes.find((n) => n.id === e.to);
  if (!a || !b) continue;

  let ax = a.x + a.w / 2;
  let ay = a.y + a.h / 2;

  if (e.fromEdgeId !== undefined && e.fromPointIndex !== undefined) {
    const parentEdge = edges.find((pe) => pe.id === e.fromEdgeId);
    if (parentEdge && parentEdge.points && parentEdge.points[e.fromPointIndex]) {
      const pa = nodes.find((n) => n.id === parentEdge.from);
      const pb = nodes.find((n) => n.id === parentEdge.to);
      if (pa && pb) {
        const pmx = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2;
        const pmy = (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2;
        ax = pmx + parentEdge.points[e.fromPointIndex].x;
        ay = pmy + parentEdge.points[e.fromPointIndex].y;
      }
    }
  }

  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;

  let d: number;

  if (e.points && e.points.length > 0) {
      const ctrl = edgeControlPoints(ax, ay, bx, by, e.points);
      const curve = catmullRom(ctrl, 20, 0.15);
      d = pointToPolylineDistance(wx, wy, curve);
    } else {
      d = pointToSegmentDistance(wx, wy, ax, ay, bx, by);
    }

    if (d < bestDist) {
      bestDist = d;
      bestEdge = e.id;
    }
  }

  return bestEdge;
}


export function hitEdgePoint(
  nodes: GraphNode[],
  edges: GraphEdge[],
  edge: GraphEdge,
  wx: number,
  wy: number,
  tolerance: number = 10,
): { index: number; point: { x: number; y: number } } | null {
  if (!edge.points || edge.points.length === 0) return null;

  const a = nodes.find((n) => n.id === edge.from);
  const b = nodes.find((n) => n.id === edge.to);
  if (!a || !b) return null;

  let ax = a.x + a.w / 2;
  let ay = a.y + a.h / 2;

  if (edge.fromEdgeId !== undefined && edge.fromPointIndex !== undefined) {
    const parentEdge = edges.find((pe) => pe.id === edge.fromEdgeId);
    if (parentEdge && parentEdge.points && parentEdge.points[edge.fromPointIndex]) {
      const pa = nodes.find((n) => n.id === parentEdge.from);
      const pb = nodes.find((n) => n.id === parentEdge.to);
      if (pa && pb) {
        const pmx = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2;
        const pmy = (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2;
        ax = pmx + parentEdge.points[edge.fromPointIndex].x;
        ay = pmy + parentEdge.points[edge.fromPointIndex].y;
      }
    }
  }

  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;

  for (let i = 0; i < edge.points.length; i++) {
    const p = edge.points[i];
    const px = mx + p.x;
    const py = my + p.y;
    const d = Math.hypot(px - wx, py - wy);
    if (d < tolerance) {
      return { index: i, point: { x: px, y: py } };
    }
  }

  return null;
}

export function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
}

function pointToPolylineDistance(
  px: number,
  py: number,
  points: { x: number; y: number }[],
): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = pointToSegmentDistance(px, py, a.x, a.y, b.x, b.y);
    if (d < best) best = d;
  }
  return best;
}
export function hitChainButton(
  nodes: GraphNode[],
  edge: GraphEdge,
  wx: number,
  wy: number,
  offsetPx: number = 22,
  sizePx: number = 20,
): boolean {
  if (!edge.points || edge.points.length === 0) return false;

  const a = nodes.find((n) => n.id === edge.from);
  const b = nodes.find((n) => n.id === edge.to);
  if (!a || !b) return false;

  // для каждой точки проверяем попадание в иконку под ней
  for (const p of edge.points) {
    const mx = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
    const my = (a.y + a.h / 2 + b.y + b.h / 2) / 2;
    const pointX = mx + p.x;
    const pointY = my + p.y;

    // иконка над точкой (offset вверх)
    const btnX = pointX;
    const btnY = pointY - offsetPx;
const radius = sizePx / 2 + 4;

    const d = Math.hypot(wx - btnX, wy - btnY);
    if (d <= radius) return true;
  }
  return false;
}