import type { GraphNode, GraphEdge, NodeId } from "./types";

export type Side = "top" | "right" | "bottom" | "left";

export interface Point {
  x: number;
  y: number;
}

/**
 * Определяем, к какой грани узла `node` идёт связь в сторону `other`.
 */
export function pickSide(node: GraphNode, other: GraphNode): Side {
  const ncx = node.x + node.w / 2;
  const ncy = node.y + node.h / 2;
  const ocx = other.x + other.w / 2;
  const ocy = other.y + other.h / 2;

  const dx = ocx - ncx;
  const dy = ocy - ncy;

  const normX = dx / Math.max(node.w, 1);
  const normY = dy / Math.max(node.h, 1);

  if (Math.abs(normX) >= Math.abs(normY)) {
    return dx >= 0 ? "right" : "left";
  } else {
    return dy >= 0 ? "bottom" : "top";
  }
}

/**
 * Точка на грани узла по стороне и параметру t ∈ [0, 1].
 */
export function sideToPoint(node: GraphNode, side: Side, t: number): Point {
  const { x, y, w, h } = node;
  switch (side) {
    case "top":
      return { x: x + w * t, y };
    case "right":
      return { x: x + w, y: y + h * t };
    case "bottom":
      return { x: x + w * (1 - t), y: y + h };
    case "left":
      return { x, y: y + h * (1 - t) };
  }
}

/**
 * Для каждой связи вычисляем точки крепления на обоих концах.
 * Связи на одной грани сортируются по углу к цели, чтобы линии не пересекались.
 *
 * Связь между двумя вершинами — только одна (A↔B запрещено), поэтому
 * логика "пар" (isPair) не нужна.
 */
export function computeEdgePorts(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, { from: Point; to: Point }> {
  const nodeById = new Map<NodeId, GraphNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  type Attachment = {
    edgeId: string;
    role: "from" | "to";
    angle: number;
  };
  const byNodeSide = new Map<string, Attachment[]>();

  // ——— ШАГ 1: собираем обычные связи (без fromEdgeId) в byNodeSide ———
  for (const e of edges) {
    if (e.fromEdgeId !== undefined) continue;

    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b) continue;

    const sideA = pickSide(a, b);
    const sideB = pickSide(b, a);

    const angleA = Math.atan2(
      b.y + b.h / 2 - (a.y + a.h / 2),
      b.x + b.w / 2 - (a.x + a.w / 2),
    );
    const angleB = Math.atan2(
      a.y + a.h / 2 - (b.y + b.h / 2),
      a.x + a.w / 2 - (b.x + b.w / 2),
    );

    const keyA = `${a.id}|${sideA}`;
    const keyB = `${b.id}|${sideB}`;

    if (!byNodeSide.has(keyA)) byNodeSide.set(keyA, []);
    if (!byNodeSide.has(keyB)) byNodeSide.set(keyB, []);

    byNodeSide.get(keyA)!.push({ edgeId: e.id, role: "from", angle: angleA });
    byNodeSide.get(keyB)!.push({ edgeId: e.id, role: "to", angle: angleB });
  }

  // сортировка по граням
  for (const [key, list] of byNodeSide) {
    const side = key.split("|")[1] as Side;
    list.sort((p, q) => {
      if (side === "right" || side === "top") return p.angle - q.angle;
      return q.angle - p.angle;
    });
  }

  // ——— ШАГ 2: считаем порты для всех связей ———
  const result = new Map<string, { from: Point; to: Point }>();

  for (const e of edges) {
    const a = nodeById.get(e.from);
    const b = nodeById.get(e.to);
    if (!a || !b) continue;

    // ——— ВЕТКА: from = точка изгиба родителя, to = порт целевой вершины ———
    if (e.fromEdgeId !== undefined && e.fromPointIndex !== undefined) {
      const parentEdge = edges.find((pe) => pe.id === e.fromEdgeId);
      if (
        !parentEdge ||
        !parentEdge.points ||
        !parentEdge.points[e.fromPointIndex]
      ) {
        continue;
      }

      const pa = nodeById.get(parentEdge.from);
      const pb = nodeById.get(parentEdge.to);
      if (!pa || !pb) continue;

      const pmx = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2;
      const pmy = (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2;
      const fromPoint = {
        x: pmx + parentEdge.points[e.fromPointIndex].x,
        y: pmy + parentEdge.points[e.fromPointIndex].y,
      };

      // to — порт на грани целевой вершины
      const sideB = pickSide(b, a);
      const listB = byNodeSide.get(`${b.id}|${sideB}`) ?? [];
      const itemB = listB.find((x) => x.edgeId === e.id && x.role === "to");
      const idxB = itemB ? listB.indexOf(itemB) : 0;
      const nB = listB.length;
      const tB = nB > 1 ? (idxB + 1) / (nB + 1) : 0.5;

      result.set(e.id, {
        from: fromPoint,
        to: sideToPoint(b, sideB, tB),
      });
      continue;
    }

    // ——— ОБЫЧНАЯ СВЯЗЬ ———
    const sideA = pickSide(a, b);
    const sideB = pickSide(b, a);

    const listA = byNodeSide.get(`${a.id}|${sideA}`) ?? [];
    const listB = byNodeSide.get(`${b.id}|${sideB}`) ?? [];

    const itemA = listA.find((x) => x.edgeId === e.id && x.role === "from");
    const itemB = listB.find((x) => x.edgeId === e.id && x.role === "to");

    const idxA = itemA ? listA.indexOf(itemA) : 0;
    const idxB = itemB ? listB.indexOf(itemB) : 0;

    const nA = listA.length;
    const nB = listB.length;

    const tA = nA > 1 ? (idxA + 1) / (nA + 1) : 0.5;
    const tB = nB > 1 ? (idxB + 1) / (nB + 1) : 0.5;

    result.set(e.id, {
      from: sideToPoint(a, sideA, tA),
      to: sideToPoint(b, sideB, tB),
    });
  }

  return result;
}