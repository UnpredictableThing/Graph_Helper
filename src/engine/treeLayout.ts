import type { Graph, GraphId } from "./types";
import { t } from "../i18n";

export interface TreeNode {
  graphId: GraphId;
  label: string;
  x: number;
  y: number;
  depth: number;
  children: TreeNode[];
  parentId: GraphId | null;
}

export interface TreeLayout {
  nodes: TreeNode[];
  byId: Map<GraphId, TreeNode>;
  width: number;
  height: number;
}

const LEVEL_GAP = 60;
const SIBLING_GAP = 40;

/**
 * Строим дерево графов от корня.
 * Корень — граф с parentGraphId === null.
 */
export function buildTree(graphs: Record<GraphId, Graph>): TreeLayout {
  const roots = Object.values(graphs).filter((g) => g.parentGraphId === null);
  if (roots.length === 0) {
    return { nodes: [], byId: new Map(), width: 0, height: 0 };
  }

  const byId = new Map<GraphId, TreeNode>();

  const build = (graph: Graph): TreeNode => {
    const node: TreeNode = {
      graphId: graph.id,
      label: getLabel(graph, graphs),
      x: 0,
      y: 0,
      depth: 0,
      children: [],
      parentId: graph.parentGraphId,
    };
    byId.set(graph.id, node);

    const children = Object.values(graphs).filter(
      (g) => g.parentGraphId === graph.id,
    );
    node.children = children.map(build);
    return node;
  };

  // строим все корни
  const rootNodes = roots.map(build);

  // расставляем каждый корень последовательно
  let cursorX = 0;
  const ROOT_GAP = 80; // расстояние между деревьями

  for (const root of rootNodes) {
  placeSubtree(root, 0, () => cursorX, () => { cursorX += SIBLING_GAP; });
  cursorX += ROOT_GAP;
}

  // собираем всех в плоский список
  const nodes: TreeNode[] = [];
  const collect = (n: TreeNode) => {
    nodes.push(n);
    n.children.forEach(collect);
  };
  rootNodes.forEach(collect);

  // нормализация координат
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  for (const n of nodes) {
    n.x -= minX;
  }

  return {
    nodes,
    byId,
    width: maxX - minX + SIBLING_GAP,
    height: maxY + LEVEL_GAP,
  };
}

function placeSubtree(
  node: TreeNode,
  depth: number,
  getCursor: () => number,
  advanceCursor: () => void,
): void {
  node.depth = depth;
  node.y = depth * LEVEL_GAP;

  if (node.children.length === 0) {
    node.x = getCursor();
    advanceCursor();
    return;
  }

  const startX = getCursor();
  for (const child of node.children) {
    placeSubtree(child, depth + 1, getCursor, advanceCursor);
  }
  const endX = getCursor();
  node.x = (startX + endX - SIBLING_GAP) / 2;
}

function getLabel(graph: Graph, graphs: Record<GraphId, Graph>): string {
  if (!graph.parentNodeId) return t("treeNav.rootLabel");
  const parent = graph.parentGraphId ? graphs[graph.parentGraphId] : null;
  const node = parent?.nodes.find((n) => n.id === graph.parentNodeId);
  return node?.title || t("treeNav.noName");
}

/**
 * Путь от корня до заданного графа — для подсветки.
 */
export function getParentChain(
  graphId: GraphId,
  byId: Map<GraphId, TreeNode>,
): GraphId[] {
  const chain: GraphId[] = [];
  let current: GraphId | null = graphId;
  while (current) {
    chain.push(current);
    const node = byId.get(current);
    if (!node) break;
    current = node.parentId;
  }
  return chain.reverse();
}