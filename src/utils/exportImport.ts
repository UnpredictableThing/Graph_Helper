import type { Graph, GraphId, GraphNode } from "../engine/types";

const FORMAT = "graph-constructor";
const VERSION = 1;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isTauriEnv(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function downloadJSONWeb(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveJSONNative(data: unknown, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    defaultPath: filename,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!path) return;
  await writeTextFile(path, json);
}

async function writeJSON(data: unknown, filename: string): Promise<void> {
  if (isTauriEnv()) {
    await saveJSONNative(data, filename);
  } else {
    downloadJSONWeb(data, filename);
  }
}

export async function exportTree(
  graphs: Record<GraphId, Graph>,
): Promise<void> {
  const data = {
    format: FORMAT,
    version: VERSION,
    type: "tree",
    exportedAt: new Date().toISOString(),
    data: { graphs },
  };
  await writeJSON(data, `graph-tree-${todayStr()}.json`);
}

export async function exportGraph(graph: Graph): Promise<void> {
  const cleaned = {
    nodes: graph.nodes.map((n) => ({ ...n, childGraphId: null })),
    edges: graph.edges,
  };
  const data = {
    format: FORMAT,
    version: VERSION,
    type: "graph",
    exportedAt: new Date().toISOString(),
    data: cleaned,
  };
  await writeJSON(data, `graph-${todayStr()}.json`);
}

export async function exportNode(node: GraphNode): Promise<void> {
  const cleaned = {
    title: node.title,
    props: node.props,
    modules: node.modules,
    data: node.data,
    color: node.color,
    tags: node.tags,
  };
  const data = {
    format: FORMAT,
    version: VERSION,
    type: "node",
    exportedAt: new Date().toISOString(),
    data: { node: cleaned },
  };
  await writeJSON(data, `node-${todayStr()}.json`);
}

export interface ImportResult {
  ok: boolean;
  type?: "tree" | "graph" | "node";
  data?: unknown;
  error?: string;
}

async function pickFileWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function importFromFile(): Promise<ImportResult> {
  let text: string | null = null;

  if (isTauriEnv()) {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!path || Array.isArray(path)) {
        return { ok: false, error: "Отменено" };
      }
      text = await readTextFile(path);
    } catch {
      return { ok: false, error: "Не удалось открыть файл" };
    }
  } else {
    const file = await pickFileWeb();
    if (!file) return { ok: false, error: "Отменено" };
    text = await file.text();
  }

  if (!text) return { ok: false, error: "Пустой файл" };

  try {
    const parsed = JSON.parse(text);

    if (parsed.format !== FORMAT) {
      return { ok: false, error: "Неверный формат файла" };
    }
    if (parsed.version !== VERSION) {
      return {
        ok: false,
        error: `Несовместимая версия: ${parsed.version}`,
      };
    }
    if (!parsed.type || !parsed.data) {
      return { ok: false, error: "В файле нет данных" };
    }

    const t = parsed.type;

    if (t === "tree") {
      if (
        !parsed.data.graphs ||
        typeof parsed.data.graphs !== "object" ||
        Array.isArray(parsed.data.graphs)
      ) {
        return { ok: false, error: "Повреждённые данные дерева" };
      }
    } else if (t === "graph") {
      if (
        !Array.isArray(parsed.data.nodes) ||
        !Array.isArray(parsed.data.edges)
      ) {
        return { ok: false, error: "Повреждённые данные графа" };
      }
    } else if (t === "node") {
      if (
        !parsed.data.node ||
        typeof parsed.data.node !== "object"
      ) {
        return { ok: false, error: "Повреждённые данные вершины" };
      }
    } else {
      return { ok: false, error: "Неизвестный тип файла" };
    }

    return { ok: true, type: t, data: parsed.data };
  } catch {
    return { ok: false, error: "Не удалось прочитать файл" };
  }
}