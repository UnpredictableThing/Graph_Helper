import { useGraph } from "../store/graphStore";
import { importFromFile } from "../utils/exportImport";
import ExportMenu from "./ExportMenu";
import { useEffect } from "react";
import { useT } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsAppModal({ open, onClose }: Props) {
  const t = useT();
  const settings = useGraph((s) => s.settings);
  const updateSettings = useGraph((s) => s.updateSettings);

  useEffect(() => {
  if (!open) return;
  const handler = () => onClose();
  window.addEventListener("close-settings-app", handler);
  return () => {
    window.removeEventListener("close-settings-app", handler);
  };
}, [open, onClose]);

  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <strong style={{ fontSize: 15 }}>{t("appSettings.title")}</strong>
          <button
            style={{ marginLeft: "auto", padding: "4px 10px" }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <Section title={t("appSettings.sectionAppearance")}>
          <Row label={t("appSettings.theme")}>
            <SegmentedControl
              options={[
                { value: "dark", label: t("appSettings.themeDark") },
                { value: "light", label: t("appSettings.themeLight") },
              ]}
              value={settings.theme}
              onChange={(v) =>
                updateSettings({ theme: v as "dark" | "light" })
              }
            />
          </Row>

          <Row label={t("appSettings.fontSize")}>
            <SegmentedControl
              options={[
                { value: "small", label: t("appSettings.fontSmall") },
                { value: "medium", label: t("appSettings.fontMedium") },
                { value: "large", label: t("appSettings.fontLarge") },
              ]}
              value={settings.fontSize}
              onChange={(v) =>
                updateSettings({
                  fontSize: v as "small" | "medium" | "large",
                })
              }
            />
          </Row>

          <Row label={t("appSettings.showGrid")}>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) =>
                updateSettings({ showGrid: e.target.checked })
              }
              style={{ accentColor: "var(--accent)" }}
            />
          </Row>
          <Row label={t("appSettings.snapToGrid")}>
  <input
    type="checkbox"
    checked={settings.snapToGrid}
    onChange={(e) =>
      updateSettings({ snapToGrid: e.target.checked })
    }
    style={{ accentColor: "var(--accent)" }}
  />
</Row>
          <Row label={t("appSettings.toolbarOffset")}>
  <SegmentedControl
    options={[
      { value: "off", label: t("appSettings.toolbarOffsetOff") },
      { value: "small", label: t("appSettings.toolbarOffsetSmall") },
      { value: "medium", label: t("appSettings.toolbarOffsetMedium") },
      { value: "large", label: t("appSettings.toolbarOffsetLarge") },
    ]}
    value={settings.toolbarOffset}
    onChange={(v) =>
      updateSettings({ toolbarOffset: v as "off" | "small" | "medium" | "large" })
    }
  />
</Row>
        </Section>

        <Section title={t("appSettings.sectionData")}>
  <Row label={t("appSettings.export")}>
    <ExportMenu />
  </Row>

  <Row label={t("appSettings.import")}>
    <button
      onClick={async () => {
        const result = await importFromFile();
        if (!result.ok) {
          if (result.error !== "Отменено") {
            alert(result.error ?? t("appSettings.importError"));
          }
          return;
        }
        useGraph.getState().importData(result.type!, result.data);
      }}
    >
      {t("appSettings.importFromFile")}
    </button>
  </Row>
</Section>

        <Section title={t("appSettings.sectionLanguage")}>
          <Row label={t("appSettings.language")}>
            <SegmentedControl
              options={[
                { value: "ru", label: t("appSettings.langRu") },
                { value: "en", label: t("appSettings.langEn") },
              ]}
              value={settings.language}
              onChange={(v) =>
                updateSettings({ language: v as "ru" | "en" })
              }
            />
          </Row>
        </Section>

        <Section title={t("appSettings.sectionAbout")}>
          <Row label={t("appSettings.version")}>
            <span style={{ fontSize: "var(--fs-md)", color: "var(--text-secondary)" }}>
              0.2.5
            </span>
          </Row>
          <Row label={t("appSettings.privacy")}>
            <button onClick={() => alert(t("appSettings.privacyLater"))}>
              {t("appSettings.privacyOpen")}
            </button>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: "var(--fs-sm)",
          color: "var(--text-secondary)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 0",
        gap: 12,
      }}
    >
      <span style={{ fontSize: "var(--fs-md)" }}>{label}</span>
      {children}
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--bg-primary)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "4px 10px",
            fontSize: "var(--fs-sm)",
            background:
              value === opt.value ? "var(--bg-elevated)" : "transparent",
            border: "none",
            borderRight: "1px solid var(--border)",
            color:
              value === opt.value
                ? "var(--accent-hover)"
                : "var(--text-secondary)",
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
          {opt.label}
        </button>
      ))}
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
};

const modalStyle: React.CSSProperties = {
  width: 420,
  maxWidth: "90vw",
  maxHeight: "85vh",
  overflowY: "auto",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 18,
  color: "var(--text-primary)",
};