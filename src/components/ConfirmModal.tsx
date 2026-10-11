interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

import { useT } from "../i18n";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const finalConfirmLabel = confirmLabel ?? t("common.confirm");
  const finalCancelLabel = cancelLabel ?? t("common.cancel");

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: "var(--fs-md)", color: "var(--text-secondary)", marginBottom: 16 }}>
            {message}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}>{finalCancelLabel}</button>
          <button
  onClick={onConfirm}
  style={
    danger
      ? {
          background: "var(--danger-bg)",
          borderColor: "var(--danger-border)",
          color: "var(--danger-text)",
        }
      : undefined
  }
>
  {finalConfirmLabel}
</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
  pointerEvents: "auto",
};

const modalStyle: React.CSSProperties = {
  width: 360,
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 18,
  color: "var(--text-primary)",
};