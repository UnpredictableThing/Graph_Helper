import { useGraph } from "../store/graphStore";
import { CloseIcon, PlusIcon } from "./icons";

interface Props {
  canvasWidth: number;
  canvasHeight: number;
}

export default function PaletteIndicator({ canvasWidth, canvasHeight }: Props) {
  const paletteActive = useGraph((s) => s.paletteActive);
  const resetPalette = useGraph((s) => s.resetPalette);
  const treeOpen = useGraph((s) => s.treeOpen);
  const toolbarOffset = useGraph((s) => s.settings.toolbarOffset);

  if (!paletteActive) return null;

  const OFFSET_PX: Record<string, number> = {
    off: 0,
    small: 24,
    medium: 40,
    large: 56,
  };
  const extraTop = OFFSET_PX[toolbarOffset] ?? 0;

  const right = 16;
  // если открыт TreeNavigator — сдвигаем вниз, чтобы не перекрываться
  // (на десктопе TreeNavigator — справа сверху, 220×220)
  const treeOffset = treeOpen ? 240 : 0;
  const top = 16 + extraTop + treeOffset;

  // не выводим, если ушли за пределы canvas
  if (top > canvasHeight - 40 || canvasWidth < 100) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top,
        right,
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--accent)",
        borderRadius: 20,
        padding: 4,
        pointerEvents: "auto",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        zIndex: 20,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <PlusIcon size={16} color="#fff" />
      </div>

      <button
        onClick={resetPalette}
        title="Отменить режим"
        style={{
          width: 28,
          height: 28,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}