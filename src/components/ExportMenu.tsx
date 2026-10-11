import { useEffect, useRef, useState } from "react";
import { useGraph } from "../store/graphStore";
import { exportTree, exportGraph } from "../utils/exportImport";
import { useT } from "../i18n";

export default function ExportMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const graphs = useGraph((s) => s.graphs);
  const currentGraphId = useGraph((s) => s.currentGraphId);

  // закрытие при клике вне
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const onTree = async () => {
  await exportTree(graphs);
  setOpen(false);
};

const onGraph = async () => {
  const g = currentGraphId ? graphs[currentGraphId] : undefined;
  if (!g) return;
  await exportGraph(g);
  setOpen(false);
};

  const onNode = () => {
  setOpen(false);
  window.dispatchEvent(new CustomEvent("close-settings-app"));
  useGraph.getState().startExportNode();
};

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)}>{t("export.menu")}</button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "100%",
            marginRight: 4,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 4,
            minWidth: 140,
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <MenuItem label={t("export.tree")} onClick={onTree} />
          <MenuItem label={t("export.graph")} onClick={onGraph} />
          <MenuItem label={t("export.node")} onClick={onNode} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "6px 12px",
        fontSize: 13,
        color: "var(--text-primary)",
        cursor: "pointer",
        borderRadius: 4,
        background: hover ? "var(--bg-elevated)" : "transparent",
      }}
    >
      {label}
    </div>
  );
}