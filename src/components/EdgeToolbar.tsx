import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import { worldToScreen } from "../engine/viewport";
import { TrashIcon } from "./icons";

interface Props {
  canvasWidth: number;
  canvasHeight: number;
}

export default function EdgeToolbar({ canvasWidth, canvasHeight }: Props) {
  const t = useT();

  const selectedEdgeId = useGraph((s) => s.selectedEdgeId);
  const graph = useGraph((s) =>
    s.currentGraphId ? s.graphs[s.currentGraphId] : undefined,
  );
  const removeEdge = useGraph((s) => s.removeEdge);

  if (!selectedEdgeId || !graph) return null;

  const edge = graph.edges.find((e) => e.id === selectedEdgeId);
  if (!edge) return null;

  const a = graph.nodes.find((n) => n.id === edge.from);
  const b = graph.nodes.find((n) => n.id === edge.to);
  if (!a || !b) return null;

  let ax = a.x + a.w / 2;
let ay = a.y + a.h / 2;
const bx = b.x + b.w / 2;
const by = b.y + b.h / 2;

if (edge.fromEdgeId !== undefined && edge.fromPointIndex !== undefined) {
  const parentEdge = graph.edges.find((pe) => pe.id === edge.fromEdgeId);
  if (parentEdge && parentEdge.points && parentEdge.points[edge.fromPointIndex]) {
    const p = parentEdge.points[edge.fromPointIndex];
    if (p) {
      const pa = graph.nodes.find((n) => n.id === parentEdge.from);
      const pb = graph.nodes.find((n) => n.id === parentEdge.to);
      if (pa && pb) {
        const pmx = (pa.x + pa.w / 2 + pb.x + pb.w / 2) / 2;
        const pmy = (pa.y + pa.h / 2 + pb.y + pb.h / 2) / 2;
        ax = pmx + p.x;
        ay = pmy + p.y;
      }
    }
  }
}

let midX = (ax + bx) / 2;
let midY = (ay + by) / 2;

if (edge.points && edge.points.length > 0) {
  const last = edge.points[edge.points.length - 1];
  midX = midX + last.x;
  midY = midY + last.y;
}

  const vp = graph.viewport;
  const screenPos = worldToScreen(midX, midY, vp);

  const left = screenPos.x;
  const top = screenPos.y + 14;

  // отсечение — если за пределами холста, не показываем
  if (
    left < -50 ||
    left > canvasWidth + 50 ||
    top < -50 ||
    top > canvasHeight + 50
  ) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        transform: "translateX(-50%)",
        display: "flex",
        gap: 4,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 4,
        pointerEvents: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        zIndex: 10,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        title={t("edgeToolbar.delete")}
        onClick={() => removeEdge(edge.id)}
        style={{
          width: 28,
          height: 28,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--danger-bg)",
          borderColor: "var(--danger-border)",
          color: "var(--danger-text)",
        }}
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );
}