import { create } from "zustand";
import type {
  Graph,
  GraphId,
  GraphNode,
  GraphEdge,
  Viewport,
  NodeId,
  NodeProp,
  PropValue,
  AppSettings,
  PaletteConfig,
  PaletteLayout,
} from "../engine/types";
import { wrapText, LINE_HEIGHT, propLines } from "../engine/textMetrics";
import * as db from "../db/database";
import { t } from "../i18n";
import type { DeadlineStatus, DeadlineItem } from "../engine/types";
import { getStatus } from "../engine/deadlineEngine";

// Debounce сохранения в IndexedDB
const saveTimers = new Map<string, number>();

function saveGraphDebounced(graph: Graph): void {
  const key = graph.id;
  const existing = saveTimers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  const timer = window.setTimeout(() => {
    saveTimers.delete(key);
    db.saveGraph(graph);
  }, 400);
  saveTimers.set(key, timer);
}

function saveGraphNow(graph: Graph): void {
  const key = graph.id;
  const existing = saveTimers.get(key);
  if (existing !== undefined) {
    clearTimeout(existing);
    saveTimers.delete(key);
  }
  db.saveGraph(graph);
}

let idCounter = 1;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${idCounter++}`;

const PADDING = 12;
const PROPS_LINE_H = 14;
const MAX_PROPS_SHOWN = 5;
const IMAGE_PREVIEW_H = 70;
const IMAGE_PREVIEW_GAP = 8;

const MIN_W = 160;
const MAX_W = 420;
const W_STEP = 10;
const LINES_PER_STEP = 2;
const BASE_H = 60;

const HISTORY_LIMIT = 50;
const DEBOUNCE_MS = 500;

function linesAt(title: string, w: number): string[] {
  return wrapText(title, w - PADDING * 2);
}

export function computeSize(node: GraphNode): { w: number; h: number } {
  let w = Math.max(MIN_W, Math.min(MAX_W, node.w || MIN_W));
  let lines = linesAt(node.title, w);

  for (let iter = 0; iter < 8; iter++) {
    const targetW = Math.min(
      MAX_W,
      MIN_W + Math.floor((lines.length - 1) / LINES_PER_STEP) * W_STEP,
    );
    if (targetW === w) break;
    w = targetW;
    lines = linesAt(node.title, w);
  }

  const titleH = lines.length * LINE_HEIGHT;

  const shownProps = node.props.slice(0, MAX_PROPS_SHOWN);
  let propsLinesCount = 0;
  for (const p of shownProps) {
    propsLinesCount += propLines(p.key, p.value, w, PADDING).length;
  }
  const propsH = propsLinesCount * PROPS_LINE_H;

  const hasImage =
    node.modules.includes("image") &&
    Boolean((node.data.image as { src?: string } | undefined)?.src);
  const imageH = hasImage
  ? IMAGE_PREVIEW_H + IMAGE_PREVIEW_GAP + PADDING * 2
  : 0;

  const hasBottomRow =
  (node.modules.length > 0) ||
  (node.tags && node.tags.length > 0);

const bottomRowH = hasBottomRow ? 14 + 6 : 0;

const h = PADDING + titleH + propsH + imageH + bottomRowH + PADDING;
  return { w, h: Math.max(BASE_H, h) };
}

function withSize(node: GraphNode): GraphNode {
  const { w, h } = computeSize(node);
  return { ...node, w, h };
}

function computePalettePositions(
  cx: number,
  cy: number,
  count: number,
  layout: PaletteLayout,
): Array<{ x: number; y: number }> {
  const W = 160;
  const H = 60;
  const GAP = 20;

  if (layout === "column") {
    return Array.from({ length: count }, (_, i) => ({
      x: cx - W / 2,
      y: cy + i * (H + GAP),
    }));
  }

  if (layout === "grid") {
    return Array.from({ length: count }, (_, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      return {
        x: cx - W + col * (W + GAP),
        y: cy + row * (H + GAP),
      };
    });
  }

  // circle
  const radius = Math.max(100, count * 30);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius - W / 2,
      y: cy + Math.sin(angle) * radius - H / 2,
    };
  });
}

function createEmptyGraph(
  parentNodeId: NodeId | null,
  parentGraphId: GraphId | null,
): Graph {
  const now = Date.now();
  return {
    id: uid("g"),
    parentNodeId,
    parentGraphId,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, k: 1 },
    createdAt: now,
    updatedAt: now,
  };
}

interface Snapshot {
  graphs: Record<GraphId, Graph>;
  currentGraphId: GraphId | null;
}

interface State {

  graphs: Record<GraphId, Graph>;
  currentGraphId: GraphId | null;
  loaded: boolean;

  selectedId: NodeId | null;
  selectedIds: NodeId[];
  settingsOpen: boolean;

  past: Snapshot[];
  future: Snapshot[];

  init: () => Promise<void>;

  snapshot: () => void;
  moveNodes: (updates: Array<{ id: NodeId; x: number; y: number }>) => void;

  getCurrentGraph: () => Graph | null;
  getBreadcrumbs: () => Array<{ graphId: GraphId; label: string }>;
  openChildGraph: (nodeId: NodeId) => void;
  openParentGraph: () => void;

  createChildGraph: (nodeId: NodeId) => void;
  deleteChildGraph: (nodeId: NodeId) => void;

  addNode: (x: number, y: number) => void;
  moveNode: (id: NodeId, x: number, y: number) => void;
  addEdge: (from: NodeId, to: NodeId) => void;
  setViewport: (vp: Viewport) => void;
  select: (id: NodeId | null) => void;
  openSettings: (id: NodeId) => void;
  closeSettings: () => void;
  updateNodeTitle: (id: NodeId, title: string) => void;
  setNodeColor: (id: NodeId, color: string | undefined) => void;
  addNodeTag: (id: NodeId, tag: string) => void;
  removeNodeTag: (id: NodeId, tag: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  getSearchMatches: () => Array<{
  node: GraphNode;
  graphId: string;
  graphLabel: string;
  path: string;
}>;
settings: AppSettings;
updateSettings: (patch: Partial<AppSettings>) => void;
  addNodeProp: (id: NodeId) => void;
  renameNodeProp: (id: NodeId, propId: string, newKey: string) => void;
  setNodePropValue: (id: NodeId, propId: string, value: PropValue) => void;
  removeNodeProp: (id: NodeId, propId: string) => void;
  removeNode: (id: NodeId) => void;
  toggleModule: (id: NodeId, moduleId: string) => void;
  setModuleData: (
    id: NodeId,
    moduleId: string,
    patch: Record<string, unknown>,
  ) => void;

  undo: () => void;
  redo: () => void;
  treeOpen: boolean;
  toggleTree: () => void;
  linkingFrom: NodeId | null;
selectedEdgeId: string | null;
selectedEdgePoint: { edgeId: string; index: number } | null;
selectEdgePoint: (p: { edgeId: string; index: number } | null) => void;
startLinking: (nodeId: NodeId) => void;
cancelLinking: () => void;
completeLinking: (targetId: NodeId, keepOpen: boolean) => void;
linkingFromPoint: { edgeId: string; index: number } | null;
startLinkingFromPoint: (edgeId: string, index: number) => void;
selectEdge: (edgeId: string | null) => void;
addEdgePoint: (
  edgeId: string,
  point: { x: number; y: number },
  insertIndex: number,
) => void;
moveEdgePoint: (edgeId: string, index: number, point: { x: number; y: number }) => void;
removeEdgePoint: (edgeId: string, index: number) => void;
removeEdge: (edgeId: string) => void;
importGraphs: (graphs: Record<GraphId, Graph>) => void;
exportingNode: boolean;
startExportNode: () => void;
cancelExportNode: () => void;
completeExportNode: (nodeId: NodeId) => void;
importData: (type: "tree" | "graph" | "node", data: unknown) => void;
deleteRootGraph: (graphId: GraphId) => void;
panelOpen: boolean;
openPanel: () => void;
closePanel: () => void;

selectMultiple: (ids: NodeId[], addToSelection?: boolean) => void;
clearSelection: () => void;

pendingRectStart: { x: number; y: number } | null;
setPendingRectStart: (p: { x: number; y: number } | null) => void;

paletteOpen: boolean;
paletteActive: boolean;
paletteConfig: PaletteConfig;
openPalette: () => void;
closePalette: () => void;
confirmPalette: (config: PaletteConfig) => void;
resetPalette: () => void;
spawnPaletteNodes: (worldX: number, worldY: number) => void;

rectModeArmed: boolean;
rectArmTimer: number | null;
armRectMode: () => void;
disarmRectMode: () => void;
now: number;
deadlineHidden: Record<string, number>;
tick: () => void;
hideDeadline: (id: string, until: number) => void;
openNodeById: (graphId: string, nodeId: string) => void;
deadlineLastStatus: Record<string, DeadlineStatus>;
dismissRecurring: (graphId: string, nodeId: string, itemId: string) => void;
clipboard: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
pasteActive: boolean;
lastPaste: { graphId: string; nodeIds: string[]; edgeIds: string[] } | null;
pasteUndoTimer: number | null;

copySelection: () => void;
startPasteMode: () => void;
cancelPasteMode: () => void;
pasteAt: (worldX: number, worldY: number) => void;
undoPaste: () => void;
}

// ——— История ———

let pendingSnapshot: Snapshot | null = null;
let debounceTimer: number | null = null;

function cloneSnapshot(state: {
  graphs: Record<GraphId, Graph>;
  currentGraphId: GraphId | null;
}): Snapshot {
  return {
    graphs: structuredClone(state.graphs),
    currentGraphId: state.currentGraphId,
  };
}

function flushPending(set: (partial: Partial<State>) => void, get: () => State) {
  if (!pendingSnapshot) return;
  const state = get();
  const past = [...state.past, pendingSnapshot].slice(-HISTORY_LIMIT);
  pendingSnapshot = null;
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  set({ past, future: [] });
}

function scheduleHistory(
  set: (partial: Partial<State>) => void,
  get: () => State,
) {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    flushPending(set, get);
  }, DEBOUNCE_MS);
}

function pushBeforeChange(
  set: (partial: Partial<State>) => void,
  get: () => State,
) {
  if (!pendingSnapshot) {
    pendingSnapshot = cloneSnapshot(get());
  }
  scheduleHistory(set, get);
}

function updateCurrentGraph(
  state: State,
  updater: (g: Graph) => Graph,
): Partial<State> {
  const id = state.currentGraphId;
  if (!id) return {};
  const graph = state.graphs[id];
  if (!graph) return {};
  const updated = { ...updater(graph), updatedAt: Date.now() };
  saveGraphDebounced(updated);
  return {
    graphs: { ...state.graphs, [id]: updated },
  };
}

function updateNode(
  state: State,
  nodeId: NodeId,
  updater: (n: GraphNode) => GraphNode,
): Partial<State> {
  return updateCurrentGraph(state, (g) => ({
    ...g,
    nodes: g.nodes.map((n) => (n.id === nodeId ? updater(n) : n)),
  }));
}

export const useGraph = create<State>((set, get) => ({
  treeOpen: false,
toggleTree: () => set((s) => ({ treeOpen: !s.treeOpen })),
  graphs: {},
  currentGraphId: null,
  loaded: false,
  selectedId: null,
  selectedIds: [],
  settingsOpen: false,
  panelOpen: false,
  searchQuery: "",
  settings: {
  theme: "dark",
  language: "en",
  fontSize: "medium",
  showGrid: true,
  snapToGrid: false,
  toolbarOffset: "off",
},
  past: [],
  future: [],
  linkingFrom: null,
  linkingFromPoint: null,
  selectedEdgeId: null,
  selectedEdgePoint: null,
  deadlineLastStatus: {},
  clipboard: null,
pasteActive: false,
lastPaste: null,
pasteUndoTimer: null,

  pendingRectStart: null,
setPendingRectStart: (pendingRectStart) => set({ pendingRectStart }),

paletteOpen: false,
paletteActive: false,
paletteConfig: {
  count: 1,
  layout: "column",
  color: undefined,
  node: {
    title: "Новая вершина",
    props: [],
    modules: [],
    data: {},
  },
},
openNodeById: (graphId, nodeId) => {
  const state = get();
  if (!state.graphs[graphId]) return;

  if (state.currentGraphId !== graphId) {
    db.setLastOpenedGraphId(graphId);
    set({
      currentGraphId: graphId,
      selectedId: null,
      selectedEdgeId: null,
      selectedEdgePoint: null,
    });
  }

  setTimeout(() => {
    const s = get();
    const g = s.getCurrentGraph();
    if (!g) return;
    const node = g.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const vp = g.viewport;
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;

    const canvasW = window.innerWidth - 280;
    const canvasH = window.innerHeight - 100;

    s.setViewport({
      k: vp.k,
      x: canvasW / 2 - cx * vp.k,
      y: canvasH / 2 - cy * vp.k,
    });

    s.select(nodeId);
  }, 50);
},

dismissRecurring: (graphId, nodeId, itemId) => {
  const state = get();
  const graph = state.graphs[graphId];
  if (!graph) return;
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const data = node.data.deadline as { items?: DeadlineItem[] } | undefined;
  if (!data?.items) return;

  const updatedItems = data.items.map((it) =>
    it.id === itemId && it.kind === "recurring"
      ? { ...it, lastFiredAt: Date.now() }
      : it,
  );

  const updatedNode = {
    ...node,
    data: { ...node.data, deadline: { items: updatedItems } },
  };
  const updatedGraph = {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === nodeId ? updatedNode : n)),
    updatedAt: Date.now(),
  };

  set({
    graphs: { ...state.graphs, [graphId]: updatedGraph },
  });
  db.saveGraph(updatedGraph);
},

openPalette: () => set({
  paletteOpen: true,
  paletteActive: false,
  pasteActive: false,
  clipboard: null,
}),

closePalette: () =>
  set({
    paletteOpen: false,
    paletteActive: false,
  }),

confirmPalette: (config) =>
  set({
    paletteOpen: false,
    paletteActive: true,
    paletteConfig: config,
  }),

resetPalette: () =>
  set({
    paletteOpen: false,
    paletteActive: false,
  }),

spawnPaletteNodes: (worldX, worldY) => {
  const state = get();
  const { paletteConfig } = state;
  const { count, layout, color, node: base } = paletteConfig;

  pushBeforeChange(set, get);

  const positions = computePalettePositions(worldX, worldY, count, layout);

  set((s) =>
    updateCurrentGraph(s, (g) => {
      const newNodes: GraphNode[] = positions.map((pos) => {
        const n: GraphNode = {
          id: uid("n"),
          x: pos.x,
          y: pos.y,
          w: MIN_W,
          h: BASE_H,
          title: base.title || "Новая вершина",
          props: base.props.map((p) => ({
            id: uid("p"),
            key: p.key,
            value: p.value,
          })),
          modules: [...base.modules],
          data: JSON.parse(JSON.stringify(base.data)),
          childGraphId: null,
          color,
        };
        return withSize(n);
      });
      return { ...g, nodes: [...g.nodes, ...newNodes] };
    }),
  );

  set({ paletteActive: false });
},

rectModeArmed: false,
rectArmTimer: null,

armRectMode: () => {
  const s = get();
  if (s.rectArmTimer !== null) clearTimeout(s.rectArmTimer);
  const timer = window.setTimeout(() => {
    set({ rectModeArmed: false, rectArmTimer: null });
  }, 3000);
  set({ rectModeArmed: true, rectArmTimer: timer });
},

disarmRectMode: () => {
  const s = get();
  if (s.rectArmTimer !== null) clearTimeout(s.rectArmTimer);
  set({ rectModeArmed: false, rectArmTimer: null });
},

copySelection: () => {
  const state = get();
  const graph = state.getCurrentGraph();
  if (!graph) return;

  const selectedIds = new Set(state.selectedIds);
  if (selectedIds.size === 0) return;

  const nodes = graph.nodes.filter((n) => selectedIds.has(n.id));
  const edges = graph.edges.filter(
    (e) => selectedIds.has(e.from) && selectedIds.has(e.to),
  );

  set({
    clipboard: {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    },
    pasteActive: false,
  });
},

startPasteMode: () => {
  const state = get();
  if (!state.clipboard || state.clipboard.nodes.length === 0) return;

  if (state.paletteOpen) {
    set({ paletteOpen: false, paletteActive: false });
  }

  set({ pasteActive: true });
},

cancelPasteMode: () => {
  set({
    pasteActive: false,
    clipboard: null,
  });
},

pasteAt: (worldX, worldY) => {
  const state = get();
  const graph = state.getCurrentGraph();
  if (!graph) return;
  if (!state.clipboard || state.clipboard.nodes.length === 0) return;
  if (!state.currentGraphId) return;

  pushBeforeChange(set, get);

  const clip = state.clipboard;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of clip.nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + n.w > maxX) maxX = n.x + n.w;
    if (n.y + n.h > maxY) maxY = n.y + n.h;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const dx = worldX - centerX;
  const dy = worldY - centerY;

  const idMap = new Map<string, string>();
  const newNodes: GraphNode[] = clip.nodes.map((n) => {
    const newId = uid("n");
    idMap.set(n.id, newId);
    return {
      ...JSON.parse(JSON.stringify(n)),
      id: newId,
      x: n.x + dx,
      y: n.y + dy,
      childGraphId: null,
    };
  });

  const newEdges: GraphEdge[] = clip.edges.map((e) => ({
    ...JSON.parse(JSON.stringify(e)),
    id: uid("e"),
    from: idMap.get(e.from) ?? e.from,
    to: idMap.get(e.to) ?? e.to,
    fromEdgeId: undefined,
    fromPointIndex: undefined,
  }));

  const graphId = state.currentGraphId;

  set((s) =>
    updateCurrentGraph(s, (g) => ({
      ...g,
      nodes: [...g.nodes, ...newNodes],
      edges: [...g.edges, ...newEdges],
    })),
  );

  if (state.pasteUndoTimer !== null) {
    clearTimeout(state.pasteUndoTimer);
  }

  const timer = window.setTimeout(() => {
    set({
      lastPaste: null,
      pasteUndoTimer: null,
      clipboard: null,
    });
  }, 5000);

  set({
    pasteActive: false,
    lastPaste: {
      graphId,
      nodeIds: newNodes.map((n) => n.id),
      edgeIds: newEdges.map((e) => e.id),
    },
    pasteUndoTimer: timer,
  });
},

undoPaste: () => {
  const state = get();
  if (!state.lastPaste) return;

  const { graphId, nodeIds, edgeIds } = state.lastPaste;
  const nodeSet = new Set(nodeIds);
  const edgeSet = new Set(edgeIds);

  const g = state.graphs[graphId];
  if (g) {
    const updated: Graph = {
      ...g,
      nodes: g.nodes.filter((n) => !nodeSet.has(n.id)),
      edges: g.edges.filter((e) => !edgeSet.has(e.id)),
      updatedAt: Date.now(),
    };
    db.saveGraph(updated);
    set({
      graphs: { ...state.graphs, [graphId]: updated },
    });
  }

  if (state.pasteUndoTimer !== null) {
    clearTimeout(state.pasteUndoTimer);
  }

  set({
    lastPaste: null,
    pasteUndoTimer: null,
    clipboard: null,
  });
},

  now: Date.now(),
  deadlineHidden: {},

  tick: () => {
  const now = Date.now();
  const state = get();

  const newStatuses: Record<string, DeadlineStatus> = {};
  for (const graphId of Object.keys(state.graphs)) {
    const graph = state.graphs[graphId];
    for (const node of graph.nodes) {
      const data = node.data.deadline as
        | { items?: DeadlineItem[] }
        | undefined;
      if (!data?.items) continue;
      for (const item of data.items) {
  if (item.kind !== "once") continue;
  if (!item.confirmed) continue;
  const st = getStatus(item, now);
  if (st) newStatuses[item.id] = st;
}
    }
  }

  const nextHidden = { ...state.deadlineHidden };
  let hiddenChanged = false;

  for (const id of Object.keys(newStatuses)) {
    const prev = state.deadlineLastStatus[id];
    const cur = newStatuses[id];
    if (prev !== undefined && prev !== cur) {
      if (nextHidden[id] !== undefined) {
        delete nextHidden[id];
        hiddenChanged = true;
      }
    }
  }

  set({
    now,
    deadlineLastStatus: newStatuses,
    deadlineHidden: hiddenChanged ? nextHidden : state.deadlineHidden,
  });

  if (hiddenChanged) {
    db.setDeadlineHidden(nextHidden);
  }
},

  hideDeadline: (id, until) => {
    const next = { ...get().deadlineHidden, [id]: until };
    set({ deadlineHidden: next });
    db.setDeadlineHidden(next);
  },

  init: async () => {
    const all = await db.loadAllGraphs();
    const graphs: Record<GraphId, Graph> = {};
    for (const g of all) graphs[g.id] = g;

    let currentId = await db.getLastOpenedGraphId();

    if (Object.keys(graphs).length === 0) {
      const root = createEmptyGraph(null, null);
      graphs[root.id] = root;
      currentId = root.id;
      await db.saveGraph(root);
    }

    if (!currentId || !graphs[currentId]) {
      const root = Object.values(graphs).find((g) => g.parentGraphId === null);
      currentId = root?.id ?? Object.keys(graphs)[0];
    }

    await db.setLastOpenedGraphId(currentId);

let settings: AppSettings = {
  theme: "dark",
  language: "en",
  fontSize: "medium",
  showGrid: true,
  snapToGrid: false,
  toolbarOffset: "off",
};
try {
  const stored = await db.loadSettings();
  if (stored) {
    settings = {
      ...settings,
      ...stored,
      snapToGrid: stored.snapToGrid ?? false,
      toolbarOffset: stored.toolbarOffset ?? "off",
    };
  }
} catch {

}

    let deadlineHidden: Record<string, number> = {};
    try {
      deadlineHidden = await db.getDeadlineHidden();
    } catch {
      // игнорируем
    }

    set({
      graphs,
      currentGraphId: currentId,
      loaded: true,
      past: [],
      future: [],
      settings,
      deadlineHidden,
      now: Date.now(),
    });
  },
  
  

  getCurrentGraph: () => {
    const { graphs, currentGraphId } = get();
    if (!currentGraphId) return null;
    return graphs[currentGraphId] ?? null;
  },

  importGraphs: (newGraphs) => {
  pushBeforeChange(set, get);
  const state = get();
  const merged = { ...state.graphs, ...newGraphs };

  const newRoot = Object.values(newGraphs).find(
    (g) => g.parentGraphId === null,
  );
  for (const g of Object.values(newGraphs)) {
    db.saveGraph(g);
  }

  const newCurrentId = newRoot?.id ?? state.currentGraphId;

  if (newCurrentId) {
    db.setLastOpenedGraphId(newCurrentId);
  }

  set({
    graphs: merged,
    currentGraphId: newCurrentId,
    selectedId: null,
    selectedEdgeId: null,
  });
},

exportingNode: false,

startExportNode: () =>
  set({ exportingNode: true, selectedId: null, selectedEdgeId: null }),

cancelExportNode: () => set({ exportingNode: false }),

completeExportNode: (nodeId) => {
  const state = get();
  const graph = state.getCurrentGraph();
  if (!graph) return;
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  // вызываем экспорт
  import("../utils/exportImport").then((mod) => {
    mod.exportNode(node);
  });

  set({ exportingNode: false });
},

importData: (type, data) => {
  if (type === "node") {
    importNode(set, get, data as { node: Partial<GraphNode> });
  } else if (type === "graph") {
    importGraph(set, get, data as { nodes: GraphNode[]; edges: GraphEdge[] });
  } else if (type === "tree") {
    importTree(set, get, data as { graphs: Record<GraphId, Graph> });
  }
},
deleteRootGraph: (graphId) => {
  const state = get();
  const graph = state.graphs[graphId];
  if (!graph) return;
  if (graph.parentGraphId !== null) return; // не корень

  // нельзя удалить последний корень
  const roots = Object.values(state.graphs).filter(
    (g) => g.parentGraphId === null,
  );
  if (roots.length <= 1) return;

  // собираем каскадно — все графы этого дерева
  const toDelete: GraphId[] = [];
  const collect = (gid: GraphId) => {
    toDelete.push(gid);
    const g = state.graphs[gid];
    if (!g) return;
    for (const n of g.nodes) {
      if (n.childGraphId) collect(n.childGraphId);
    }
  };
  collect(graphId);

  for (const gid of toDelete) db.deleteGraphById(gid);

  const graphs = { ...state.graphs };
  for (const gid of toDelete) delete graphs[gid];

  // если удаляем текущий корень — переключаемся на другой
  let newCurrentId = state.currentGraphId;
  let newSelectedId = state.selectedId;
  let newSelectedEdgeId = state.selectedEdgeId;

  if (state.currentGraphId && toDelete.includes(state.currentGraphId)) {
    const otherRoot = Object.values(graphs).find(
      (g) => g.parentGraphId === null,
    );
    newCurrentId = otherRoot?.id ?? null;
    newSelectedId = null;
    newSelectedEdgeId = null;
    if (newCurrentId) db.setLastOpenedGraphId(newCurrentId);
  }

  set({
    graphs,
    currentGraphId: newCurrentId,
    selectedId: newSelectedId,
    selectedEdgeId: newSelectedEdgeId,
    past: [],
    future: [],
  });
},

  getBreadcrumbs: () => {
    const { graphs, currentGraphId } = get();
    const path: Array<{ graphId: GraphId; label: string }> = [];
    let gid = currentGraphId;
    while (gid) {
      const g = graphs[gid];
      if (!g) break;
      let label = t("treeNav.rootLabel");
if (g.parentNodeId) {
  const parentGraph = g.parentGraphId ? graphs[g.parentGraphId] : null;
  const parentNode = parentGraph?.nodes.find(
    (n) => n.id === g.parentNodeId,
  );
  if (parentNode) label = parentNode.title || t("treeNav.noName");
}
      path.unshift({ graphId: gid, label });
      gid = g.parentGraphId;
    }
    return path;
  },

  openChildGraph: (nodeId) => {
    linkingFromPoint: null
    get().disarmRectMode();
    get().resetPalette();
    const state = get();
    const graph = state.getCurrentGraph();
    if (!graph) return;
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node || !node.childGraphId) return;
    const childId = node.childGraphId;
    if (!state.graphs[childId]) return;

    db.setLastOpenedGraphId(childId);
    set({ currentGraphId: childId, selectedId: null });
  },

  openParentGraph: () => {
    linkingFromPoint: null
    get().disarmRectMode();
    get().resetPalette();
    const state = get();
    const graph = state.getCurrentGraph();
    if (!graph || !graph.parentGraphId) return;
    const parentId = graph.parentGraphId;
    if (!state.graphs[parentId]) return;

    db.setLastOpenedGraphId(parentId);
    set({
      currentGraphId: parentId,
      selectedId: graph.parentNodeId ?? null,
    });
  },

  createChildGraph: (nodeId) => {
    pushBeforeChange(set, get);

    const state = get();
    const graph = state.getCurrentGraph();
    if (!graph) return;
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node || node.childGraphId) return;

    const child = createEmptyGraph(nodeId, graph.id);

    const clone: GraphNode = {
      id: uid("n"),
      x: 320,
      y: 240,
      w: node.w,
      h: node.h,
      title: node.title,
      props: node.props.map((p) => ({
        id: uid("p"),
        key: p.key,
        value: p.value,
      })),
      modules: [...node.modules],
      data: JSON.parse(JSON.stringify(node.data)),
      childGraphId: null,
    };
    child.nodes = [withSize(clone)];

    const parentNode = { ...node, childGraphId: child.id };
    const updatedParent = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === nodeId ? parentNode : n)),
      updatedAt: Date.now(),
    };

    db.saveGraph(child);
    db.saveGraph(updatedParent);

    set({
      graphs: {
        ...state.graphs,
        [child.id]: child,
        [graph.id]: updatedParent,
      },
    });
  },

  deleteChildGraph: (nodeId) => {
    pushBeforeChange(set, get);

    const state = get();
    const graph = state.getCurrentGraph();
    if (!graph) return;
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node || !node.childGraphId) return;

    const toDelete = node.childGraphId;

    const toDeleteAll: GraphId[] = [];
    const collect = (gid: GraphId) => {
      toDeleteAll.push(gid);
      const g = state.graphs[gid];
      if (!g) return;
      for (const n of g.nodes) {
        if (n.childGraphId) collect(n.childGraphId);
      }
    };
    collect(toDelete);

    for (const gid of toDeleteAll) db.deleteGraphById(gid);

    const graphs = { ...state.graphs };
    for (const gid of toDeleteAll) delete graphs[gid];

    const updatedParent: Graph = {
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, childGraphId: null } : n,
      ),
      updatedAt: Date.now(),
    };
    graphs[graph.id] = updatedParent;
    db.saveGraph(updatedParent);

    const currentStillExists = state.currentGraphId
      ? Boolean(graphs[state.currentGraphId])
      : false;

    if (!currentStillExists) {
      const fallbackId =
        graph.id ??
        Object.values(graphs).find((g) => g.parentGraphId === null)?.id ??
        Object.keys(graphs)[0];

      db.setLastOpenedGraphId(fallbackId);
      set({
        graphs,
        currentGraphId: fallbackId,
        selectedId: nodeId,
      });
    } else {
      set({ graphs });
    }
  },

  addNode: (x, y) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateCurrentGraph(s, (g) => {
        const node: GraphNode = {
          id: uid("n"),
          x: x - 80,
          y: y - 30,
          w: MIN_W,
          h: BASE_H,
          title: t("defaults.newNode"),
          props: [],
          modules: [],
          data: {},
          childGraphId: null,
        };
        return { ...g, nodes: [...g.nodes, withSize(node)] };
      }),
    );
  },

  moveNode: (id, x, y) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateCurrentGraph(s, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      })),
    );
  },

  moveNodes: (updates) => {
  set((s) =>
    updateCurrentGraph(s, (g) => {
      const map = new Map(updates.map((u) => [u.id, u]));
      return {
        ...g,
        nodes: g.nodes.map((n) => {
          const u = map.get(n.id);
          return u ? { ...n, x: u.x, y: u.y } : n;
        }),
      };
    }),
  );
},

snapshot: () => {
  pushBeforeChange(set, get);
},

  addEdge: (from, to) => {
  pushBeforeChange(set, get);
  set((s) =>
    updateCurrentGraph(s, (g) => {
      if (from === to) return g;
      const exists = g.edges.some(
        (e) =>
          (e.from === from && e.to === to) ||
          (e.from === to && e.to === from),
      );
      if (exists) return g;
      return { ...g, edges: [...g.edges, { id: uid("e"), from, to }] };
    }),
  );
},

  setViewport: (vp) =>
  set((s) => {
    const id = s.currentGraphId;
    if (!id) return {};
    const graph = s.graphs[id];
    if (!graph) return {};
    // обновляем только viewport, без сохранения в БД
    return {
      graphs: {
        ...s.graphs,
        [id]: { ...graph, viewport: vp },
      },
    };
  }),

  select: (selectedId) =>
  set({
    selectedId,
    selectedIds: selectedId ? [selectedId] : [],
    selectedEdgeId: null,
    panelOpen: selectedId ? true : false,
  }),
  selectMultiple: (ids, addToSelection = false) =>
  set((s) => {
    const next = addToSelection
      ? Array.from(new Set([...s.selectedIds, ...ids]))
      : ids;
    return {
      selectedIds: next,
      selectedId: next.length === 1 ? next[0] : null,
      selectedEdgeId: null,
      panelOpen: next.length === 1,
    };
  }),

clearSelection: () =>
  set({
    selectedId: null,
    selectedIds: [],
    panelOpen: false,
  }),
  openSettings: (id) => set({ selectedId: id, settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  updateNodeTitle: (id, title) => {
    pushBeforeChange(set, get);
    set((s) => updateNode(s, id, (n) => withSize({ ...n, title })));
  },
  setNodeColor: (id, color) => {
  pushBeforeChange(set, get);
  set((s) =>
    updateNode(s, id, (n) => ({ ...n, color })),
  );
},

setSearchQuery: (q) => set({ searchQuery: q }),

updateSettings: (patch) =>
  set((s) => {
    const next = { ...s.settings, ...patch };
    db.saveSettings(next);
    return { settings: next };
  }),

getSearchMatches: () => {
  const { graphs, currentGraphId, searchQuery } = get();
  if (!currentGraphId || !searchQuery.trim()) return [];

  const q = searchQuery.trim().toLowerCase();

  // 1. находим корень текущего дерева
  let rootId = currentGraphId;
  while (true) {
    const g = graphs[rootId];
    if (!g || !g.parentGraphId) break;
    rootId = g.parentGraphId;
  }

  // 2. собираем все графы этого дерева (корень + все подграфы)
  const treeGraphIds: string[] = [];
  const collect = (gid: string) => {
    treeGraphIds.push(gid);
    const g = graphs[gid];
    if (!g) return;
    for (const n of g.nodes) {
      if (n.childGraphId) collect(n.childGraphId);
    }
  };
  collect(rootId);

  // 3. ищем совпадения во всех графах дерева
  const matches: Array<{
    node: GraphNode;
    graphId: string;
    graphLabel: string;
    path: string;
  }> = [];

  for (const gid of treeGraphIds) {
    const g = graphs[gid];
    if (!g) continue;

    // название графа (из родительской вершины или «Главный»)
    let graphLabel = t("treeNav.rootLabel");
if (g.parentNodeId && g.parentGraphId) {
  const parent = graphs[g.parentGraphId];
  const parentNode = parent?.nodes.find((n) => n.id === g.parentNodeId);
  if (parentNode) graphLabel = parentNode.title || t("treeNav.noName");
}

    for (const n of g.nodes) {
      const titleMatch = n.title.toLowerCase().includes(q);
      const tagMatch = (n.tags ?? []).some((t) =>
        t.toLowerCase().includes(q),
      );
      if (titleMatch || tagMatch) {
        matches.push({
          node: n,
          graphId: gid,
          graphLabel,
          path: gid === currentGraphId ? "" : graphLabel,
        });
      }
    }
  }

  return matches;
},

addNodeTag: (id, tag) => {
  const trimmed = tag.trim();
  if (!trimmed) return;
  pushBeforeChange(set, get);
  set((s) =>
    updateNode(s, id, (n) => {
      const current = n.tags ?? [];
      if (current.includes(trimmed)) return n;
      return withSize({ ...n, tags: [...current, trimmed] });
    }),
  );
},

removeNodeTag: (id, tag) => {
  pushBeforeChange(set, get);
  set((s) =>
    updateNode(s, id, (n) => {
      const current = n.tags ?? [];
      if (!current.includes(tag)) return n;
      const next = current.filter((t) => t !== tag);
      return withSize({ ...n, tags: next.length ? next : undefined });
    }),
  );
},

  addNodeProp: (id) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateNode(s, id, (n) => {
        const prop: NodeProp = {
          id: uid("p"),
          key: `${t("defaults.newProp")} ${n.props.length + 1}`,
          value: "",
        };
        return withSize({ ...n, props: [...n.props, prop] });
      }),
    );
  },

  renameNodeProp: (id, propId, newKey) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateNode(s, id, (n) =>
        withSize({
          ...n,
          props: n.props.map((p) =>
            p.id === propId ? { ...p, key: newKey } : p,
          ),
        }),
      ),
    );
  },

  setNodePropValue: (id, propId, value) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateNode(s, id, (n) =>
        withSize({
          ...n,
          props: n.props.map((p) =>
            p.id === propId ? { ...p, value } : p,
          ),
        }),
      ),
    );
  },

  removeNodeProp: (id, propId) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateNode(s, id, (n) =>
        withSize({
          ...n,
          props: n.props.filter((p) => p.id !== propId),
        }),
      ),
    );
  },

  removeNode: (id) => {
    pushBeforeChange(set, get);

    const state = get();
    const graph = state.getCurrentGraph();
    if (!graph) return;
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return;

    const toDelete: GraphId[] = [];
    const collect = (gid: GraphId) => {
      toDelete.push(gid);
      const g = state.graphs[gid];
      if (!g) return;
      for (const n of g.nodes) {
        if (n.childGraphId) collect(n.childGraphId);
      }
    };
    if (node.childGraphId) collect(node.childGraphId);

    for (const gid of toDelete) db.deleteGraphById(gid);

    const graphs = { ...state.graphs };
    for (const gid of toDelete) delete graphs[gid];

    const updated = {
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.from !== id && e.to !== id),
      updatedAt: Date.now(),
    };
    graphs[graph.id] = updated;
    db.saveGraph(updated);

    set({
      graphs,
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedEdgeId: null,
      settingsOpen: false,
    });
  },

  toggleModule: (id, moduleId) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateNode(s, id, (n) => {
        const has = n.modules.includes(moduleId);
        const modules = has
          ? n.modules.filter((m) => m !== moduleId)
          : [...n.modules, moduleId];
        return withSize({ ...n, modules });
      }),
    );
  },

  setModuleData: (id, moduleId, patch) => {
    pushBeforeChange(set, get);
    set((s) =>
      updateNode(s, id, (n) => {
        const current = (n.data[moduleId] as Record<string, unknown>) ?? {};
        const next = { ...current, ...patch };
        const data = { ...n.data, [moduleId]: next };
        return withSize({ ...n, data });
      }),
    );
  },
  startLinking: (nodeId) => set({ linkingFrom: nodeId, selectedId: nodeId, selectedEdgeId: null }),
  startLinkingFromPoint: (edgeId, index) => set({
  linkingFromPoint: { edgeId, index },
  linkingFrom: null,
  selectedEdgePoint: { edgeId, index },
}),

cancelLinking: () => set({ linkingFrom: null, linkingFromPoint: null }),

completeLinking: (targetId, keepOpen) => {
  const state = get();
  const from = state.linkingFrom;
  const fromPoint = state.linkingFromPoint;

  if (!from && !fromPoint) return;

  const graph = state.getCurrentGraph();
  if (!graph) return;

  // ——— СЛУЧАЙ 1: обычная связь от вершины ———
  if (from) {
    if (from === targetId) return;

    // дубликат обычной связи (в любую сторону)
    const existsNormal = graph.edges.some(
      (e) =>
        e.fromEdgeId === undefined &&
        ((e.from === from && e.to === targetId) ||
          (e.from === targetId && e.to === from)),
    );
    if (existsNormal) {
      if (!keepOpen) set({ linkingFrom: null });
      return;
    }

    pushBeforeChange(set, get);
    set((s) =>
      updateCurrentGraph(s, (g) => ({
        ...g,
        edges: [...g.edges, { id: uid("e"), from, to: targetId }],
      })),
    );

    if (!keepOpen) {
      set({ linkingFrom: null });
    }
    return;
  }

  if (fromPoint) {
  const parentEdge = graph.edges.find((e) => e.id === fromPoint.edgeId);
  if (!parentEdge || parentEdge.fromEdgeId !== undefined) {
    set({ linkingFromPoint: null });
    return;
  }

    // нельзя ветку к концам родительской связи
    if (targetId === parentEdge.from || targetId === parentEdge.to) {
      if (!keepOpen) set({ linkingFromPoint: null });
      return;
    }

    // дубликат ветки (от той же точки к той же вершине)
    const existsBranch = graph.edges.some(
      (e) =>
        e.fromEdgeId === fromPoint.edgeId &&
        e.fromPointIndex === fromPoint.index &&
        e.to === targetId,
    );
    if (existsBranch) {
      if (!keepOpen) set({ linkingFromPoint: null });
      return;
    }

    pushBeforeChange(set, get);
    set((s) =>
      updateCurrentGraph(s, (g) => ({
        ...g,
        edges: [
          ...g.edges,
          {
            id: uid("e"),
            from: parentEdge.from,
            to: targetId,
            fromEdgeId: fromPoint.edgeId,
            fromPointIndex: fromPoint.index,
          },
        ],
      })),
    );

    if (!keepOpen) {
      set({ linkingFromPoint: null });
    }
    return;
  }
},

selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedId: null }),
selectEdgePoint: (selectedEdgePoint) => set({ selectedEdgePoint }),

openPanel: () => set({ panelOpen: true }),
closePanel: () => set({ panelOpen: false }),

  addEdgePoint: (edgeId, point, insertIndex) => {
  pushBeforeChange(set, get);
  set((s) =>
    updateCurrentGraph(s, (g) => ({
      ...g,
      edges: g.edges.map((e) => {
        if (e.id === edgeId) {
          const newPoints = [...(e.points ?? [])];
          const idx = Math.max(0, Math.min(newPoints.length, insertIndex));
          newPoints.splice(idx, 0, point);
          return { ...e, points: newPoints };
        }

        // сдвигаем индексы веток от этой связи
        if (
          e.fromEdgeId === edgeId &&
          e.fromPointIndex !== undefined &&
          e.fromPointIndex >= insertIndex
        ) {
          return { ...e, fromPointIndex: e.fromPointIndex + 1 };
        }
        return e;
      }),
    })),
  );
},

  moveEdgePoint: (edgeId, index, point) => {
    set((s) =>
      updateCurrentGraph(s, (g) => ({
        ...g,
        edges: g.edges.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                points: (e.points ?? []).map((p, i) =>
                  i === index ? point : p,
                ),
              }
            : e,
        ),
      })),
    );
  },

  removeEdgePoint: (edgeId, index) => {
  pushBeforeChange(set, get);
  set((s) =>
    updateCurrentGraph(s, (g) => {
      // ветки, которые шли от этой точки — удалить
      const branchesToRemove = new Set<string>();
      const collectBranches = (parentId: string, pointIdx: number) => {
        for (const e of g.edges) {
          if (
            e.fromEdgeId === parentId &&
            e.fromPointIndex === pointIdx &&
            !branchesToRemove.has(e.id)
          ) {
            branchesToRemove.add(e.id);
            // ветки от веток (если индекс тот же — по смыслу теряют смысл)
            // но у веток точки могут быть — оставим пока только прямые
          }
        }
      };
      collectBranches(edgeId, index);

      // также нужно "сдвинуть" индексы веток, если удаляемая точка была до них
      const updatedEdges = g.edges
        .filter((e) => !branchesToRemove.has(e.id))
        .map((e) => {
          if (e.id === edgeId) {
            return {
              ...e,
              points: (e.points ?? []).filter((_, i) => i !== index),
            };
          }
          // сдвиг индекса у веток от той же связи
          if (
            e.fromEdgeId === edgeId &&
            e.fromPointIndex !== undefined &&
            e.fromPointIndex > index
          ) {
            return { ...e, fromPointIndex: e.fromPointIndex - 1 };
          }
          return e;
        });

      return {
        ...g,
        edges: updatedEdges,
      };
    }),
  );
},

  removeEdge: (edgeId) => {
  pushBeforeChange(set, get);
  set((s) =>
    updateCurrentGraph(s, (g) => {
      // собираем все ветки, которые идут от этой связи
      const branchesToRemove = new Set<string>();
      const collectBranches = (parentId: string) => {
        for (const e of g.edges) {
          if (e.fromEdgeId === parentId && !branchesToRemove.has(e.id)) {
            branchesToRemove.add(e.id);
            collectBranches(e.id);
          }
        }
      };
      collectBranches(edgeId);

      return {
        ...g,
        edges: g.edges.filter(
          (e) => e.id !== edgeId && !branchesToRemove.has(e.id),
        ),
      };
    }),
  );
  set({ selectedEdgeId: null, selectedEdgePoint: null });
},

  undo: () => {
    flushPending(set, get);

    const state = get();
    if (state.past.length === 0) return;

    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, -1);
    const currentSnapshot: Snapshot = {
      graphs: structuredClone(state.graphs),
      currentGraphId: state.currentGraphId,
    };
    const newFuture = [currentSnapshot, ...state.future].slice(0, HISTORY_LIMIT);

    for (const g of Object.values(previous.graphs)) db.saveGraph(g);
    for (const gid of Object.keys(state.graphs)) {
      if (!previous.graphs[gid]) db.deleteGraphById(gid);
    }
    if (previous.currentGraphId) {
      db.setLastOpenedGraphId(previous.currentGraphId);
    }

    set({
      graphs: previous.graphs,
      currentGraphId: previous.currentGraphId,
      past: newPast,
      future: newFuture,
      selectedId: null,
      selectedEdgeId: null,
      linkingFrom: null,
      settingsOpen: false,
      panelOpen: false,
    });
  },

  redo: () => {
    flushPending(set, get);

    const state = get();
    if (state.future.length === 0) return;

    const next = state.future[0];
    const newFuture = state.future.slice(1);
    const currentSnapshot: Snapshot = {
      graphs: structuredClone(state.graphs),
      currentGraphId: state.currentGraphId,
    };
    const newPast = [...state.past, currentSnapshot].slice(-HISTORY_LIMIT);

    for (const g of Object.values(next.graphs)) db.saveGraph(g);
    for (const gid of Object.keys(state.graphs)) {
      if (!next.graphs[gid]) db.deleteGraphById(gid);
    }
    if (next.currentGraphId) {
      db.setLastOpenedGraphId(next.currentGraphId);
    }

    set({
      graphs: next.graphs,
      currentGraphId: next.currentGraphId,
      past: newPast,
      future: newFuture,
      selectedId: null,
      selectedEdgeId: null,
      linkingFrom: null,
      settingsOpen: false,
      panelOpen: false,
    });
  },
}));

window.addEventListener("beforeunload", () => {
  const state = useGraph.getState();
  for (const [id] of saveTimers.entries()) {
    const g = state.graphs[id];
    if (g) saveGraphNow(g);
  }
});
useGraph.subscribe((state) => {
  const root = document.documentElement;
  root.setAttribute("data-theme", state.settings.theme);

  const base =
    state.settings.fontSize === "small" ? 12 :
    state.settings.fontSize === "large" ? 16 :
    14;

  root.style.setProperty("--fs-base", `${base}px`);
  root.style.setProperty("--fs-md", `${base - 1}px`);
  root.style.setProperty("--fs-sm", `${base - 2}px`);
  root.style.setProperty("--fs-lg", `${base + 1}px`);
});
const uidNode = () => `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const uidEdge = () => `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const uidGraph = () => `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const uidProp = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

function findFreePosition(
  existingNodes: GraphNode[],
  baseX: number,
  baseY: number,
): { x: number; y: number } {
  // ищем свободное место, начиная с baseX, baseY
  let x = baseX;
  let y = baseY;
  let attempts = 0;
  while (attempts < 50) {
    const overlap = existingNodes.some(
      (n) =>
        Math.abs(n.x - x) < 200 &&
        Math.abs(n.y - y) < 100,
    );
    if (!overlap) return { x, y };
    x += 220;
    attempts++;
  }
  return { x, y };
}

function importNode(
  set: (partial: Partial<State>) => void,
  get: () => State,
  data: { node: Partial<GraphNode> },
) {
  const state = get();
  const graph = state.getCurrentGraph();
  if (!graph) return;

  const { node: srcNode } = data;
  if (!srcNode) return;

  const vp = graph.viewport;
  const centerX = (400 - vp.x) / vp.k;
  const centerY = (300 - vp.y) / vp.k;

  const pos = findFreePosition(graph.nodes, centerX - 80, centerY - 30);

  const newProp = (srcNode.props ?? []).map((p) => ({
    id: uidProp(),
    key: p.key,
    value: p.value,
  }));

  const node: GraphNode = {
    id: uidNode(),
    x: pos.x,
    y: pos.y,
    w: 160,
    h: 60,
    title: srcNode.title ?? t("defaults.importedNode"),
    props: newProp,
    modules: [...(srcNode.modules ?? [])],
    data: JSON.parse(JSON.stringify(srcNode.data ?? {})),
    childGraphId: null,
    color: srcNode.color,
    tags: srcNode.tags ? [...srcNode.tags] : undefined,
  };

  pushBeforeChange(set, get);
  const updated = updateCurrentGraph(get(), (g) => ({
    ...g,
    nodes: [...g.nodes, withSize(node)],
  }));
  set(updated);
}

function importGraph(
  set: (partial: Partial<State>) => void,
  get: () => State,
  data: { nodes: GraphNode[]; edges: GraphEdge[] },
) {
  const state = get();
  const currentGraph = state.getCurrentGraph();
  if (!currentGraph || !state.currentGraphId) return;

  const newGraphId = uidGraph();
  const now = Date.now();

  const idMap = new Map<string, string>();
  for (const n of data.nodes) {
    idMap.set(n.id, uidNode());
  }

  const newNodes: GraphNode[] = data.nodes.map((n) => {
    const mappedProps = (n.props ?? []).map((p) => ({
      id: uidProp(),
      key: p.key,
      value: p.value,
    }));
    return {
      id: idMap.get(n.id)!,
      x: n.x,
      y: n.y,
      w: n.w ?? 160,
      h: n.h ?? 60,
      title: n.title ?? "",
      props: mappedProps,
      modules: [...(n.modules ?? [])],
      data: JSON.parse(JSON.stringify(n.data ?? {})),
      childGraphId: null,
      color: n.color,
      tags: n.tags ? [...n.tags] : undefined,
    };
  });

  const edgeIdMap = new Map<string, string>();
  for (const e of data.edges) {
    edgeIdMap.set(e.id, uidEdge());
  }

  const newEdges: GraphEdge[] = data.edges
    .filter((e) => idMap.has(e.from) && idMap.has(e.to))
    .map((e) => {
      const mapped: GraphEdge = {
        id: edgeIdMap.get(e.id)!,
        from: idMap.get(e.from)!,
        to: idMap.get(e.to)!,
        label: e.label,
      };

      if (e.points && e.points.length > 0) {
        mapped.points = e.points.map((p) => ({ ...p }));
      }

      if (e.fromEdgeId && edgeIdMap.has(e.fromEdgeId)) {
        mapped.fromEdgeId = edgeIdMap.get(e.fromEdgeId)!;
        mapped.fromPointIndex = e.fromPointIndex;
      }

      return mapped;
    });

  if (newNodes.length > 0) {
    const minX = Math.min(...newNodes.map((n) => n.x));
    const minY = Math.min(...newNodes.map((n) => n.y));
    for (const n of newNodes) {
      n.x -= minX;
      n.y -= minY;
    }
  }

  const newGraph: Graph = {
    id: newGraphId,
    parentNodeId: null,
    parentGraphId: state.currentGraphId,
    nodes: newNodes,
    edges: newEdges,
    viewport: { x: 0, y: 0, k: 1 },
    createdAt: now,
    updatedAt: now,
  };

  const centerX = (400 - currentGraph.viewport.x) / currentGraph.viewport.k;
  const centerY = (300 - currentGraph.viewport.y) / currentGraph.viewport.k;

  const pos = findFreePosition(currentGraph.nodes, centerX - 80, centerY - 30);

  const parentNode: GraphNode = {
    id: uidNode(),
    x: pos.x,
    y: pos.y,
    w: 200,
    h: 60,
    title: t("defaults.importedGraph"),
    props: [],
    modules: [],
    data: {},
    childGraphId: newGraphId,
  };

  newGraph.parentNodeId = parentNode.id;

  pushBeforeChange(set, get);

  db.saveGraph(newGraph);

  const updatedCurrent: Graph = {
    ...currentGraph,
    nodes: [...currentGraph.nodes, withSize(parentNode)],
    updatedAt: Date.now(),
  };
  db.saveGraph(updatedCurrent);

  set({
    graphs: {
      ...state.graphs,
      [newGraphId]: newGraph,
      [state.currentGraphId]: updatedCurrent,
    },
  });
}

function importTree(
  set: (partial: Partial<State>) => void,
  get: () => State,
  data: { graphs: Record<GraphId, Graph> },
) {
  const state = get();
  const importedGraphs = data.graphs ?? {};

  const idMap = new Map<string, string>();
  for (const oldId of Object.keys(importedGraphs)) {
    idMap.set(oldId, uidGraph());
  }

  const nodeIdMap = new Map<string, string>();
  for (const g of Object.values(importedGraphs)) {
    for (const n of g.nodes) {
      nodeIdMap.set(n.id, uidNode());
    }
  }

  const edgeIdMap = new Map<string, string>();
  for (const g of Object.values(importedGraphs)) {
    for (const e of g.edges) {
      edgeIdMap.set(e.id, uidEdge());
    }
  }

  const newGraphs: Record<GraphId, Graph> = {};

  for (const [oldId, g] of Object.entries(importedGraphs)) {
    const newId = idMap.get(oldId)!;

    const newNodes: GraphNode[] = g.nodes.map((n) => ({
      id: nodeIdMap.get(n.id)!,
      x: n.x,
      y: n.y,
      w: n.w ?? 160,
      h: n.h ?? 60,
      title: n.title ?? "",
      props: (n.props ?? []).map((p) => ({
        id: uidProp(),
        key: p.key,
        value: p.value,
      })),
      modules: [...(n.modules ?? [])],
      data: JSON.parse(JSON.stringify(n.data ?? {})),
      childGraphId: n.childGraphId
        ? idMap.get(n.childGraphId) ?? null
        : null,
      color: n.color,
      tags: n.tags ? [...n.tags] : undefined,
    }));

    const newEdges: GraphEdge[] = g.edges.map((e) => {
      const mapped: GraphEdge = {
        id: edgeIdMap.get(e.id)!,
        from: nodeIdMap.get(e.from) ?? e.from,
        to: nodeIdMap.get(e.to) ?? e.to,
        label: e.label,
      };

      if (e.points && e.points.length > 0) {
        mapped.points = e.points.map((p) => ({ ...p }));
      }

      if (e.fromEdgeId && edgeIdMap.has(e.fromEdgeId)) {
        mapped.fromEdgeId = edgeIdMap.get(e.fromEdgeId)!;
        mapped.fromPointIndex = e.fromPointIndex;
      }

      return mapped;
    });

    newGraphs[newId] = {
      id: newId,
      parentNodeId: g.parentNodeId
        ? nodeIdMap.get(g.parentNodeId) ?? null
        : null,
      parentGraphId: g.parentGraphId
        ? idMap.get(g.parentGraphId) ?? null
        : null,
      nodes: newNodes,
      edges: newEdges,
      viewport: g.viewport ?? { x: 0, y: 0, k: 1 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  pushBeforeChange(set, get);

  for (const g of Object.values(newGraphs)) {
    db.saveGraph(g);
  }

  set({
    graphs: {
      ...state.graphs,
      ...newGraphs,
    },
  });
}