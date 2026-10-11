import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import type { ModuleProps } from "./registry";
import ImagePreviewModal from "../components/ImagePreviewModal";

export function ImageModule({ nodeId }: ModuleProps) {
  const t = useT();
  const node = useGraph((s) =>
    s.currentGraphId
      ? s.graphs[s.currentGraphId]?.nodes.find((n) => n.id === nodeId) ?? null
      : null,
  );
  const setModuleData = useGraph((s) => s.setModuleData);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!node) return null;

  const data = (node.data.image as { src?: string; alt?: string }) ?? {};

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setModuleData(nodeId, "image", { src: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button onClick={() => fileRef.current?.click()}>
        {data.src ? t("modules.imageReplace") : t("modules.imageUpload")}
      </button>
      <input
        style={input}
        placeholder={t("modules.imageAlt")}
        value={data.alt ?? ""}
        onChange={(e) => setModuleData(nodeId, "image", { alt: e.target.value })}
      />
      {data.src && (
        <ImageWithExpand src={data.src} alt={data.alt ?? ""} />
      )}
      {data.src && (
        <button
          style={{
            background: "var(--danger-bg)",
            borderColor: "var(--danger-border)",
            color: "var(--danger-text)",
          }}
          onClick={() => setModuleData(nodeId, "image", { src: "", alt: "" })}
        >
          {t("modules.imageDelete")}
        </button>
      )}
    </div>
  );
}

// ——— Картинка с кнопкой расширения ———

function ImageWithExpand({ src, alt }: { src: string; alt?: string }) {
  const [showButton, setShowButton] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div
        style={{ position: "relative", width: "100%" }}
        onClick={() => setShowButton((v) => !v)}
      >
        <img
          src={src}
          alt={alt ?? ""}
          style={{
            width: "100%",
            borderRadius: 6,
            border: "1px solid var(--border)",
            display: "block",
          }}
        />

        {showButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(true);
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
            }}
            title="Открыть полностью"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
          </button>
        )}
      </div>

      {previewOpen &&
        createPortal(
          <ImagePreviewModal
            src={src}
            alt={alt}
            onClose={() => setPreviewOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: "var(--fs-md)",
  outline: "none",
};