import { useEffect, useRef, useState } from "react";
import { useGraph } from "../store/graphStore";
import { render } from "../engine/renderer";
import { hitNode, hitEdge, hitEdgePoint, pointToSegmentDistance, hitChainButton } from "../engine/hitTest";
import { screenToWorld, zoomAt } from "../engine/viewport";
import { setImageCacheListener } from "../engine/imageCache";
import NodeToolbar from "./NodeToolbar";
import EdgeToolbar from "./EdgeToolbar";
import PaletteIndicator from "./PaletteIndicator";
import PasteIndicator from "./PasteIndicator";


type Mode =
  | { kind: "idle" }
  | { kind: "pan"; startX: number; startY: number; vx: number; vy: number }
  | { kind: "selecting"; startWorldX: number; startWorldY: number; currentWorldX: number; currentWorldY: number; additive: boolean }
  | { kind: "drag-wait"; id: string; dx: number; dy: number; startX: number; startY: number }
  | { kind: "drag"; id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean }
  | { kind: "connect"; from: string }
  | { kind: "edge-wait"; edgeId: string; startX: number; startY: number; worldX: number; worldY: number }
  | { kind: "edge-drag"; edgeId: string; index: number; dx: number; dy: number }
  | { kind: "pinch"; startDist: number; startK: number; startMidX: number; startMidY: number; startVpX: number; startVpY: number }
  | { kind: "drag-multi"; startWorldX: number; startWorldY: number; initial: Array<{ id: string; x: number; y: number }> };

const DEFAULT_VIEWPORT = { x: 0, y: 0, k: 1 };
const EMPTY_NODES: never[] = [];
const EMPTY_EDGES: never[] = [];
const GRID_SIZE = 40;
const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

export default function Canvas() {
  const now = useGraph((s) => s.now);
  const linkingFromPoint = useGraph((s) => s.linkingFromPoint);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mode = useRef<Mode>({ kind: "idle" });
  const tapRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    moved: boolean;
  } | null>(null);
  const lastEmptyTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const clickTimerRef = useRef<number | null>(null);
  const justFinishedRectRef = useRef(false);
  const [, force] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [selectionRect, setSelectionRect] = useState<
  { x1: number; y1: number; x2: number; y2: number } | null
>(null);


  const currentGraphId = useGraph((s) => s.currentGraphId);
  const graph = useGraph((s) =>
    s.currentGraphId ? s.graphs[s.currentGraphId] : undefined,
  );
  const selectedId = useGraph((s) => s.selectedId);
  const selectedIds = useGraph((s) => s.selectedIds);
  const selectedEdgeId = useGraph((s) => s.selectedEdgeId);
  const selectedEdgePoint = useGraph((s) => s.selectedEdgePoint);
  const linkingFrom = useGraph((s) => s.linkingFrom);
  const exportingNode = useGraph((s) => s.exportingNode);
  const searchQuery = useGraph((s) => s.searchQuery);
  const theme = useGraph((s) => s.settings.theme);
  const showGrid = useGraph((s) => s.settings.showGrid);
  const moveNode = useGraph((s) => s.moveNode);
  const addEdge = useGraph((s) => s.addEdge);
  const setViewport = useGraph((s) => s.setViewport);
  const select = useGraph((s) => s.select);

  const nodes = graph?.nodes ?? EMPTY_NODES;
  const edges = graph?.edges ?? EMPTY_EDGES;
  const viewport = graph?.viewport ?? DEFAULT_VIEWPORT;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    setImageCacheListener(() => force((v) => v + 1));
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(
  ctx,
  { nodes, edges },
  viewport,
  selectedId,
  w,
  h,
  linkingFrom,
  selectedEdgeId,
  exportingNode,
  searchQuery,
  theme,
  showGrid,
  selectionRect,
  selectedIds,
  selectedEdgePoint,
  linkingFromPoint,
  now,
);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [graph, selectedId, selectedIds, currentGraphId, linkingFrom, selectedEdgeId, exportingNode, searchQuery, theme, showGrid, selectionRect, selectedEdgePoint, now]);

  useEffect(() => {
  if (!selectedId) return;

  // ждём — вдруг пользователь перетаскивает
  const timer = setTimeout(() => {
    const m = mode.current;
  if (m.kind === "edge-drag") return;
  if (m.kind === "edge-wait") return;
  if (m.kind === "selecting") return;
  if (m.kind === "drag" && m.moved) return;

  const node = nodes.find((n) => n.id === selectedId);
  if (!node) return;

    const state = useGraph.getState();
    const panelOpen = state.panelOpen;
    const isPortrait = window.innerWidth < window.innerHeight;

    const sheetH =
      isPortrait && panelOpen ? window.innerHeight * 0.4 : 0;
    const panelW = !isPortrait && panelOpen ? 280 : 0;

    const safeW = size.w - panelW;
    const safeH = size.h - sheetH;

    const currentGraph = state.getCurrentGraph();
    if (!currentGraph) return;
    const vp = currentGraph.viewport;

    const nodeLeft = node.x * vp.k + vp.x;
const nodeTop = node.y * vp.k + vp.y;
const nodeRight = (node.x + node.w) * vp.k + vp.x;
const nodeBottom = (node.y + node.h) * vp.k + vp.y;

// жёстко по границам: шторка = нижние 40vh, панель = правые 280px
const overflowRight = nodeRight > safeW;
const overflowLeft = nodeLeft < 0;
const overflowBottom = nodeBottom > safeH;
const overflowTop = nodeTop < 0;

if (!overflowRight && !overflowLeft && !overflowBottom && !overflowTop) {
  dragStartPosRef.current = null;
  return;
}

    // иначе — центрируем на вершине (с учётом safe-зоны)
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;

    const OFFSET_Y = 100;
setViewport({
  k: vp.k,
  x: safeW / 2 - cx * vp.k,
  y: safeH / 2 + OFFSET_Y - cy * vp.k,
});
    dragStartPosRef.current = null;
  }, 80);

  return () => clearTimeout(timer);
}, [selectedId, size.w, size.h]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useGraph.getState().cancelLinking();
        useGraph.getState().cancelExportNode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const getMouse = (e: React.MouseEvent | React.WheelEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const getNodeCenter = (nodeId: string) => {
    const n = nodes.find((x) => x.id === nodeId);
    if (!n) return null;
    return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
  };

  const startInteraction = (
  sx: number,
  sy: number,
  isTouch: boolean,
  opts: { alt: boolean; shift: boolean; middle: boolean } = {
    alt: false,
    shift: false,
    middle: false,
  },
) => {
    const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
    const world = screenToWorld(sx, sy, viewport);
const selectedEdgePoint = useGraph.getState().selectedEdgePoint;
if (selectedEdgePoint) {
  const parentEdge = edges.find((e) => e.id === selectedEdgePoint.edgeId);
  if (
    parentEdge &&
    parentEdge.fromEdgeId === undefined &&
    hitChainButton(nodes, parentEdge, world.x, world.y)
  ) {
    useGraph.getState().startLinkingFromPoint(selectedEdgePoint.edgeId, selectedEdgePoint.index);
    mode.current = { kind: "idle" };
    return;
  }
}

if (selectedEdgeId) {
  const edge = edges.find((ed) => ed.id === selectedEdgeId);
  if (edge) {
    const tol = (isTouch ? 15 : 10) / viewport.k;
    const hit = hitEdgePoint(nodes, edges, edge, world.x, world.y, tol);
    if (hit) {
  useGraph.getState().disarmRectMode();
  useGraph.getState().selectEdgePoint({ edgeId: edge.id, index: hit.index });
  mode.current = {
    kind: "edge-drag",
    edgeId: edge.id,
    index: hit.index,
    dx: world.x - hit.point.x,
    dy: world.y - hit.point.y,
  };
  return;
}
  }
}

    const node = hitNode(nodes, world.x, world.y);


if (node) {
  const state = useGraph.getState();
  const selectedIds = state.selectedIds;

  // если вершина уже в группе и группа > 1 — перетаскиваем всю группу
  if (selectedIds.length > 1 && selectedIds.includes(node.id) && !opts.shift) {
    const graph = state.getCurrentGraph();
    if (graph) {
      const initial = graph.nodes
        .filter((n) => selectedIds.includes(n.id))
        .map((n) => ({ id: n.id, x: n.x, y: n.y }));

      state.snapshot();
      useGraph.getState().disarmRectMode();

      dragStartPosRef.current = { x: node.x, y: node.y };

      mode.current = {
        kind: "drag-multi",
        startWorldX: world.x,
        startWorldY: world.y,
        initial,
      };
      return;
    }
  }

  useGraph.getState().disarmRectMode();
  mode.current = {
  kind: "drag",
  id: node.id,
  dx: world.x - node.x,
  dy: world.y - node.y,
  startX: sx,
  startY: sy,
  moved: false,
};
  select(node.id);
  return;
}

    const tol = (isTouch ? 15 : 8) / viewport.k;
    const edgeId = hitEdge(nodes, edges, world.x, world.y, tol);
    if (edgeId) {
  useGraph.getState().disarmRectMode();
  useGraph.getState().selectEdge(edgeId);
  mode.current = {
    kind: "edge-wait",
    edgeId,
    startX: sx,
    startY: sy,
    worldX: world.x,
    worldY: world.y,
  };
  return;
}

if (exportingNode) useGraph.getState().cancelExportNode();
if (linkingFrom) useGraph.getState().cancelLinking();


if (isTouch && useGraph.getState().rectModeArmed) {
  useGraph.getState().disarmRectMode();
  mode.current = {
    kind: "selecting",
    startWorldX: world.x,
    startWorldY: world.y,
    currentWorldX: world.x,
    currentWorldY: world.y,
    additive: false,
  };
  setSelectionRect({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
  return;
}

if (isTouch) {
  useGraph.getState().disarmRectMode();
}

const pending = useGraph.getState().pendingRectStart;

const wantPan = opts.middle || opts.alt || isTouch;

if (wantPan) {
  mode.current = {
    kind: "pan",
    startX: sx,
    startY: sy,
    vx: viewport.x,
    vy: viewport.y,
  };
} else if (pending) {
  // зажатие после клика → старт рамки
  useGraph.getState().setPendingRectStart(null);
  mode.current = {
    kind: "selecting",
    startWorldX: pending.x,
    startWorldY: pending.y,
    currentWorldX: world.x,
    currentWorldY: world.y,
    additive: opts.shift,
  };
  setSelectionRect({
    x1: pending.x,
    y1: pending.y,
    x2: world.x,
    y2: world.y,
  });
} else {
  mode.current = { kind: "idle" };
}
  };

const moveInteraction = (sx: number, sy: number) => {
    const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
    const m = mode.current;

    if (m.kind === "pan") {
      setViewport({
        ...viewport,
        x: m.vx + (sx - m.startX),
        y: m.vy + (sy - m.startY),
      });
      return;
    }
    if (m.kind === "selecting") {
  const world = screenToWorld(sx, sy, viewport);
  m.currentWorldX = world.x;
  m.currentWorldY = world.y;
  setSelectionRect({
    x1: m.startWorldX,
    y1: m.startWorldY,
    x2: world.x,
    y2: world.y,
  });
  return;
}

    if (m.kind === "drag-wait") {
  const dist = Math.hypot(sx - m.startX, sy - m.startY);
  if (dist > 3) {
    mode.current = {
      kind: "drag",
      id: m.id,
      dx: m.dx,
      dy: m.dy,
      startX: m.startX,
      startY: m.startY,
      moved: true,
    };
    const world = screenToWorld(sx, sy, viewport);
    const snapOn = useGraph.getState().settings.snapToGrid;
    const nx = snapOn ? snap(world.x - m.dx) : world.x - m.dx;
    const ny = snapOn ? snap(world.y - m.dy) : world.y - m.dy;
    moveNode(m.id, nx, ny);
  }
  return;
}

if (m.kind === "drag") {
  const dist = Math.hypot(sx - m.startX, sy - m.startY);
  if (dist > 3) m.moved = true;
  if (!m.moved) return;

  const world = screenToWorld(sx, sy, viewport);
  const snapOn = useGraph.getState().settings.snapToGrid;
  const nx = snapOn ? snap(world.x - m.dx) : world.x - m.dx;
  const ny = snapOn ? snap(world.y - m.dy) : world.y - m.dy;
  moveNode(m.id, nx, ny);
  return;
}

if (m.kind === "drag-multi") {
  const world = screenToWorld(sx, sy, viewport);
  const dx = world.x - m.startWorldX;
  const dy = world.y - m.startWorldY;

  const snapOn = useGraph.getState().settings.snapToGrid;
  const updates = m.initial.map((init) => {
    const rawX = init.x + dx;
    const rawY = init.y + dy;
    return {
      id: init.id,
      x: snapOn ? snap(rawX) : rawX,
      y: snapOn ? snap(rawY) : rawY,
    };
  });
  useGraph.getState().moveNodes(updates);
  return;
}

    if (m.kind === "edge-wait") {
  const dist = Math.hypot(sx - m.startX, sy - m.startY);
  if (dist > 5) {
    const edge = edges.find((ed) => ed.id === m.edgeId);
    if (edge) {
      const cB = getNodeCenter(edge.to);
if (cB) {
  let cAx = 0;
  let cAy = 0;
  const aNode = nodes.find((n) => n.id === edge.from);
  if (aNode) {
    cAx = aNode.x + aNode.w / 2;
    cAy = aNode.y + aNode.h / 2;
  }
  if (edge.fromEdgeId !== undefined && edge.fromPointIndex !== undefined) {
    const parentEdge = edges.find((pe) => pe.id === edge.fromEdgeId);
    if (parentEdge && parentEdge.points && parentEdge.points[edge.fromPointIndex]) {
      const pa = nodes.find((n) => n.id === parentEdge.from);
      const pb = nodes.find((n) => n.id === parentEdge.to);
      if (pa && pb) {
        const pmx = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2;
        const pmy = (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2;
        cAx = pmx + parentEdge.points[edge.fromPointIndex].x;
        cAy = pmy + parentEdge.points[edge.fromPointIndex].y;
      }
    }
  }
  const mx = (cAx + cB.x) / 2;
  const my = (cAy + cB.y) / 2;

        const existing = edge.points ?? [];
        const existingWorld = existing.map((p) => ({
          x: mx + p.x,
          y: my + p.y,
        }));
        const anchors = [{ x: cAx, y: cAy }, ...existingWorld, cB];

        // ближайший сегмент к месту клика
        let bestSegIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < anchors.length - 1; i++) {
          const s1 = anchors[i];
          const s2 = anchors[i + 1];
          const d = pointToSegmentDistance(
            m.worldX,
            m.worldY,
            s1.x,
            s1.y,
            s2.x,
            s2.y,
          );
          if (d < bestDist) {
            bestDist = d;
            bestSegIdx = i;
          }
        }

        const insertIndex = Math.min(bestSegIdx, existing.length);

        // проекция клика на ближайший сегмент
        const s1 = anchors[bestSegIdx];
        const s2 = anchors[bestSegIdx + 1];
        const sdx = s2.x - s1.x;
        const sdy = s2.y - s1.y;
        const slen2 = sdx * sdx + sdy * sdy;
        let t = 0;
        if (slen2 > 0) {
          t =
            ((m.worldX - s1.x) * sdx + (m.worldY - s1.y) * sdy) / slen2;
          t = Math.max(0, Math.min(1, t));
        }
        const projX = s1.x + sdx * t;
        const projY = s1.y + sdy * t;

        const offset = { x: projX - mx, y: projY - my };
        useGraph.getState().addEdgePoint(m.edgeId, offset, insertIndex);

        const world = screenToWorld(sx, sy, viewport);
        mode.current = {
          kind: "edge-drag",
          edgeId: m.edgeId,
          index: insertIndex,
          dx: world.x - projX,
          dy: world.y - projY,
        };
      }
    }
  }
  return;
}

    if (m.kind === "edge-drag") {
      const edge = edges.find((ed) => ed.id === m.edgeId);
      if (!edge) return;
      const cB = getNodeCenter(edge.to);
if (!cB) return;
let cAx = 0;
let cAy = 0;
const aNode = nodes.find((n) => n.id === edge.from);
if (aNode) {
  cAx = aNode.x + aNode.w / 2;
  cAy = aNode.y + aNode.h / 2;
}
if (edge.fromEdgeId !== undefined && edge.fromPointIndex !== undefined) {
  const parentEdge = edges.find((pe) => pe.id === edge.fromEdgeId);
  if (parentEdge && parentEdge.points && parentEdge.points[edge.fromPointIndex]) {
    const pa = nodes.find((n) => n.id === parentEdge.from);
    const pb = nodes.find((n) => n.id === parentEdge.to);
    if (pa && pb) {
      const pmx = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2;
      const pmy = (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2;
      cAx = pmx + parentEdge.points[edge.fromPointIndex].x;
      cAy = pmy + parentEdge.points[edge.fromPointIndex].y;
    }
  }
}
const mx = (cAx + cB.x) / 2;
const my = (cAy + cB.y) / 2;
      const world = screenToWorld(sx, sy, viewport);
      useGraph.getState().moveEdgePoint(m.edgeId, m.index, {
        x: world.x - m.dx - mx,
        y: world.y - m.dy - my,
      });
      return;
    }
  };

  // ——— Мышь ———

  const onMouseDown = (e: React.MouseEvent) => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
  }
  if (e.button !== 0 && e.button !== 1) return;
  const { sx, sy } = getMouse(e);
  startInteraction(sx, sy, false, {
    alt: e.altKey,
    shift: e.shiftKey,
    middle: e.button === 1,
  });
};

  const onMouseMove = (e: React.MouseEvent) => {
  // если кнопка не нажата, а мы в drag/pan/выделении — значит mouseup потерялся
  const m = mode.current;
  if (
    e.buttons === 0 &&
    m.kind !== "idle"
  ) {
    mode.current = { kind: "idle" };
    setSelectionRect(null);
    return;
  }

  const { sx, sy } = getMouse(e);
  moveInteraction(sx, sy);
};

  const onMouseUp = (e: React.MouseEvent) => {
  const m = mode.current;

  if (m.kind === "connect") {
    const { sx, sy } = getMouse(e);
    const world = screenToWorld(sx, sy, viewport);
    const target = hitNode(nodes, world.x, world.y);
    if (target) addEdge(m.from, target.id);
  }

  if (m.kind === "selecting") {
    const x1 = Math.min(m.startWorldX, m.currentWorldX);
    const y1 = Math.min(m.startWorldY, m.currentWorldY);
    const x2 = Math.max(m.startWorldX, m.currentWorldX);
    const y2 = Math.max(m.startWorldY, m.currentWorldY);

    if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
      const hits = nodes.filter(
        (n) =>
          n.x + n.w >= x1 &&
          n.x <= x2 &&
          n.y + n.h >= y1 &&
          n.y <= y2,
      );
      const ids = hits.map((n) => n.id);
      useGraph.getState().selectMultiple(ids, m.additive);
    }
    justFinishedRectRef.current = true;
setTimeout(() => {
  justFinishedRectRef.current = false;
}, 300);

    setSelectionRect(null);
    mode.current = { kind: "idle" };
    return;
  }

if (m.kind === "pan" || m.kind === "idle") {
  const { sx, sy } = getMouse(e);
  const moved =
    m.kind === "pan"
      ? Math.hypot(sx - m.startX, sy - m.startY)
      : 0;

  if (moved < 5) {
    const world = screenToWorld(sx, sy, viewport);
    const node = hitNode(nodes, world.x, world.y);
    const edgeId = hitEdge(nodes, edges, world.x, world.y, 8 / viewport.k);

    if (!node && !edgeId) {
      useGraph.getState().clearSelection();
      useGraph.getState().selectEdge(null);
      useGraph.getState().selectEdgePoint(null);
      useGraph.getState().setPendingRectStart({ x: world.x, y: world.y });

      if (clickTimerRef.current !== null) {
        clearTimeout(clickTimerRef.current);
      }
      clickTimerRef.current = window.setTimeout(() => {
        useGraph.getState().setPendingRectStart(null);
        clickTimerRef.current = null;
      }, 150);
    }
  }
}

  mode.current = { kind: "idle" };
};

useEffect(() => {
  return () => {
    if (clickTimerRef.current !== null) {
      clearTimeout(clickTimerRef.current);
    }
  };
}, []);

  const onDoubleClick = (e: React.MouseEvent) => {
  const paletteActive = useGraph.getState().paletteActive;
  const pasteActive = useGraph.getState().pasteActive;

  useGraph.getState().setPendingRectStart(null);
  if (clickTimerRef.current !== null) {
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
  }

  const { sx, sy } = getMouse(e);
  const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
  const world = screenToWorld(sx, sy, viewport);

  if (pasteActive) {
    if (hitNode(nodes, world.x, world.y)) return;
    const edgeId = hitEdge(nodes, edges, world.x, world.y, 8 / viewport.k);
    if (edgeId) return;

    justFinishedRectRef.current = false;
    setSelectionRect(null);
    mode.current = { kind: "idle" };
    useGraph.getState().pasteAt(world.x, world.y);
    return;
  }

  if (paletteActive) {
    if (hitNode(nodes, world.x, world.y)) return;
    const edgeId = hitEdge(nodes, edges, world.x, world.y, 8 / viewport.k);
    if (edgeId) return;

    justFinishedRectRef.current = false;  // сброс, чтобы не залипало
    setSelectionRect(null);
    mode.current = { kind: "idle" };
    useGraph.getState().spawnPaletteNodes(world.x, world.y);
    return;
  }

  if (justFinishedRectRef.current) return;

  // удаление точки изгиба
  if (selectedEdgeId) {
    const edge = edges.find((ed) => ed.id === selectedEdgeId);
    if (edge) {
      const hit = hitEdgePoint(nodes, edges, edge, world.x, world.y, 10 / viewport.k);
      if (hit) {
        useGraph.getState().removeEdgePoint(edge.id, hit.index);
        return;
      }
    }
  }

  // двойной клик по вершине/связи — игнор (Q6)
  if (hitNode(nodes, world.x, world.y)) return;
  const edgeId = hitEdge(nodes, edges, world.x, world.y, 8 / viewport.k);
  if (edgeId) return;

  // вне режима — ничего (Q1 = B)
};

  const onWheel = (e: React.WheelEvent) => {
  const { sx, sy } = getMouse(e);
  const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  setViewport(zoomAt(viewport, sx, sy, factor));
};

  const onClick = (e: React.MouseEvent) => {
    if (exportingNode) {
      const { sx, sy } = getMouse(e);
      const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
      const world = screenToWorld(sx, sy, viewport);
      const target = hitNode(nodes, world.x, world.y);
      if (target) useGraph.getState().completeExportNode(target.id);
      return;
    }

    if (!linkingFrom && !useGraph.getState().linkingFromPoint) return;
const { sx, sy } = getMouse(e);
const world = screenToWorld(sx, sy, viewport);
const target = hitNode(nodes, world.x, world.y);
if (!target) return;
if (linkingFrom && target.id === linkingFrom) return;

useGraph.getState().completeLinking(target.id, e.shiftKey);
  };

  // ——— Тач ———

  const touchToScreen = (touch: React.Touch) => {
    const r = ref.current!.getBoundingClientRect();
    return { sx: touch.clientX - r.left, sy: touch.clientY - r.top };
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      tapRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startTime: Date.now(),
        moved: false,
      };
    }

    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const r = ref.current!.getBoundingClientRect();
      const midX = (t0.clientX + t1.clientX) / 2 - r.left;
      const midY = (t0.clientY + t1.clientY) / 2 - r.top;

      useGraph.getState().disarmRectMode();
      setSelectionRect(null);

      mode.current = {
        kind: "pinch",
        startDist: dist,
        startK: viewport.k,
        startMidX: midX,
        startMidY: midY,
        startVpX: viewport.x,
        startVpY: viewport.y,
      };
      return;
    }

    if (e.touches.length === 1) {
  const { sx, sy } = touchToScreen(e.touches[0]);
  startInteraction(sx, sy, true, {
    alt: false,
    shift: false,
    middle: false,
  });
}
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

      if (
    e.touches.length === 0 &&
    mode.current.kind !== "idle"
  ) {
    mode.current = { kind: "idle" };
    setSelectionRect(null);
    return;
  }

    if (tapRef.current && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - tapRef.current.startX;
      const dy = t.clientY - tapRef.current.startY;
      if (Math.hypot(dx, dy) > 10) {
        tapRef.current.moved = true;
      }
    }
    const m = mode.current;

    if (m.kind === "pinch" && e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t1.clientX - t0.clientX;
      const dy = t1.clientY - t0.clientY;
      const dist = Math.hypot(dx, dy) || 1;

      const factor = Math.pow(dist / m.startDist, 0.9);
      const newK = Math.min(4, Math.max(0.1, m.startK * factor));

      const wx = (m.startMidX - m.startVpX) / m.startK;
      const wy = (m.startMidY - m.startVpY) / m.startK;

      setViewport({
        k: newK,
        x: m.startMidX - wx * newK,
        y: m.startMidY - wy * newK,
      });
      return;
    }

    if (e.touches.length === 1) {
      const { sx, sy } = touchToScreen(e.touches[0]);
      moveInteraction(sx, sy);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();

    const m = mode.current;

if (m.kind === "selecting") {
  const x1 = Math.min(m.startWorldX, m.currentWorldX);
  const y1 = Math.min(m.startWorldY, m.currentWorldY);
  const x2 = Math.max(m.startWorldX, m.currentWorldX);
  const y2 = Math.max(m.startWorldY, m.currentWorldY);

  if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
    const hits = nodes.filter(
      (n) =>
        n.x + n.w >= x1 &&
        n.x <= x2 &&
        n.y + n.h >= y1 &&
        n.y <= y2,
    );
    const ids = hits.map((n) => n.id);
    useGraph.getState().selectMultiple(ids, m.additive);
  }

  setSelectionRect(null);
  tapRef.current = null;
  mode.current = { kind: "idle" };
  return;
}

        const tap = tapRef.current;
    if (tap && !tap.moved && Date.now() - tap.startTime < 500) {
      const r = ref.current!.getBoundingClientRect();
      const sx = tap.startX - r.left;
      const sy = tap.startY - r.top;
      const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
      const world = screenToWorld(sx, sy, viewport);
      const target = hitNode(nodes, world.x, world.y);
      const edgeId = hitEdge(nodes, edges, world.x, world.y, 8 / viewport.k);

      const linkingFromPoint = useGraph.getState().linkingFromPoint;
if ((linkingFrom || linkingFromPoint) && target && (!linkingFrom || target.id !== linkingFrom)) {
  useGraph.getState().completeLinking(target.id, false);
        tapRef.current = null;
        mode.current = { kind: "idle" };
        lastEmptyTapRef.current = null;
        return;
      }

      if (exportingNode && target) {
        useGraph.getState().completeExportNode(target.id);
        tapRef.current = null;
        mode.current = { kind: "idle" };
        lastEmptyTapRef.current = null;
        return;
      }
      const selectedEdgePoint = useGraph.getState().selectedEdgePoint;
if (selectedEdgePoint && !target) {
  const parentEdge = edges.find((e) => e.id === selectedEdgePoint.edgeId);
  if (parentEdge) {
    const hit = hitEdgePoint(nodes, edges, parentEdge, world.x, world.y, 12 / viewport.k);
    if (hit && hit.index === selectedEdgePoint.index) {
      const prev = lastEmptyTapRef.current;
      const now = Date.now();
      if (prev && now - prev.time < 300 && Math.hypot(sx - prev.x, sy - prev.y) < 30) {
        useGraph.getState().removeEdgePoint(parentEdge.id, hit.index);
        lastEmptyTapRef.current = null;
        tapRef.current = null;
        mode.current = { kind: "idle" };
        return;
      } else {
        lastEmptyTapRef.current = { time: now, x: sx, y: sy };
        tapRef.current = null;
        mode.current = { kind: "idle" };
        return;
      }
    }
  }
}

      if (!target && !edgeId) {
  if (tap && !tap.moved) {
    useGraph.getState().clearSelection();
    useGraph.getState().selectEdge(null);
    useGraph.getState().selectEdgePoint(null);
  }
  const prev = lastEmptyTapRef.current;
  const now = Date.now();
  if (prev && now - prev.time < 300 && Math.hypot(sx - prev.x, sy - prev.y) < 30) {
    const paletteActive = useGraph.getState().paletteActive;
    const pasteActive = useGraph.getState().pasteActive;
    const viewport = useGraph.getState().getCurrentGraph()?.viewport ?? DEFAULT_VIEWPORT;
    const world = screenToWorld(sx, sy, viewport);

    if (pasteActive) {
      useGraph.getState().pasteAt(world.x, world.y);
    } else if (paletteActive) {
      useGraph.getState().spawnPaletteNodes(world.x, world.y);
    } else {
      useGraph.getState().armRectMode();
    }
    lastEmptyTapRef.current = null;
  } else {
    lastEmptyTapRef.current = { time: now, x: sx, y: sy };
  }
} else {
  lastEmptyTapRef.current = null;
}
    } else if (tap && tap.moved) {
      lastEmptyTapRef.current = null;
    }

    tapRef.current = null;

    if (e.touches.length === 0) {
      mode.current = { kind: "idle" };
    }
    if (e.touches.length === 1) {
      mode.current = { kind: "idle" };
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <canvas
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: exportingNode || linkingFrom || linkingFromPoint ? "crosshair" : "default",
          touchAction: "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      />

      <div
  style={{
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  }}
>
  <NodeToolbar canvasWidth={size.w} canvasHeight={size.h} />
  <EdgeToolbar canvasWidth={size.w} canvasHeight={size.h} />
  <PaletteIndicator canvasWidth={size.w} canvasHeight={size.h} />
  <PasteIndicator />
</div>
    </div>
  );
}