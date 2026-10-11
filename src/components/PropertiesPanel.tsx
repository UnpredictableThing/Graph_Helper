import { useState, useEffect } from "react";
import { useGraph } from "../store/graphStore";
import { getModule } from "../modules/registry";
import ConfirmModal from "./ConfirmModal";
import { useOrientation } from "../hooks/useOrientation";
import { useT } from "../i18n";

export default function PropertiesPanel() {
  const t = useT();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const orientation = useOrientation();

  const panelOpen = useGraph((s) => s.panelOpen);
  const closePanel = useGraph((s) => s.closePanel);

  const addNodeTag = useGraph((s) => s.addNodeTag);
  const removeNodeTag = useGraph((s) => s.removeNodeTag);

  const node = useGraph((s) =>
    s.currentGraphId && s.selectedId
      ? s.graphs[s.currentGraphId]?.nodes.find((n) => n.id === s.selectedId) ??
        null
      : null,
  );

  const updateNodeTitle = useGraph((s) => s.updateNodeTitle);
  const addNodeProp = useGraph((s) => s.addNodeProp);
  const renameNodeProp = useGraph((s) => s.renameNodeProp);
  const setNodePropValue = useGraph((s) => s.setNodePropValue);
  const removeNodeProp = useGraph((s) => s.removeNodeProp);
  const removeNode = useGraph((s) => s.removeNode);
  const openSettings = useGraph((s) => s.openSettings);

  useEffect(() => {
    setConfirmRemove(false);
  }, [node?.id]);

  useEffect(() => {
    if (confirmRemove && node && !node.childGraphId) {
      setConfirmRemove(false);
    }
  }, [node?.childGraphId, confirmRemove, node]);

  const isPortrait = orientation === "portrait";
  const show = isPortrait ? panelOpen && node : true;

  if (!show) {
    return null;
  }

  if (!node) {
    return isPortrait ? null : (
      <aside style={desktopPanelStyle}>
        <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-md)" }}>
          {t("properties.emptyHint")}
        </div>
      </aside>
    );
  }

  const content = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{t("properties.nodeHeader")}</span>
        <button
          style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "var(--fs-sm)" }}
          onClick={() => openSettings(node.id)}
          title={t("properties.settingsTooltip")}
        >
          ⋯
        </button>
        {isPortrait && (
          <button
            style={{ marginLeft: 6, padding: "4px 10px", fontSize: "var(--fs-sm)" }}
            onClick={closePanel}
            title={t("properties.closeTooltip")}
          >
            ×
          </button>
        )}
      </div>

      <label style={labelStyle}>{t("properties.titleLabel")}</label>
      <input
        style={inputStyle}
        value={node.title}
        onChange={(e) => updateNodeTitle(node.id, e.target.value)}
      />

      {/* Теги */}
<div style={{ marginTop: 16 }}>
  <label style={labelStyle}>{t("properties.tagsLabel")}</label>

  {/* список тегов */}
  {node.tags && node.tags.length > 0 && (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 8,
      }}
    >
      {node.tags.map((tag) => (
        <div
          key={tag}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 12,
            background: "var(--bg-elevated)",
            border: "1px solid #5b8def",
            fontSize: "var(--fs-sm)",
            color: "var(--accent-hover)",
          }}
        >
          <span>{tag}</span>
          <button
            onClick={() => removeNodeTag(node.id, tag)}
            style={{
              padding: 0,
              border: "none",
              background: "transparent",
              color: "var(--accent-hover)",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
            }}
            title={t("properties.removeTagTooltip")}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )}

  {/* поле добавления */}
  <div style={{ display: "flex", gap: 6 }}>
    <input
      style={{ ...inputStyle, flex: 1 }}
      placeholder={t("properties.newTagPlaceholder")}
      value={tagInput}
      onChange={(e) => setTagInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          addNodeTag(node.id, tagInput);
          setTagInput("");
        }
      }}
    />
    <button
      style={{ padding: "6px 12px", fontSize: "var(--fs-md)" }}
      onClick={() => {
        addNodeTag(node.id, tagInput);
        setTagInput("");
      }}
    >
      +
    </button>
  </div>
</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "var(--fs-md)" }}>{t("properties.propsHeader")}</span>
        <button
          style={{ marginLeft: "auto", padding: "4px 10px", fontSize: "var(--fs-sm)" }}
          onClick={() => addNodeProp(node.id)}
        >
          {t("properties.addProp")}
        </button>
      </div>

      {node.props.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)", padding: "4px 0" }}>
          {t("properties.emptyProps")}
        </div>
      )}

      {node.props.map((p) => (
        <div key={p.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            style={{ ...inputStyle, flex: "0 0 40%" }}
            value={p.key}
            onChange={(e) => renameNodeProp(node.id, p.id, e.target.value)}
          />
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={String(p.value)}
            onChange={(e) => setNodePropValue(node.id, p.id, e.target.value)}
          />
          <button
            style={{ padding: "4px 10px", fontSize: "var(--fs-sm)" }}
            title={t("properties.removePropTooltip")}
            onClick={() => removeNodeProp(node.id, p.id)}
          >
            ×
          </button>
        </div>
      ))}

      {node.modules.length > 0 && (
        <>
          <div style={{ marginTop: 24, fontWeight: 600, fontSize: "var(--fs-md)" }}>
            {t("properties.modulesHeader")}
          </div>
          {node.modules.map((moduleId) => {
            const def = getModule(moduleId);
            if (!def) return null;
            return (
              <div key={moduleId} style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{def.icon}</span>
                  <span>{t(def.titleKey)}</span>
                </div>
                <def.Panel nodeId={node.id} />
              </div>
            );
          })}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <button
  style={{
    width: "100%",
    background: "var(--danger-bg)",
    borderColor: "var(--danger-border)",
    color: "var(--danger-text)",
  }}
          onClick={() => {
            if (node.childGraphId) {
              setConfirmRemove(true);
            } else {
              removeNode(node.id);
            }
          }}
        >
          {t("properties.deleteNodeBtn")}
        </button>
      </div>

      <ConfirmModal
        open={confirmRemove}
        title={t("properties.deleteWithChildTitle")}
        message={t("properties.deleteWithChildMessage")}
        confirmLabel={t("properties.deleteWithChildLabel")}
        danger
        onConfirm={() => {
          removeNode(node.id);
          setConfirmRemove(false);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  );

  if (isPortrait) {
    return (
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: "40vh",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          borderRadius: "16px 16px 0 0",
          padding: 14,
          overflowY: "auto",
          color: "var(--text-primary)",
          zIndex: 100,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {content}
      </div>
    );
  }

  return <aside style={desktopPanelStyle}>{content}</aside>;
}

const desktopPanelStyle: React.CSSProperties = {
  width: 280,
  minWidth: 280,
  padding: 14,
  background: "var(--bg-secondary)",
  borderLeft: "1px solid var(--border-subtle)",
  overflowY: "auto",
  color: "var(--text-primary)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--fs-sm)",
  color: "var(--text-secondary)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: "var(--fs-md)",
  outline: "none",
};