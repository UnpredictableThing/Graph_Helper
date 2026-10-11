import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import { collectDeadlines } from "../engine/deadlineEngine";
import { CloseIcon } from "./icons";

const HIDE_DURATION_MS = 3 * 60 * 60 * 1000;

const STATUS_COLORS: Record<string, string> = {
  green: "#4ea76b",
  yellow: "#eab308",
  red: "#d9534f",
  overdue: "#000000",
  recurring: "#5b8def",
};

export default function DeadlineNotifications() {
  const t = useT();
  const graphs = useGraph((s) => s.graphs);
  const now = useGraph((s) => s.now);
  const deadlineHidden = useGraph((s) => s.deadlineHidden);
  const hideDeadline = useGraph((s) => s.hideDeadline);
  const dismissRecurring = useGraph((s) => s.dismissRecurring);
  const openNodeById = useGraph((s) => s.openNodeById);

  const all = collectDeadlines(graphs, now);

  const visible = all.filter((entry) => {
    const { status, item } = entry;

    if (item.kind === "recurring") {
      return true;
    }

    if (status === "overdue" && deadlineHidden[item.id] !== undefined) {
      return false;
    }

    if (status === "green" && !item.showGreen) {
      return false;
    }

    const hideUntil = deadlineHidden[item.id];
    if (hideUntil !== undefined && hideUntil > now) {
      return false;
    }

    return true;
  });

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 30,
        pointerEvents: "none",
        maxWidth: 280,
      }}
    >
      {visible.map((entry, index) => {
        const { item, status, nodeTitle, graphId, nodeId } = entry;
        const isFront = index === 0;

        return (
          <div
            key={item.id}
            onClick={() => {
              openNodeById(graphId, nodeId);
            }}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              cursor: "pointer",
              transform: `translateX(${index * 8}px)`,
              opacity: isFront ? 1 : 0.85,
              zIndex: 30 - index,
            }}
          >
            <ClockIcon size={18} color={STATUS_COLORS[status] ?? STATUS_COLORS.recurring} />

            {item.image && (
              <img
                src={item.image}
                alt=""
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            )}

            <div
              style={{
                flex: 1,
                fontSize: 13,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.title || nodeTitle}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (item.kind === "recurring") {
                  dismissRecurring(graphId, nodeId, item.id);
                } else {
                  hideDeadline(item.id, Date.now() + HIDE_DURATION_MS);
                }
              }}
              style={{
                width: 20,
                height: 20,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                flexShrink: 0,
              }}
              title={t("common.close")}
            >
              <CloseIcon size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ClockIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}