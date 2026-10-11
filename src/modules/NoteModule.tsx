import { useGraph } from "../store/graphStore";
import type { ModuleProps } from "./registry";
import { useT } from "../i18n";

export function NoteModule({ nodeId }: ModuleProps) {
  const t = useT();
  const node = useGraph((s) =>
  s.currentGraphId
    ? s.graphs[s.currentGraphId]?.nodes.find((n) => n.id === nodeId) ?? null
    : null,
);
  const setModuleData = useGraph((s) => s.setModuleData);
  if (!node) return null;

  const data = (node.data.note as { text?: string }) ?? {};

  return (
    <textarea
      style={{ ...input, minHeight: 80, resize: "vertical" }}
      placeholder={t("modules.notePlaceholder")}
      value={data.text ?? ""}
      onChange={(e) => setModuleData(nodeId, "note", { text: e.target.value })}
    />
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