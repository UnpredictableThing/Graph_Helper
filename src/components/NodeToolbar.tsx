import { useState } from "react";
import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import { worldToScreen } from "../engine/viewport";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  TrashIcon,
  LinkIcon,
} from "./icons";
import ConfirmModal from "./ConfirmModal";

interface Props {
  canvasWidth: number;
  canvasHeight: number;
}

export default function NodeToolbar({ canvasWidth, canvasHeight }: Props) {
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedId = useGraph((s) => s.selectedId);
  const graph = useGraph((s) =>
    s.currentGraphId ? s.graphs[s.currentGraphId] : undefined,
  );
  const linkingFrom = useGraph((s) => s.linkingFrom);
  const openChildGraph = useGraph((s) => s.openChildGraph);
  const openParentGraph = useGraph((s) => s.openParentGraph);
  const createChildGraph = useGraph((s) => s.createChildGraph);
  const deleteChildGraph = useGraph((s) => s.deleteChildGraph);
  const startLinking = useGraph((s) => s.startLinking);

  if (!selectedId || !graph) return null;

  const node = graph.nodes.find((n) => n.id === selectedId);
  if (!node) return null;

  const hasChild = Boolean(node.childGraphId);
  const hasParent = Boolean(graph.parentGraphId);
  const isLinking = linkingFrom === node.id;

  const vp = graph.viewport;
  const cx = node.x + node.w / 2;
  const bottomY = node.y + node.h;
  const screenCenter = worldToScreen(cx, bottomY, vp);

  const offsetY = 8;
  const left = screenCenter.x;
  const top = screenCenter.y + offsetY;

  const toolbarVisible =
    left >= 0 &&
    left <= canvasWidth &&
    top >= 0 &&
    top <= canvasHeight + 60;

  const buttons: Array<{
    key: string;
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    active?: boolean;
  }> = [];

  if (hasParent) {
    buttons.push({
      key: "up",
      title: t("nodeToolbar.up"),
      icon: <ArrowUpIcon size={14} />,
      onClick: () => openParentGraph(),
    });
  }

  buttons.push({
    key: "link",
    title: isLinking ? t("nodeToolbar.linkCancel") : t("nodeToolbar.link"),
    icon: <LinkIcon size={14} />,
    onClick: () => {
      if (isLinking) {
        useGraph.getState().cancelLinking();
      } else {
        startLinking(node.id);
      }
    },
    active: isLinking,
  });

  if (hasChild) {
    buttons.push({
      key: "down",
      title: t("nodeToolbar.down"),
      icon: <ArrowDownIcon size={14} />,
      onClick: () => openChildGraph(node.id),
    });
    buttons.push({
      key: "delete",
      title: t("nodeToolbar.deleteChild"),
      icon: <TrashIcon size={14} />,
      onClick: () => setConfirmDelete(true),
      danger: true,
    });
  } else {
    buttons.push({
      key: "create",
      title: t("nodeToolbar.createChild"),
      icon: <PlusIcon size={14} />,
      onClick: () => createChildGraph(node.id),
    });
  }

  return (
    <>
      {toolbarVisible && (
        <div
          style={{
            position: "absolute",
            left,
            top,
            transform: "translateX(-50%)",
            display: "flex",
            gap: 4,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 4,
            pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {buttons.map((b) => (
            <button
              key={b.key}
              title={b.title}
              onClick={b.onClick}
              style={{
                width: 28,
                height: 28,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: b.danger ? "var(--danger-bg)" : "transparent",
                borderColor: b.danger ? "var(--danger-border)" : "transparent",
                color: b.danger ? "var(--danger-text)" : "var(--text-secondary)",
              }}
            >
              {b.icon}
            </button>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title={t("nodeToolbar.confirmDeleteTitle")}
        message={t("nodeToolbar.confirmDeleteMessage")}
        confirmLabel={t("confirm.deleteLabel")}
        danger
        onConfirm={() => {
          deleteChildGraph(node.id);
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}