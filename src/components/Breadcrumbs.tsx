import { useGraph } from "../store/graphStore";
import { ChevronRightIcon } from "./icons";

export default function Breadcrumbs() {
  const setCurrentGraph = (id: string) => {
    // будем вызывать через getState, чтобы не плодить actions
    const state = useGraph.getState();
    if (!state.graphs[id]) return;
    setLastOpened(id);
    useGraph.setState({ currentGraphId: id, selectedId: null });
  };

  // получаем крошки через getState (не селектором, чтобы не зациклиться)
  const state = useGraph();
  const crumbs = state.getBreadcrumbs();

  if (crumbs.length <= 1) {
    // корневой граф — крошки не нужны
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "var(--bg-primary)",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--fs-sm)",
        color: "var(--text-secondary)",
        overflowX: "auto",
      }}
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <div
            key={c.graphId}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              onClick={() => !isLast && setCurrentGraph(c.graphId)}
              style={{
                cursor: isLast ? "default" : "pointer",
                color: isLast ? "var(--text-primary)" : "#8892a6",
                fontWeight: isLast ? 600 : 400,
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </span>
            {!isLast && <ChevronRightIcon size={12} color="var(--text-muted)" />}
          </div>
        );
      })}
    </div>
  );
}

function setLastOpened(id: string) {
  import("../db/database").then((db) => {
    db.setLastOpenedGraphId(id);
  });
}