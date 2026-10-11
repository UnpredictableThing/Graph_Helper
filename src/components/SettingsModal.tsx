import { useGraph } from "../store/graphStore";
import { MODULES } from "../modules/registry";
import { useT } from "../i18n";

const COLOR_PALETTE: { name: string; color: string }[] = [
  { name: "Синий", color: "#5b8def" },
  { name: "Зелёный", color: "#4ea76b" },
  { name: "Красный", color: "#d9534f" },
  { name: "Оранжевый", color: "#e08a3c" },
  { name: "Фиолетовый", color: "#8b5cf6" },
  { name: "Бирюзовый", color: "#14b8a6" },
  { name: "Розовый", color: "#ec4899" },
  { name: "Жёлтый", color: "#eab308" },
  { name: "Голубой", color: "#38bdf8" },
  { name: "Серый", color: "#8892a6" },
];

export default function SettingsModal() {
  const t = useT();
  const settingsOpen = useGraph((s) => s.settingsOpen);
  const node = useGraph((s) =>
    s.currentGraphId && s.selectedId
      ? s.graphs[s.currentGraphId]?.nodes.find((n) => n.id === s.selectedId) ??
        null
      : null,
  );
  const toggleModule = useGraph((s) => s.toggleModule);
  const setModuleData = useGraph((s) => s.setModuleData);
  const closeSettings = useGraph((s) => s.closeSettings);
  const setNodeColor = useGraph((s) => s.setNodeColor);

  if (!settingsOpen || !node) return null;

  const onToggle = (id: string, def: (typeof MODULES)[number]) => {
    const has = node.modules.includes(id);
    if (!has && !node.data[id]) {
      setModuleData(node.id, id, def.defaultData());
    }
    toggleModule(node.id, id);
  };

  return (
    <div style={overlayStyle} onClick={closeSettings}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 12 }}
        >
          <strong style={{ fontSize: 15 }}>{t("nodeSettings.title")}</strong>
          <button
            style={{ marginLeft: "auto", padding: "4px 10px" }}
            onClick={closeSettings}
          >
            ×
          </button>
        </div>

        {/* Цвет вершины */}
<div style={{ marginBottom: 20 }}>
  <div
    style={{
      fontSize: 12,
      color: "var(--text-secondary)",
      marginBottom: 10,
    }}
  >
    {t("nodeSettings.colorLabel")}
  </div>

  {!node.color ? (
    <button
      onClick={() => setNodeColor(node.id, COLOR_PALETTE[1].color)}
      style={{
        width: "100%",
        padding: "8px 12px",
        fontSize: 13,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--text-primary)",
        cursor: "pointer",
      }}
    >
      {t("nodeSettings.colorChangeBtn")}
    </button>
  ) : (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {COLOR_PALETTE.map((p) => (
          <button
            key={p.color}
            onClick={() => setNodeColor(node.id, p.color)}
            title={p.name}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              border:
                node.color === p.color
                  ? "2px solid var(--text-primary)"
                  : "1px solid var(--border)",
              background: p.color,
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>

      <button
        onClick={() => setNodeColor(node.id, undefined)}
        style={{
          width: "100%",
          padding: "6px 10px",
          fontSize: 12,
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        {t("nodeSettings.colorResetBtn")}
      </button>
    </>
  )}
</div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 10,
          }}
        >
          {t("nodeSettings.modulesLabel")}
        </div>

        {MODULES.map((m) => {
          const active = node.modules.includes(m.id);
          return (
            <label
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                background: active
                  ? "var(--bg-elevated)"
                  : "transparent",
                border: "1px solid",
                borderColor: active
                  ? "var(--accent)"
                  : "var(--border)",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: active
                    ? "var(--accent)"
                    : "var(--text-muted)",
                  background: active
                    ? "var(--accent)"
                    : "var(--bg-primary)",
                  flexShrink: 0,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {active && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l5 5L20 7"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(m.id, m)}
                style={{ display: "none" }}
              />

              <span style={{ fontSize: 13 }}>{t(m.titleKey)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
};

const modalStyle: React.CSSProperties = {
  width: 380,
  maxHeight: "80vh",
  overflowY: "auto",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 16,
  color: "var(--text-primary)",
};