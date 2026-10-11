import { useRef } from "react";
import { useGraph } from "../store/graphStore";
import { useT } from "../i18n";
import type { ModuleProps } from "./registry";
import type { DeadlineItem, DeadlineOnce, DeadlineRecurring } from "../engine/types";

export function DeadlineModule({ nodeId }: ModuleProps) {
  const t = useT();
  const node = useGraph((s) =>
    s.currentGraphId
      ? s.graphs[s.currentGraphId]?.nodes.find((n) => n.id === nodeId) ?? null
      : null,
  );
  const setModuleData = useGraph((s) => s.setModuleData);

  if (!node) return null;

  const data = (node.data.deadline as { items?: DeadlineItem[] }) ?? { items: [] };
  const items = data.items ?? [];

  const update = (next: DeadlineItem[]) => {
    setModuleData(nodeId, "deadline", { items: next });
  };

  const updateItem = (id: string, next: DeadlineItem) => {
    update(items.map((it) => (it.id === id ? next : it)));
  };

  const removeItem = (id: string) => {
    update(items.filter((it) => it.id !== id));
  };

  const addOnce = () => {
    if (items.filter((i) => i.kind === "once").length >= 3) return;
    const now = Date.now();
    const item: DeadlineOnce = {
      kind: "once",
      id: `dl_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: t("deadline.newTitle"),
      at: now + 24 * 60 * 60 * 1000,
      createdAt: now,
      confirmed: false,
      showGreen: false,
    };
    update([...items, item]);
  };

  const addRecurring = () => {
  const now = Date.now();
  const item: DeadlineRecurring = {
    kind: "recurring",
    id: `dl_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: t("deadline.newTitle"),
    days: [1],
    hour: 9,
    minute: 0,
    enabled: false,
  };
  update([...items, item]);
};

  const onceItems = items.filter((it): it is DeadlineOnce => it.kind === "once");
  const recItems = items.filter((it): it is DeadlineRecurring => it.kind === "recurring");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {onceItems.length === 0 && recItems.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          {t("deadline.empty")}
        </div>
      )}

      {onceItems.map((item) => (
        <OnceRow
          key={item.id}
          item={item}
          onChange={(next) => updateItem(item.id, next)}
          onRemove={() => removeItem(item.id)}
        />
      ))}

      {recItems.map((item) => (
        <RecurringRow
          key={item.id}
          item={item}
          onChange={(next) => updateItem(item.id, next)}
          onRemove={() => removeItem(item.id)}
        />
      ))}

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={addOnce}
          disabled={onceItems.length >= 3}
          style={{
            flex: 1,
            opacity: onceItems.length >= 3 ? 0.5 : 1,
          }}
        >
          {t("deadline.add")}
        </button>
        <button onClick={addRecurring} style={{ flex: 1 }}>
          {t("deadline.addRecurring")}
        </button>
      </div>
    </div>
  );
}

function OnceRow({
  item,
  onChange,
  onRemove,
}: {
  item: DeadlineOnce;
  onChange: (next: DeadlineOnce) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const dt = new Date(item.at);
  const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;

  const onDateChange = (v: string) => {
    const [y, m, d] = v.split("-").map(Number);
    const nd = new Date(item.at);
    nd.setFullYear(y, m - 1, d);
    onChange({ ...item, at: nd.getTime() });
  };

  const onTimeChange = (v: string) => {
    const [h, min] = v.split(":").map(Number);
    const nd = new Date(item.at);
    nd.setHours(h, min, 0, 0);
    onChange({ ...item, at: nd.getTime() });
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...item, image: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 8,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--bg-tertiary)",
      }}
    >
      <input
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        placeholder={t("deadline.title")}
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => onDateChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="time"
          value={timeStr}
          onChange={(e) => onTimeChange(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
        <button
          onClick={() => fileRef.current?.click()}
          style={{ flex: 1, fontSize: "var(--fs-sm)" }}
        >
          {item.image ? t("deadline.imageReplace") : t("deadline.imageAdd")}
        </button>
        {item.image && (
          <button
            onClick={() => onChange({ ...item, image: undefined })}
            style={{
              fontSize: "var(--fs-sm)",
              background: "var(--danger-bg)",
              borderColor: "var(--danger-border)",
              color: "var(--danger-text)",
            }}
          >
            ×
          </button>
        )}
      </div>

      {item.image && (
        <img
          src={item.image}
          alt=""
          style={{
            width: 72,
            height: 72,
            objectFit: "cover",
            borderRadius: 6,
            border: "1px solid var(--border)",
          }}
        />
      )}

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "var(--fs-sm)",
          color: "var(--text-secondary)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={item.showGreen}
          onChange={(e) => onChange({ ...item, showGreen: e.target.checked })}
        />
        {t("deadline.showGreen")}
      </label>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={onRemove}
          style={{
            flex: 1,
            background: "var(--danger-bg)",
            borderColor: "var(--danger-border)",
            color: "var(--danger-text)",
            fontSize: "var(--fs-sm)",
          }}
        >
          {t("deadline.remove")}
        </button>
        <button
          onClick={() =>
            onChange({ ...item, createdAt: Date.now(), confirmed: true })
          }
          style={{
            flex: 1,
            fontSize: "var(--fs-sm)",
            background: "var(--bg-elevated)",
            borderColor: "var(--accent)",
            color: "var(--accent-hover)",
            cursor: "pointer",
          }}
        >
          {t("deadline.confirm")}
        </button>
      </div>
    </div>
  );
}

function RecurringRow({
  item,
  onChange,
  onRemove,
}: {
  item: DeadlineRecurring;
  onChange: (next: DeadlineRecurring) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const jsDays = [1, 2, 3, 4, 5, 6, 0];

  const timeStr = `${String(item.hour).padStart(2, "0")}:${String(item.minute).padStart(2, "0")}`;

  const toggleDay = (jsDay: number) => {
    const has = item.days.includes(jsDay);
    const next = has
      ? item.days.filter((d) => d !== jsDay)
      : [...item.days, jsDay];
    onChange({ ...item, days: next });
  };

  const onTimeChange = (v: string) => {
    const [h, m] = v.split(":").map(Number);
    onChange({ ...item, hour: h, minute: m });
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...item, image: String(reader.result) });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 8,
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--bg-tertiary)",
      }}
    >
      <input
        value={item.title}
        onChange={(e) => onChange({ ...item, title: e.target.value })}
        placeholder={t("deadline.title")}
        style={inputStyle}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {jsDays.map((jsDay, i) => {
          const active = item.days.includes(jsDay);
          return (
            <button
              key={jsDay}
              onClick={() => toggleDay(jsDay)}
              style={{
                width: 32,
                height: 28,
                padding: 0,
                fontSize: 12,
                background: active ? "var(--accent)" : "transparent",
                borderColor: active ? "var(--accent)" : "var(--border)",
                color: active ? "#fff" : "var(--text-primary)",
              }}
            >
              {dayLabels[i]}
            </button>
          );
        })}
      </div>

      <input
        type="time"
        value={timeStr}
        onChange={(e) => onTimeChange(e.target.value)}
        style={inputStyle}
      />

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
        <button
          onClick={() => fileRef.current?.click()}
          style={{ flex: 1, fontSize: "var(--fs-sm)" }}
        >
          {item.image ? t("deadline.imageReplace") : t("deadline.imageAdd")}
        </button>
        {item.image && (
          <button
            onClick={() => onChange({ ...item, image: undefined })}
            style={{
              fontSize: "var(--fs-sm)",
              background: "var(--danger-bg)",
              borderColor: "var(--danger-border)",
              color: "var(--danger-text)",
            }}
          >
            ×
          </button>
        )}
      </div>

      {item.image && (
        <img
          src={item.image}
          alt=""
          style={{
            width: 72,
            height: 72,
            objectFit: "cover",
            borderRadius: 6,
            border: "1px solid var(--border)",
          }}
        />
      )}

      <label
  style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "var(--fs-sm)",
    color: "var(--text-secondary)",
    cursor: "pointer",
  }}
>
  <input
    type="checkbox"
    checked={item.enabled}
    onChange={(e) =>
      onChange({
        ...item,
        enabled: e.target.checked,
        lastFiredAt: e.target.checked ? undefined : item.lastFiredAt,
      })
    }
  />
  {t("deadline.enabled")}
</label>

      <button
  onClick={onRemove}
  style={{
    background: "var(--danger-bg)",
    borderColor: "var(--danger-border)",
    color: "var(--danger-text)",
    fontSize: "var(--fs-sm)",
  }}
>
  {t("deadline.remove")}
</button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: "var(--fs-md)",
  outline: "none",
};