import type { Scene, Viewport, GraphNode } from "./types";
import { worldToScreen } from "./viewport";
import { getImage } from "./imageCache";
import { drawModuleIcon } from "./moduleIcons";
import { wrapText, FONT_SIZE, LINE_HEIGHT, propLines } from "./textMetrics";
import { catmullRom, edgeControlPoints } from "./spline";
import { drawExportIcon } from "./actionIcons";
import type { DeadlineItem } from "./types";


const PADDING = 12;
const PROPS_LINE_H = 14;
const MAX_PROPS_SHOWN = 5;
const BADGE_SIZE = 14;
const BADGE_GAP = 6;
const PREVIEW_H = 70;


const LINK_ICON_SIZE = 14;
const LINK_ICON_GAP = 6;
const LINK_ICON_COLOR = "#8892a6";

const EDGE_COLOR = "#5b8def";
const EDGE_COLOR_SELECTED = "#a0c0ff";
const EDGE_WIDTH = 1.5;
const EDGE_WIDTH_SELECTED = 3;

function darken(hex: string, amount: number = 0.4): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const dr = Math.round(r * (1 - amount));
  const dg = Math.round(g * (1 - amount));
  const db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}

export function render(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  vp: Viewport,
  selectedId: string | null,
  width: number,
  height: number,
  linkingFrom: string | null = null,
  selectedEdgeId: string | null = null,
  exportingNode: boolean = false,
  searchQuery: string = "",
  theme: "dark" | "light" = "dark",
  showGrid: boolean = true,
  selectionRect: { x1: number; y1: number; x2: number; y2: number } | null = null,
  selectedIds: string[] = [],
  selectedEdgePoint: { edgeId: string; index: number } | null = null,
  linkingFromPoint: { edgeId: string; index: number } | null = null,
  now: number = Date.now(),
) {
  const colors = theme === "dark"
  ? {
      bg: "#0f1115",
      nodeBg: "#1b1f27",
      nodeBorder: "#2a2f3a",
      nodeBorderSelected: "#5b8def",
      text: "#e6e8ee",
      textSecondary: "#8892a6",
      edge: "#5b8def",
      edgeSelected: "#a0c0ff",
      grid: "#171a20",
      tagDot: "#5b8def",
      badgeBg: "#232833",
      badgeFilled: "#5b8def",
      badgeEmpty: "#66708a",
      deadlineGreen: "#4ea76b",
      deadlineYellow: "#eab308",
      deadlineRed: "#d9534f",
      deadlineOverdue: "#000000",
    }
  : {
      bg: "#f5f6f8",
      nodeBg: "#ffffff",
      nodeBorder: "#d0d4da",
      nodeBorderSelected: "#3b6fd4",
      text: "#1a1d22",
      textSecondary: "#5a6270",
      edge: "#3b6fd4",
      edgeSelected: "#5b8def",
      grid: "#e4e7ec",
      tagDot: "#3b6fd4",
      badgeBg: "#e4e7ec",
      badgeFilled: "#3b6fd4",
      badgeEmpty: "#8892a6",
      deadlineGreen: "#2e7d4a",
      deadlineYellow: "#b8860b",
      deadlineRed: "#b83a35",
      deadlineOverdue: "#000000",
    };

  ctx.fillStyle = colors.bg;
ctx.fillRect(0, 0, width, height);

if (showGrid) {
  drawGrid(ctx, vp, width, height, colors.grid);
}

if (selectionRect) {
  const p1 = worldToScreen(
    Math.min(selectionRect.x1, selectionRect.x2),
    Math.min(selectionRect.y1, selectionRect.y2),
    vp,
  );
  const p2 = worldToScreen(
    Math.max(selectionRect.x1, selectionRect.x2),
    Math.max(selectionRect.y1, selectionRect.y2),
    vp,
  );

  ctx.fillStyle = "rgba(91,141,239,0.15)";
  ctx.strokeStyle = "rgba(91,141,239,0.8)";
  ctx.lineWidth = 1;
  ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
  ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
}

  const nodeMap = new Map<string, GraphNode>();
for (const n of scene.nodes) {
  nodeMap.set(n.id, n);
}

for (const e of scene.edges) {
    const a = nodeMap.get(e.from);
    const bNode = nodeMap.get(e.to);
    if (!a || !bNode) continue;

    let ax = a.x + a.w / 2;
    let ay = a.y + a.h / 2;

    if (e.fromEdgeId !== undefined && e.fromPointIndex !== undefined) {
      const parentEdge = scene.edges.find((pe) => pe.id === e.fromEdgeId);
      if (parentEdge && parentEdge.points && parentEdge.points[e.fromPointIndex]) {
        const pa2 = nodeMap.get(parentEdge.from);
        const pb2 = nodeMap.get(parentEdge.to);
        if (pa2 && pb2) {
          const pmx = (pa2.x + pa2.w / 2 + pb2.x + pb2.w / 2) / 2;
          const pmy = (pa2.y + pa2.h / 2 + pb2.y + pb2.h / 2) / 2;
          ax = pmx + parentEdge.points[e.fromPointIndex].x;
          ay = pmy + parentEdge.points[e.fromPointIndex].y;
        }
      }
    }

    const bx = bNode.x + bNode.w / 2;
    const by = bNode.y + bNode.h / 2;

    const pa = worldToScreen(ax, ay, vp);
    const pb = worldToScreen(bx, by, vp);

    const margin = 200;
    if (
      (pa.x < -margin && pb.x < -margin) ||
      (pa.x > width + margin && pb.x > width + margin) ||
      (pa.y < -margin && pb.y < -margin) ||
      (pa.y > height + margin && pb.y > height + margin)
    ) {
      continue;
    }

    const isSelected = e.id === selectedEdgeId;

    if (e.points && e.points.length > 0) {
      const ctrl = edgeControlPoints(ax, ay, bx, by, e.points);
      const curve = catmullRom(ctrl, 20, 0.15);

      ctx.strokeStyle = isSelected ? colors.edgeSelected : colors.edge;
      ctx.lineWidth = isSelected ? EDGE_WIDTH_SELECTED : EDGE_WIDTH;
      ctx.beginPath();
      for (let i = 0; i < curve.length; i++) {
        const p = worldToScreen(curve[i].x, curve[i].y, vp);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    } else {
      ctx.strokeStyle = isSelected ? EDGE_COLOR_SELECTED : EDGE_COLOR;
      ctx.lineWidth = isSelected ? EDGE_WIDTH_SELECTED : EDGE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    if (isSelected && e.points && e.points.length > 0) {
      const mxWorld = (ax + bx) / 2;
      const myWorld = (ay + by) / 2;

      for (let i = 0; i < e.points.length; i++) {
        const p = e.points[i];
        const pp = worldToScreen(mxWorld + p.x, myWorld + p.y, vp);

        ctx.beginPath();
        ctx.arc(pp.x, pp.y, 6 * vp.k, 0, Math.PI * 2);
        ctx.fillStyle = "#1b1f27";
        ctx.fill();
        ctx.strokeStyle = EDGE_COLOR_SELECTED;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
  if (selectedEdgePoint) {
  const edge = scene.edges.find((e) => e.id === selectedEdgePoint.edgeId);
  if (
    edge &&
    edge.fromEdgeId === undefined &&
    edge.points &&
    edge.points.length > selectedEdgePoint.index
  ) {
    const a = nodeMap.get(edge.from);
    const bNode = nodeMap.get(edge.to);
    if (a && bNode) {
      const mx = (a.x + a.w / 2 + bNode.x + bNode.w / 2) / 2;
      const my = (a.y + a.h / 2 + bNode.y + bNode.h / 2) / 2;
      const p = edge.points[selectedEdgePoint.index];
      const pp = worldToScreen(mx + p.x, my + p.y, vp);
      drawChainButton(ctx, pp.x, pp.y - 22 * vp.k, 20 * vp.k);
    }
  }
}

  const q = searchQuery.trim().toLowerCase();

const selectedSet = new Set(selectedIds);
for (const n of scene.nodes) {
  const matches =
    q.length > 0 &&
    (n.title.toLowerCase().includes(q) ||
      (n.tags ?? []).some((t) => t.toLowerCase().includes(q)));
  const isSel = n.id === selectedId || selectedSet.has(n.id);

  drawNode(ctx, n, vp, isSel, width, height, matches, colors, now);
}

  if (linkingFrom || linkingFromPoint) {
  for (const n of scene.nodes) {
    if (linkingFrom && n.id === linkingFrom) continue;
    drawLinkTargetIcon(ctx, n, vp);
  }
}

  // серые кнопки экспорта над всеми вершинами в режиме экспорта
  if (exportingNode) {
    for (const n of scene.nodes) {
      drawExportTargetButton(ctx, n, vp);
    }
  }
}

function drawLinkTargetIcon(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  vp: Viewport,
) {
  const cx = node.x + node.w / 2;
  const topY = node.y;
  const p = worldToScreen(cx, topY, vp);

  const size = LINK_ICON_SIZE * vp.k;
  const gap = LINK_ICON_GAP * vp.k;
  const y = p.y - gap - size;

  ctx.fillStyle = "#1b1f27";
  ctx.strokeStyle = "#2a2f3a";
  ctx.lineWidth = 1;
  roundRect(ctx, p.x - size / 2 - 3, y - 3, size + 6, size + 6, 4);
  ctx.fill();
  ctx.stroke();

  drawChainIcon(ctx, p.x, y + size / 2, size, LINK_ICON_COLOR);
}
const EXPORT_ICON_SIZE = 14;
const EXPORT_ICON_GAP = 6;
const EXPORT_ICON_COLOR = "#8892a6";

function drawChainButton(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  // фон-кружок
  ctx.fillStyle = "#1b1f27";
  ctx.strokeStyle = "#2a2f3a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2 + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // цепочка
  drawChainIcon(ctx, cx, cy, size, LINK_ICON_COLOR);
}

function drawExportTargetButton(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  vp: Viewport,
) {
  const cx = node.x + node.w / 2;
  const topY = node.y;
  const p = worldToScreen(cx, topY, vp);

  const size = EXPORT_ICON_SIZE * vp.k;
  const gap = EXPORT_ICON_GAP * vp.k;
  const y = p.y - gap - size;

  // фон-кнопка
  ctx.fillStyle = "#1b1f27";
  ctx.strokeStyle = "#2a2f3a";
  ctx.lineWidth = 1;
  roundRect(ctx, p.x - size / 2 - 3, y - 3, size + 6, size + 6, 4);
  ctx.fill();
  ctx.stroke();

  // иконка
  drawExportIcon(ctx, p.x - size / 2, y, size, EXPORT_ICON_COLOR);
}

function drawClock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  bgColor: string,
) {
  const r = size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.stroke();

  const inner = r * 0.62;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, size * 0.1);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - inner);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + inner * 0.7, cy);
  ctx.stroke();

  ctx.restore();
}

function drawChainIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const s = size;
  const r = s * 0.22;
  const offset = s * 0.15;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.ellipse(cx - offset, cy, r, r * 0.65, -Math.PI / 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx + offset, cy, r, r * 0.65, -Math.PI / 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  n: GraphNode,
  vp: Viewport,
  selected: boolean,
  canvasW: number,
  canvasH: number,
  matches: boolean = false,
  colors: {
  nodeBg: string;
  nodeBorder: string;
  nodeBorderSelected: string;
  text: string;
  textSecondary: string;
  tagDot: string;
  badgeBg: string;
  badgeFilled: string;
  badgeEmpty: string;
      deadlineGreen: string;
    deadlineYellow: string;
    deadlineRed: string;
    deadlineOverdue: string;
} = {
  nodeBg: "#1b1f27",
  nodeBorder: "#2a2f3a",
  nodeBorderSelected: "#5b8def",
  text: "#e6e8ee",
  textSecondary: "#8892a6",
  tagDot: "#5b8def",
  badgeBg: "#232833",
  badgeFilled: "#5b8def",
  badgeEmpty: "#66708a",
    deadlineGreen: "#4ea76b",
  deadlineYellow: "#eab308",
  deadlineRed: "#d9534f",
  deadlineOverdue: "#000000",
},
  now: number = Date.now(),
) {
  const margin = 100;
  const p = worldToScreen(n.x, n.y, vp);
  const w = n.w * vp.k;
  const h = n.h * vp.k;

  if (
    p.x + w < -margin ||
    p.x > canvasW + margin ||
    p.y + h < -margin ||
    p.y > canvasH + margin
  ) {
    return;
  }

  ctx.save();
ctx.beginPath();
roundRect(ctx, p.x, p.y, w, h, 8 * vp.k);

// Заливка
ctx.fillStyle = colors.nodeBg;
ctx.fill();

if (n.color) {
  if (selected) {
    // двойная обводка для яркости
    ctx.shadowColor = n.color;
    ctx.shadowBlur = 20 * vp.k;
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    roundRect(
      ctx,
      p.x - 2 * vp.k,
      p.y - 2 * vp.k,
      w + 4 * vp.k,
      h + 4 * vp.k,
      10 * vp.k,
    );
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.strokeStyle = n.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
} else {
  ctx.strokeStyle = selected ? colors.nodeBorderSelected : colors.nodeBorder;
  ctx.lineWidth = selected ? 2 : 1;
  ctx.stroke();
}

// Подсветка поиска
if (matches) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(
    ctx,
    p.x - 3 * vp.k,
    p.y - 3 * vp.k,
    w + 6 * vp.k,
    h + 6 * vp.k,
    10 * vp.k,
  );
  ctx.stroke();
}

ctx.restore();

  ctx.save();
  roundRect(ctx, p.x, p.y, w, h, 8 * vp.k);
  ctx.clip();

  const imageData = n.modules.includes("image")
    ? (n.data.image as { src?: string } | undefined)
    : undefined;
  const img = imageData?.src ? getImage(imageData.src) : null;

  let cursorY = p.y + PADDING * vp.k;

  if (img) {
  const pad = PADDING * vp.k;
  const boxW = w - pad * 2;
  const boxH = PREVIEW_H * vp.k;
  const imgAspect = img.width / img.height;
  const boxAspect = boxW / boxH;

  let dw = boxW;
  let dh = boxH;
  let dx = p.x + pad;
  let dy = p.y + pad;

  if (imgAspect > boxAspect) {
    dh = boxW / imgAspect;
    dy = p.y + pad + (boxH - dh) / 2;
  } else {
    dw = boxH * imgAspect;
    dx = p.x + pad + (boxW - dw) / 2;
  }

  ctx.save();
ctx.beginPath();
roundRect(ctx, dx, dy, dw, dh, 6 * vp.k);
ctx.clip();
ctx.drawImage(img, dx, dy, dw, dh);
ctx.restore();
cursorY += (PREVIEW_H + 8 + PADDING) * vp.k;
}

  const textReadable = vp.k >= 0.5;

  const textMaxW = (n.w - PADDING * 2) * vp.k;

  // ——— Заголовок ———
  const titleLines = wrapText(n.title, n.w - PADDING * 2, FONT_SIZE);
  ctx.font = `${FONT_SIZE * vp.k}px system-ui, sans-serif`;
  ctx.textBaseline = "top";

  if (textReadable) {
    ctx.fillStyle = colors.text;
    for (const line of titleLines) {
      ctx.fillText(line, p.x + PADDING * vp.k, cursorY, textMaxW);
      cursorY += LINE_HEIGHT * vp.k;
    }
  } else {
    // полосы по длине текста
    for (const line of titleLines) {
      const w = ctx.measureText(line).width;
      ctx.fillStyle = colors.text;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(
        p.x + PADDING * vp.k,
        cursorY + LINE_HEIGHT * vp.k * 0.25,
        w,
        LINE_HEIGHT * vp.k * 0.5,
      );
      ctx.globalAlpha = 1;
      cursorY += LINE_HEIGHT * vp.k;
    }
  }

  // ——— Свойства ———
  const shownProps = n.props.slice(0, MAX_PROPS_SHOWN);
  if (shownProps.length) {
    ctx.font = `${11 * vp.k}px system-ui, sans-serif`;

    for (const prop of shownProps) {
      const propLineArr = propLines(prop.key, prop.value, n.w, PADDING, 11);
      for (const line of propLineArr) {
        if (textReadable) {
          ctx.fillStyle = colors.textSecondary;
          ctx.fillText(line, p.x + PADDING * vp.k, cursorY, textMaxW);
        } else {
          const w = ctx.measureText(line).width;
          ctx.fillStyle = colors.textSecondary;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(
            p.x + PADDING * vp.k,
            cursorY + PROPS_LINE_H * vp.k * 0.25,
            w,
            PROPS_LINE_H * vp.k * 0.5,
          );
          ctx.globalAlpha = 1;
        }
        cursorY += PROPS_LINE_H * vp.k;
      }
    }
  }

  ctx.restore();

if (n.tags && n.tags.length > 0) {
  const dotRadius = 3 * vp.k;
  const dotGap = 8 * vp.k;
  const dotY = p.y + h - PADDING * vp.k - dotRadius;
  let dotX = p.x + PADDING * vp.k + dotRadius;

  const maxDots = 5;
  const shownDots = Math.min(n.tags.length, maxDots);

  for (let i = 0; i < shownDots; i++) {
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = colors.tagDot;
    ctx.fill();
    dotX += dotGap;
  }

  // если тегов больше — «+N»
  if (n.tags.length > maxDots) {
    ctx.fillStyle = "#8892a6";
    ctx.font = `${Math.max(8, 10 * vp.k)}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(`+${n.tags.length - maxDots}`, dotX + 2 * vp.k, dotY);
  }
}

  if (n.modules.length) {
  const totalW =
    n.modules.length * BADGE_SIZE * vp.k +
    (n.modules.length - 1) * BADGE_GAP * vp.k;
  let bx = p.x + w - PADDING * vp.k - totalW;
  const by = p.y + h - PADDING * vp.k - BADGE_SIZE * vp.k;

  for (const m of n.modules) {
    const filled = isModuleFilled(n, m);

    ctx.fillStyle = colors.badgeBg;
    roundRect(ctx, bx, by, BADGE_SIZE * vp.k, BADGE_SIZE * vp.k, 3 * vp.k);
    ctx.fill();

    drawModuleIcon(
  ctx,
  m,
  bx,
  by,
  BADGE_SIZE * vp.k,
  filled ? colors.badgeFilled : colors.badgeEmpty,
);

    bx += (BADGE_SIZE + BADGE_GAP) * vp.k;
  }
  if (n.modules.includes("deadline")) {
  const data = n.data.deadline as
  | { items?: DeadlineItem[] }
  | undefined;
const items = data?.items ?? [];

const visibleItems: { item: DeadlineItem; status: "green" | "yellow" | "red" | "overdue" }[] = [];

for (const item of items) {
  if (item.kind !== "once") continue;
  if (!item.confirmed) continue;

  const total = item.at - item.createdAt;
  const left = item.at - now;
  let status: "green" | "yellow" | "red" | "overdue";

  if (total <= 0 || left <= 0) status = "overdue";
  else {
    const ratio = left / total;
    if (ratio > 0.5) status = "green";
    else if (ratio > 0.25) status = "yellow";
    else status = "red";
  }

  if (status === "green" && !selected) continue;

  visibleItems.push({ item, status });
}

  if (visibleItems.length > 0) {
    const size = 16 * vp.k;
    const gap = 4 * vp.k;
    const startX = p.x + w + gap + size / 2;
    const startY = p.y + size / 2;

        for (let i = 0; i < visibleItems.length; i++) {
      const { status } = visibleItems[i];
      const color =
        status === "green"
          ? colors.deadlineGreen
          : status === "yellow"
          ? colors.deadlineYellow
          : status === "red"
          ? colors.deadlineRed
          : colors.deadlineOverdue;

      drawClock(
  ctx,
  startX,
  startY + i * (size + gap),
  size,
  color,
  colors.nodeBg,
);
    }
  }
}
}
if (n.childGraphId) {
    const triW = 18 * vp.k;   // ширина основания
    const triH = 12 * vp.k;   // высота

    const cx = p.x + w / 2;    // центр по X
    const baseY = p.y;          // верхняя грань вершины — основание тут
    const tipY = baseY - triH;  // острие НАД вершиной

    // треугольник ▲ (острие вверх, основание внизу на грани)
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx + triW / 2, baseY);
    ctx.lineTo(cx - triW / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = n.color ?? colors.badgeFilled;
    ctx.fill();

    // стрелка вниз внутри (указывает «войти»)
    const arrowSize = triH * 0.5;
    const arrowTopY = tipY + triH * 0.35;
    const triColor = n.color ?? colors.badgeFilled;
    ctx.strokeStyle = darken(triColor, 0.4);
    ctx.lineWidth = Math.max(1, 1.5 * vp.k);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(cx, arrowTopY);
    ctx.lineTo(cx, arrowTopY + arrowSize);
    ctx.moveTo(cx - arrowSize * 0.4, arrowTopY + arrowSize * 0.6);
    ctx.lineTo(cx, arrowTopY + arrowSize);
    ctx.lineTo(cx + arrowSize * 0.4, arrowTopY + arrowSize * 0.6);
    ctx.stroke();
  }
}

function isModuleFilled(node: GraphNode, moduleId: string): boolean {
  const data = node.data[moduleId] as Record<string, unknown> | undefined;
  if (!data) return false;
  return Object.values(data).some(
    (v) => v !== "" && v !== null && v !== undefined,
  );
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  w: number,
  h: number,
  gridColor: string = "#171a20",
) {
  const step = 40 * vp.k;
  if (step < 8) return;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const ox = vp.x % step;
  const oy = vp.y % step;
  ctx.beginPath();
  for (let x = ox; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = oy; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}