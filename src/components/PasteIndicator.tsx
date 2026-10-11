import { useEffect, useState } from "react";
import { useGraph } from "../store/graphStore";
import { CloseIcon } from "./icons";

const UNDO_DURATION_MS = 5000;

export default function PasteIndicator() {
  const pasteActive = useGraph((s) => s.pasteActive);
  const clipboard = useGraph((s) => s.clipboard);
  const cancelPasteMode = useGraph((s) => s.cancelPasteMode);
  const lastPaste = useGraph((s) => s.lastPaste);
  const undoPaste = useGraph((s) => s.undoPaste);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!lastPaste) {
      setProgress(0);
      return;
    }
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / UNDO_DURATION_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lastPaste]);

  if (!pasteActive && !lastPaste) return null;

  if (pasteActive && clipboard) {
    return (
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
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
          <PasteIcon size={16} color="#fff" />
        </div>
        <button
          onClick={cancelPasteMode}
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

  if (lastPaste) {
    const r = 22;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - progress);

    return (
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 56,
          height: 56,
          pointerEvents: "auto",
          zIndex: 20,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <svg
          width={56}
          height={56}
          viewBox="0 0 56 56"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle
            cx={28}
            cy={28}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <circle
            cx={28}
            cy={28}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 28 28)"
          />
        </svg>

        <button
          onClick={undoPaste}
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            width: 40,
            height: 40,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-tertiary)",
            border: "none",
            borderRadius: 20,
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <UndoIcon size={20} />
        </button>
      </div>
    );
  }

  return null;
}

function PasteIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="6" width="10" height="12" rx="1" stroke={color} strokeWidth="2" />
      <path d="M9 6V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UndoIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 14L4 9l5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h11a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}