import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import { useState, useRef, useEffect } from "react";
import { TreeIcon, CloseIcon, SearchIcon, TrashIcon } from "./icons";
import SettingsAppModal from "./SettingsAppModal";
import ConfirmModal from "./ConfirmModal";
import { CopyIcon } from "./icons";

const EMPTY_NODES: never[] = [];

export default function Toolbar() {
  const graph = useGraph((s) =>
    s.currentGraphId ? s.graphs[s.currentGraphId] : undefined,
  );
  const copySelection = useGraph((s) => s.copySelection);
  const startPasteMode = useGraph((s) => s.startPasteMode);
  const setViewport = useGraph((s) => s.setViewport);
  const treeOpen = useGraph((s) => s.treeOpen);
  const toggleTree = useGraph((s) => s.toggleTree);
  const searchQuery = useGraph((s) => s.searchQuery);
  const setSearchQuery = useGraph((s) => s.setSearchQuery);
  const getSearchMatches = useGraph((s) => s.getSearchMatches);
  const selectedIds = useGraph((s) => s.selectedIds);
  const selectedEdgeId = useGraph((s) => s.selectedEdgeId);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const t = useT();

  const nodes = graph?.nodes ?? EMPTY_NODES;

  const searchMatches = searchOpen ? getSearchMatches() : [];

  const addCenter = () => {
  useGraph.getState().openPalette();
};

  const fit = () => {
    if (!nodes.length) return;
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const k = 1;
    setViewport({ k, x: -minX * k + 40, y: -minY * k + 40 });
  };


  useEffect(() => {
  if (!searchOpen) return;
  const onClickOutside = (e: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setSearchOpen(false);
    }
  };
  window.addEventListener("mousedown", onClickOutside);
  return () => window.removeEventListener("mousedown", onClickOutside);
}, [searchOpen]);

const focusNode = (graphId: string, nodeId: string) => {
  const state = useGraph.getState();

  // 1. если вершина в другом графе — переходим в него
  if (state.currentGraphId !== graphId) {
    useGraph.setState({
      currentGraphId: graphId,
      selectedId: null,
      selectedEdgeId: null,
    });
    // сохраняем как последний открытый
    import("../db/database").then((db) => {
      db.setLastOpenedGraphId(graphId);
    });
  }

  // 2. ждём рендер — потом центрируем
  setTimeout(() => {
    const s = useGraph.getState();
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
};

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 10,
          background: "var(--bg-secondary)",
          borderBottom: searchOpen ? "none" : "1px solid var(--border-subtle)",
        }}
      >
        <button onClick={addCenter}>{t("toolbar.addNode")}</button>
        <button onClick={fit}>{t("toolbar.fit")}</button>
        <button
          onClick={toggleTree}
          title={treeOpen ? t("toolbar.treeClose") : t("toolbar.treeOpen")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {treeOpen ? <CloseIcon size={14} /> : <TreeIcon size={14} />}
        </button>
        <button
  onClick={() => {
    setSearchOpen(true);
    setTimeout(() => {
      const input = document.getElementById("search-input");
      if (input) (input as HTMLInputElement).focus();
    }, 50);
  }}
  title={t("toolbar.search")}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <SearchIcon size={14} />
</button>

<button
  onClick={() => setSettingsOpen(true)}
  title="Настройки"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  ⚙
</button>
        <div
  style={{
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 8,
  }}
>
  {selectedIds.length > 0 && (
  <>
    {selectedIds.length > 1 && (
      <span
        style={{
          color: "var(--text-secondary)",
          fontSize: "var(--fs-sm)",
        }}
      >
        {selectedIds.length} {t("toolbar.selectedCount")}
      </span>
    )}
    <button
      onClick={() => {
        copySelection();
        startPasteMode();
      }}
      title={t("toolbar.copy")}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CopyIcon size={14} />
    </button>
    <button
      onClick={() => setConfirmDelete(true)}
      title={t("toolbar.deleteSelected")}
      style={{
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
  </>
)}

  {selectedIds.length === 0 && selectedEdgeId && (
    <button
      onClick={() => {
        const state = useGraph.getState();
        if (state.selectedEdgeId) {
          state.removeEdge(state.selectedEdgeId);
        }
      }}
      title={t("toolbar.deleteEdge")}
      style={{
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
  )}
</div>
      </div>

      {searchOpen && (
  <div
    ref={searchRef}
    style={{
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border-subtle)",
    }}
  >
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "6px 10px",
      }}
    >
      <input
        id="search-input"
        type="text"
        placeholder={t("search.placeholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setSearchQuery("");
            setSearchOpen(false);
          }
        }}
        style={{
          flex: 1,
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: "var(--fs-md)",
          outline: "none",
        }}
      />
      <button
        onClick={() => {
          setSearchQuery("");
          setSearchOpen(false);
        }}
        style={{
          padding: "4px 10px",
          fontSize: "var(--fs-sm)",
        }}
      >
        ×
      </button>
    </div>

    {searchQuery.trim() && (
      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {searchMatches.length === 0 ? (
          <div
            style={{
              padding: "8px 12px",
              fontSize: "var(--fs-sm)",
              color: "var(--text-muted)",
            }}
          >
            {t("search.empty")}
          </div>
        ) : (
          searchMatches.slice(0, 50).map((m) => (
  <button
    key={`${m.graphId}-${m.node.id}`}
    onClick={() => focusNode(m.graphId, m.node.id)}
    style={{
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "6px 12px",
      background: "transparent",
      border: "none",
      borderBottom: "1px solid var(--border-subtle)",
      color: "var(--text-primary)",
      fontSize: "var(--fs-md)",
      cursor: "pointer",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = "var(--bg-tertiary)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = "transparent";
    }}
  >
    <div style={{ fontWeight: 500 }}>
      {m.node.title || t("search.noName")}
    </div>
    <div
      style={{
        fontSize: 11,
        color: "var(--text-secondary)",
        marginTop: 2,
        display: "flex",
        gap: 8,
      }}
    >
      {m.path && (
        <span style={{ color: "var(--accent)" }}>→ {m.path}</span>
      )}
      {m.node.tags && m.node.tags.length > 0 && (
        <span>{m.node.tags.join(" · ")}</span>
      )}
    </div>
  </button>
))
        )}
      </div>
    )}
  </div>
)}
        <SettingsAppModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
    />
    <ConfirmModal
  open={confirmDelete}
  title={
  selectedIds.length > 1
    ? t("confirm.deleteMultiTitle", { n: selectedIds.length })
    : t("confirm.deleteOneTitle")
}
message={
  selectedIds.length > 1
    ? t("confirm.deleteMultiMessage")
    : t("confirm.deleteOneMessage")
}
confirmLabel={t("confirm.deleteLabel")}
  danger
  onConfirm={() => {
    for (const id of selectedIds) {
      useGraph.getState().removeNode(id);
    }
    setConfirmDelete(false);
  }}
  onCancel={() => setConfirmDelete(false)}
/>
  </>
);
}