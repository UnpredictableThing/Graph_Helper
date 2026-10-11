import { useGraph } from "../store/graphStore";
import type { ModuleProps } from "./registry";
import { useT } from "../i18n";

export function LinkModule({ nodeId }: ModuleProps) {
  const t = useT();
  const node = useGraph((s) =>
  s.currentGraphId
    ? s.graphs[s.currentGraphId]?.nodes.find((n) => n.id === nodeId) ?? null
    : null,
);
  const setModuleData = useGraph((s) => s.setModuleData);
  if (!node) return null;

  const data = (node.data.link as { url?: string; label?: string }) ?? {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        style={input}
        placeholder={t("modules.linkUrl")}
        value={data.url ?? ""}
        onChange={(e) => setModuleData(nodeId, "link", { url: e.target.value })}
      />
      <input
        style={input}
        placeholder={t("modules.linkLabel")}
        value={data.label ?? ""}
        onChange={(e) => setModuleData(nodeId, "link", { label: e.target.value })}
      />
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#5b8def", fontSize: "var(--fs-sm)", wordBreak: "break-all" }}
        >
          {data.label || data.url}
        </a>
      )}
    </div>
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