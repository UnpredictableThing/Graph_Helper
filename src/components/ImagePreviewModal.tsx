import { useState, useRef, useEffect } from "react";
import { useT } from "../i18n";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export default function ImagePreviewModal({ src, alt, onClose }: Props) {
  const t = useT();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  const pinchRef = useRef<{
    startDist: number;
    startZoom: number;
  } | null>(null);

  // сброс при смене src
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  // Escape → закрыть
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clampOffset = (x: number, y: number, z: number) => {
  // ослабленный clamp — картинка может уходить далеко
  const maxOffset = 800 * (z - 1);
  return {
    x: Math.max(-maxOffset, Math.min(maxOffset, x)),
    y: Math.max(-maxOffset, Math.min(maxOffset, y)),
  };
};

  // Колесо мыши
  const onWheel = (e: React.WheelEvent) => {
  const container = e.currentTarget as HTMLDivElement;
  const rect = container.getBoundingClientRect();
  // точка курсора относительно центра контейнера
  const cx = e.clientX - rect.left - rect.width / 2;
  const cy = e.clientY - rect.top - rect.height / 2;

  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));

  if (newZoom === zoom) return;

  const ratio = newZoom / zoom;
  // новая позиция offset, чтобы точка под курсором осталась на месте
  const newOffsetX = cx - (cx - offset.x) * ratio;
  const newOffsetY = cy - (cy - offset.y) * ratio;

  setZoom(newZoom);
  if (newZoom === MIN_ZOOM) {
    setOffset({ x: 0, y: 0 });
  } else {
    setOffset(clampOffset(newOffsetX, newOffsetY, newZoom));
  }
};

  // Мышь — drag для панорамирования при zoom > 1
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setOffset(
      clampOffset(d.startOffsetX + dx, d.startOffsetY + dy, zoom),
    );
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  // Тач — pinch и drag
  const touchDist = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return 0;
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    return Math.hypot(
      t1.clientX - t0.clientX,
      t1.clientY - t0.clientY,
    );
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        startDist: touchDist(e) || 1,
        startZoom: zoom,
      };
      return;
    }

    if (e.touches.length === 1 && zoom > 1) {
      const t = e.touches[0];
      dragRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
    const dist = touchDist(e) || 1;
    const factor = dist / pinchRef.current.startDist;
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, pinchRef.current.startZoom * factor),
    );

    if (newZoom === zoom) return;

    // центр между пальцами относительно контейнера
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const t0 = e.touches[0];
    const t1 = e.touches[1];
    const midX = (t0.clientX + t1.clientX) / 2 - rect.left - rect.width / 2;
    const midY = (t0.clientY + t1.clientY) / 2 - rect.top - rect.height / 2;

    const ratio = newZoom / zoom;
    const newOffsetX = midX - (midX - offset.x) * ratio;
    const newOffsetY = midY - (midY - offset.y) * ratio;

    setZoom(newZoom);
    if (newZoom === MIN_ZOOM) {
      setOffset({ x: 0, y: 0 });
    } else {
      setOffset(clampOffset(newOffsetX, newOffsetY, newZoom));
    }
    return;
  }

    if (e.touches.length === 1 && dragRef.current) {
      const t = e.touches[0];
      const d = dragRef.current;
      const dx = t.clientX - d.startX;
      const dy = t.clientY - d.startY;
      setOffset(
        clampOffset(d.startOffsetX + dx, d.startOffsetY + dy, zoom),
      );
    }
  };

  const onTouchEnd = () => {
    if (pinchRef.current) pinchRef.current = null;
    if (dragRef.current) dragRef.current = null;
  };

  // Клик по фону закрывает ТОЛЬКО если не было перетаскивания
  const onBackdropClick = () => {
    if (dragRef.current) return;
    onClose();
  };

  useEffect(() => {
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prev;
  };
}, []);

  return (
    <div
      onClick={onBackdropClick}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        touchAction: "none",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <img
        src={src}
        alt={alt ?? ""}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 8,
          transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
          transition: "none",
          userSelect: "none",
          cursor: zoom > 1 ? "grab" : "default",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      />

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff",
          borderRadius: 20,
          fontSize: 20,
          cursor: "pointer",
        }}
        title={t("common.close")}
      >
        ×
      </button>

      {/* Индикатор зума */}
      {zoom > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}