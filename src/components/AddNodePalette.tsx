import { useState, useEffect } from "react";
import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import { CloseIcon } from "./icons";
import { MODULES } from "../modules/registry";
import type { PaletteLayout, NodeProp } from "../engine/types";

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


export default function AddNodePalette() {
  const t = useT();
  const paletteOpen = useGraph((s) => s.paletteOpen);
  const closePalette = useGraph((s) => s.closePalette);
  const confirmPalette = useGraph((s) => s.confirmPalette);
  const defaultConfig = useGraph((s) => s.paletteConfig);

  const [count, setCount] = useState(defaultConfig.count);
  const [layout, setLayout] = useState<PaletteLayout>(defaultConfig.layout);
  const [color, setColor] = useState<string | undefined>(defaultConfig.color);
  const [title, setTitle] = useState(defaultConfig.node.title);
  const [modules, setModules] = useState<string[]>(defaultConfig.node.modules);
  const [props, setProps] = useState<NodeProp[]>(defaultConfig.node.props);

  // сброс при открытии
  useEffect(() => {
    if (paletteOpen) {
      setCount(defaultConfig.count);
      setLayout(defaultConfig.layout);
      setColor(defaultConfig.color);
      setTitle(defaultConfig.node.title);
      setModules(defaultConfig.node.modules);
      setProps(defaultConfig.node.props);
    }
  }, [paletteOpen]);

  if (!paletteOpen) return null;

  const onConfirm = () => {
    confirmPalette({
      count,
      layout,
      color,
      node: {
        title,
        props,
        modules,
        data: {},   // TODO: данные модулей — следующий шаг
      },
    });
  };

  return (
    <div style={overlayStyle} onClick={closePalette}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div style={headerStyle}>
          <strong style={{ fontSize: 15 }}>{t("palette.title")}</strong>
          <button onClick={closePalette} style={closeBtnStyle}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "4px 20px 20px" }}>
          {/* Схема превью */}
          <PalettePreview count={count} layout={layout} color={color} />

          {/* Количество */}
          <Section label={t("palette.count")}>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <input
      type="range"
      onTouchStart={() => {}}
      min={1}
      max={20}
      value={count}
      onChange={(e) => setCount(Number(e.target.value))}
      style={{
        flex: 1,
        accentColor: "var(--accent)",
        cursor: "pointer",
        touchAction: "manipulation",
      }}
    />
    <span
      style={{
        minWidth: 32,
        textAlign: "center",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text-primary)",
      }}
    >
      {count}
    </span>
  </div>
</Section>

          {/* Расположение */}
          <Section label={t("palette.layout")}>
            <div style={{ display: "flex", gap: 6 }}>
              <LayoutChip
                active={layout === "column"}
                onClick={() => setLayout("column")}
                label={t("palette.layoutColumn")}
              />
              <LayoutChip
                active={layout === "grid"}
                onClick={() => setLayout("grid")}
                label={t("palette.layoutGrid")}
              />
              <LayoutChip
                active={layout === "circle"}
                onClick={() => setLayout("circle")}
                label={t("palette.layoutCircle")}
              />
            </div>
          </Section>

          {/* Цвет */}
          <Section label={t("palette.color")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                onClick={() => setColor(undefined)}
                title="Без цвета"
                style={{
                  ...colorDotStyle,
                  background: "var(--bg-primary)",
                  borderColor: !color ? "var(--text-primary)" : "var(--border)",
                }}
              >
                ×
              </button>
              {COLOR_PALETTE.map((p) => (
                <button
                  key={p.color}
                  onClick={() => setColor(p.color)}
                  title={p.name}
                  style={{
                    ...colorDotStyle,
                    background: p.color,
                    borderColor:
                      color === p.color
                        ? "var(--text-primary)"
                        : "var(--border)",
                    borderWidth: color === p.color ? 2 : 1,
                  }}
                />
              ))}
            </div>
          </Section>

          {/* Базовая вершина */}
          <Section label={t("palette.baseNode")}>
            <label style={labelStyle}>{t("properties.titleLabel")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />

            <label style={{ ...labelStyle, marginTop: 12 }}>
              {t("properties.modulesHeader")}
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MODULES.map((m) => {
                const active = modules.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      setModules((prev) =>
                        prev.includes(m.id)
                          ? prev.filter((x) => x !== m.id)
                          : [...prev, m.id],
                      )
                    }
                    style={{
                      ...chipStyle,
                      background: active ? "var(--bg-elevated)" : "transparent",
                      borderColor: active ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    {m.icon} {t(m.titleKey)}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Кнопка подтвердить */}
        <div style={footerStyle}>
          <button onClick={onConfirm} style={confirmBtnStyle}>
            {t("palette.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PalettePreview({
  count,
  layout,
  color,
}: {
  count: number;
  layout: PaletteLayout;
  color?: string;
}) {
  const BASE_W = 60;
  const BASE_H = 24;
  const BASE_GAP = 8;

  const positions: { x: number; y: number }[] = [];

  if (layout === "column") {
    for (let i = 0; i < count; i++) {
      positions.push({ x: 0, y: i * (BASE_H + BASE_GAP) });
    }
  } else if (layout === "grid") {
    for (let i = 0; i < count; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      positions.push({
        x: col * (BASE_W + BASE_GAP),
        y: row * (BASE_H + BASE_GAP),
      });
    }
  } else {
    const radius = Math.max(BASE_W * 1.8, count * 12);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: Math.cos(a) * radius,
        y: Math.sin(a) * radius,
      });
    }
  }

  // центр всех точек — чтобы центрировать по нему
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // масштаб — по bounding box с учётом размеров карточек
  const bboxW = maxX - minX + BASE_W;
  const bboxH = maxY - minY + BASE_H;

  const viewH = 180;
  const padding = 16;

  // доступная ширина — от контейнера (можно передать через пропс,
  // но проще ограничить max)
  const availW = 320 - padding * 2;
  const availH = viewH - padding * 2;

  const scale = Math.min(availW / bboxW, availH / bboxH, 1);

  const W = BASE_W * scale;
  const H = BASE_H * scale;

  return (
    <div
      style={{
        width: "100%",
        height: viewH,
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {positions.map((p, i) => {
        // смещение относительно центра
        const dx = (p.x - centerX) * scale;
        const dy = (p.y - centerY) * scale;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: W,
              height: H,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
              borderRadius: 6 * scale,
              background: color ?? "var(--bg-tertiary)",
              border: `1px solid ${color ? color : "var(--border)"}`,
              boxSizing: "border-box",
            }}
          />
        );
      })}
    </div>
  );
}



function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function LayoutChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        fontSize: 13,
        borderRadius: 6,
        background: active ? "var(--bg-elevated)" : "transparent",
        borderColor: active ? "var(--accent)" : "var(--border)",
        color: active ? "var(--accent-hover)" : "var(--text-primary)",
      }}
    >
      {label}
    </button>
  );
}

// ——— Стили ———

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 150,
  padding: 12,
};

const panelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  maxHeight: "85vh",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 20px",
  borderBottom: "1px solid var(--border-subtle)",
};

const closeBtnStyle: React.CSSProperties = {
  padding: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "1px solid var(--border)",
};

const footerStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderTop: "1px solid var(--border-subtle)",
  display: "flex",
  justifyContent: "flex-end",
};

const confirmBtnStyle: React.CSSProperties = {
  padding: "8px 20px",
  fontSize: 14,
  background: "var(--accent)",
  borderColor: "var(--accent)",
  color: "#fff",
};

const chipStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 13,
  borderRadius: 6,
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  cursor: "pointer",
};

const colorDotStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 14,
  border: "1px solid var(--border)",
  cursor: "pointer",
  padding: 0,
  fontSize: 14,
  color: "var(--text-secondary)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
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
  fontSize: 14,
  outline: "none",
};