import { useEffect, useRef, useState, useMemo } from "react";
import { useGraph } from "../store/graphStore";
import { buildTree, getParentChain } from "../engine/treeLayout";
import { renderTree, hitTestTree, type TreeViewport } from "../engine/treeRenderer";
import ConfirmModal from "./ConfirmModal";
import { useOrientation } from "../hooks/useOrientation";
import { useT } from "../i18n";

const DEFAULT_SIZE = 220;
const MIN_SIZE = 120;
const MAX_SIZE = 800;
const PULSE_DURATION = 400;

export default function TreeNavigator() {
  const t = useT();
  const orientation = useOrientation();
  const isPortrait = orientation === "portrait";

  const graphs = useGraph((s) => s.graphs);
  const currentGraphId = useGraph((s) => s.currentGraphId);
  const toggleTree = useGraph((s) => s.toggleTree);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: DEFAULT_SIZE, h: DEFAULT_SIZE });
  const [vp, setVp] = useState<TreeViewport>({ x: 20, y: 20, k: 1 });
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null);
  const [pulse, setPulse] = useState(0);
  const [hoverRoot, setHoverRoot] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const layout = useMemo(() => buildTree(graphs), [graphs]);

  const roots = useMemo(
    () => Object.values(graphs).filter((g) => g.parentGraphId === null),
    [graphs],
  );

const graphColors = useMemo(() => {
  const map = new Map<string, string>();
  for (const g of Object.values(graphs)) {
    if (g.parentNodeId && g.parentGraphId) {
      const parentGraph = graphs[g.parentGraphId];
      const parentNode = parentGraph?.nodes.find(
        (n) => n.id === g.parentNodeId,
      );
      if (parentNode?.color) {
        map.set(g.id, parentNode.color);
      }
    }
  }
  return map;
}, [graphs]);

  const parentChain = useMemo(() => {
    if (!currentGraphId) return [];
    return getParentChain(currentGraphId, layout.byId);
  }, [currentGraphId, layout]);

  const modeRef = useRef<
    | { kind: "idle" }
    | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  >({ kind: "idle" });

  const [rootPositions, setRootPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  useEffect(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    for (const r of roots) {
      const node = layout.byId.get(r.id);
      if (node) {
        positions[r.id] = {
          x: node.x * vp.k + vp.x,
          y: node.y * vp.k + vp.y,
        };
      }
    }
    setRootPositions(positions);
  }, [layout, vp, roots]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderTree(
  ctx,
  layout,
  vp,
  currentGraphId,
  parentChain,
  w,
  h,
  graphColors,
);;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [layout, vp, currentGraphId, parentChain, pulse, graphColors]);

  useEffect(() => {
    setPulse(1);
    const t = setTimeout(() => setPulse(0), PULSE_DURATION);
    return () => clearTimeout(t);
  }, [currentGraphId]);

  const getMouse = (e: React.MouseEvent | React.WheelEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { sx, sy } = getMouse(e);
    modeRef.current = { kind: "pan", sx, sy, vx: vp.x, vy: vp.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { sx, sy } = getMouse(e);
    const m = modeRef.current;

    if (m.kind === "pan") {
      setVp({ ...vp, x: m.vx + (sx - m.sx), y: m.vy + (sy - m.sy) });
      return;
    }

    const node = hitTestTree(layout, vp, sx, sy);
    if (node) {
      setHover({ x: sx, y: sy, label: node.label });
    } else {
      setHover(null);
    }
  };

  const onMouseUp = () => {
    modeRef.current = { kind: "idle" };
  };

  const onClick = (e: React.MouseEvent) => {
    const { sx, sy } = getMouse(e);
    const node = hitTestTree(layout, vp, sx, sy);
    if (!node) return;

    if (node.graphId === currentGraphId) {
      setPulse(1);
      setTimeout(() => setPulse(0), PULSE_DURATION);
      return;
    }

    useGraph.setState({ currentGraphId: node.graphId, selectedId: null });

    // в портрете — закрыть навигатор после выбора
    if (isPortrait) {
      setTimeout(() => toggleTree(), 150);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    const { sx, sy } = getMouse(e);
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const k = Math.min(3, Math.max(0.3, vp.k * factor));
    const wx = (sx - vp.x) / vp.k;
    const wy = (sy - vp.y) / vp.k;
    setVp({ k, x: sx - wx * k, y: sy - wy * k });
  };

  const onResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const w0 = size.w;
    const h0 = size.h;

    const onMove = (ev: MouseEvent) => {
      const dw = startX - ev.clientX;
      const dh = ev.clientY - startY;
      setSize({
        w: Math.min(MAX_SIZE, Math.max(MIN_SIZE, w0 + dw)),
        h: Math.min(MAX_SIZE, Math.max(MIN_SIZE, h0 + dh)),
      });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ——— Touch ———

const touchToScreenLocal = (touch: React.Touch) => {
  const r = canvasRef.current!.getBoundingClientRect();
  return { sx: touch.clientX - r.left, sy: touch.clientY - r.top };
};

const onTouchStart = (e: React.TouchEvent) => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const { sx, sy } = touchToScreenLocal(e.touches[0]);
    modeRef.current = { kind: "pan", sx, sy, vx: vp.x, vy: vp.y };
  }
};

const onTouchMove = (e: React.TouchEvent) => {
  e.preventDefault();
  const m = modeRef.current;
  if (m.kind === "pan" && e.touches.length === 1) {
    const { sx, sy } = touchToScreenLocal(e.touches[0]);
    setVp({ ...vp, x: m.vx + (sx - m.sx), y: m.vy + (sy - m.sy) });
  }
};

const onTouchEnd = (e: React.TouchEvent) => {
  e.preventDefault();

  

  const touch = e.changedTouches[0];
  if (touch) {
    const { sx, sy } = touchToScreenLocal(touch);
    const m = modeRef.current;

    if (m.kind === "pan") {
      const distMoved = Math.hypot(sx - m.sx, sy - m.sy);
      if (distMoved < 8) {
        // это тап — обрабатываем как клик
        const node = hitTestTree(layout, vp, sx, sy);
        if (node) {
          if (node.graphId === currentGraphId) {
            setPulse(1);
            setTimeout(() => setPulse(0), PULSE_DURATION);
          } else {
            useGraph.setState({
              currentGraphId: node.graphId,
              selectedId: null,
            });
            if (isPortrait) setTimeout(() => toggleTree(), 150);
          }
        }
      }
    }
  }

  modeRef.current = { kind: "idle" };
};

  const containerStyle: React.CSSProperties = isPortrait
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "var(--bg-primary)",
        border: pulse ? "2px solid #5b8def" : "1px solid #2a2f3a",
        boxShadow: pulse
          ? "0 0 20px rgba(91,141,239,0.5)"
          : "0 4px 12px rgba(0,0,0,0.4)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        zIndex: 100,
        overflow: "hidden",
      }
    : {
        position: "absolute",
        top: 20,
        right: 300,
        width: size.w,
        height: size.h,
        background: "var(--bg-primary)",
        border: pulse ? "2px solid #5b8def" : "1px solid #2a2f3a",
        boxShadow: pulse
          ? "0 0 20px rgba(91,141,239,0.5)"
          : "0 4px 12px rgba(0,0,0,0.4)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        zIndex: 50,
        overflow: "hidden",
      };

  return (
    <div ref={wrapRef} style={containerStyle}>
      <canvas
  ref={canvasRef}
  style={{
    width: "100%",
    height: "100%",
    display: "block",
    cursor: "pointer",
    touchAction: "none",
  }}
  onMouseDown={onMouseDown}
  onMouseMove={onMouseMove}
  onMouseUp={onMouseUp}
  onMouseLeave={onMouseUp}
  onClick={onClick}
  onWheel={onWheel}
  onTouchStart={onTouchStart}
  onTouchMove={onTouchMove}
  onTouchEnd={onTouchEnd}
  onTouchCancel={onTouchEnd}
/>

      {/* Кнопка × — закрывает навигатор в портрете */}
      {isPortrait && (
        <button
          onClick={() => toggleTree()}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: "1px solid var(--border)",
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            padding: 0,
          }}
          title={t("treeNav.close")}
        >
          ×
        </button>
      )}

      {/* Кнопки × для удаления корней */}
      {roots.length > 1 &&
        Object.entries(rootPositions).map(([gid, pos]) => (
          <button
            key={gid}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(gid);
            }}
            onMouseEnter={() => setHoverRoot(gid)}
            onMouseLeave={() => setHoverRoot(null)}
            style={{
              position: "absolute",
              left: pos.x - 8,
              top: pos.y - 26,
              width: 16,
              height: 16,
              borderRadius: 8,
              border: "1px solid #5a2a2a",
              background: "#3a1d1d",
              color: "#e07070",
              fontSize: 11,
              lineHeight: 1,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: hoverRoot === gid ? 1 : 0,
              transition: "opacity 0.15s",
              pointerEvents: "auto",
              zIndex: 10,
            }}
            title={t("treeNav.deleteTreeTooltip")}
          >
            ×
          </button>
        ))}

      {/* Ручка resize — только в ландшафте */}
      {!isPortrait && (
        <div
          onMouseDown={onResizeDown}
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 14,
            height: 14,
            cursor: "nesw-resize",
            background: "transparent",
          }}
        />
      )}

      {hover && !isPortrait && (
        <div
          style={{
            position: "absolute",
            left: hover.x + 12,
            top: hover.y + 12,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 11,
            color: "var(--text-primary)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 60,
          }}
        >
          {hover.label}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title={t("treeNav.confirmDeleteTitle")}
        message={t("treeNav.confirmDeleteMessage")}
        confirmLabel={t("treeNav.confirmDeleteLabel")}
        danger
        onConfirm={() => {
          if (deleteTarget) {
            useGraph.getState().deleteRootGraph(deleteTarget);
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}