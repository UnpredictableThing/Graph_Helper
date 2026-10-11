import type { GraphId } from "./types";
import type { TreeLayout, TreeNode } from "./treeLayout";

const DOT_RADIUS = 4;
const DOT_RADIUS_CURRENT = 7;
const DOT_RADIUS_PARENT = 5;
const COLOR_LINE = cssVar("--border", "#2a2f3a");
const COLOR_DOT = cssVar("--text-muted", "#4a5468");
const COLOR_PARENT = cssVar("--bg-elevated", "#3f5a95");
const COLOR_CURRENT = cssVar("--accent", "#5b8def");
export interface TreeViewport {
  x: number;
  y: number;
  k: number;
}

function worldToScreen(
  wx: number,
  wy: number,
  vp: TreeViewport,
): { x: number; y: number } {
  return { x: wx * vp.k + vp.x, y: wy * vp.k + vp.y };
}

export function renderTree(
  ctx: CanvasRenderingContext2D,
  layout: TreeLayout,
  vp: TreeViewport,
  currentGraphId: GraphId | null,
  parentChain: GraphId[],
  width: number,
  height: number,
  graphColors?: Map<GraphId, string>,
) {
  ctx.clearRect(0, 0, width, height);

ctx.fillStyle = cssVar("--bg-primary", "#0e1116");
ctx.fillRect(0, 0, width, height);

  // Связи
  ctx.strokeStyle = COLOR_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const node of layout.nodes) {
    for (const child of node.children) {
      const p1 = worldToScreen(node.x, node.y, vp);
      const p2 = worldToScreen(child.x, child.y, vp);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  }
  ctx.stroke();

  // Точки
  const parentSet = new Set(parentChain.slice(0, -1));
for (const node of layout.nodes) {
  const p = worldToScreen(node.x, node.y, vp);

  // цвет из карты, или дефолтный
  const customColor = graphColors?.get(node.graphId);

  let r = DOT_RADIUS;
  let color = customColor ?? COLOR_DOT;

  if (node.graphId === currentGraphId) {
    r = DOT_RADIUS_CURRENT;
    color = customColor ?? COLOR_CURRENT;
  } else if (parentSet.has(node.graphId)) {
    r = DOT_RADIUS_PARENT;
    color = customColor
      ? darkenHex(customColor, 0.3)
      : COLOR_PARENT;
  }

  ctx.beginPath();
  ctx.arc(p.x, p.y, r * vp.k, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  // обводка для текущего
  if (node.graphId === currentGraphId) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (r + 3) * vp.k, 0, Math.PI * 2);
    ctx.stroke();
  }
}
}

/**
 * Находим узел под курсором.
 */
export function hitTestTree(
  layout: TreeLayout,
  vp: TreeViewport,
  sx: number,
  sy: number,
): TreeNode | null {
  let best: TreeNode | null = null;
  let bestDist = 12; // радиус попадания в пикселях

  for (const node of layout.nodes) {
    const p = worldToScreen(node.x, node.y, vp);
    const dx = p.x - sx;
    const dy = p.y - sy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      best = node;
    }
  }
  return best;
}
function darkenHex(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}