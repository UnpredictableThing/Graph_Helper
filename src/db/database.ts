import type { Graph } from "../engine/types";

const DB_NAME = "graph-constructor";
const DB_VERSION = 2;
const STORE_GRAPHS = "graphs";
const STORE_META = "meta";
const KEY_LAST_OPENED = "lastOpenedGraphId";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GRAPHS)) {
        db.createObjectStore(STORE_GRAPHS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

export async function saveGraph(graph: Graph): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GRAPHS, "readwrite");
    tx.objectStore(STORE_GRAPHS).put(graph);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllGraphs(): Promise<Graph[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GRAPHS, "readonly");
    const req = tx.objectStore(STORE_GRAPHS).getAll();
    req.onsuccess = () => resolve(req.result as Graph[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGraphById(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_GRAPHS, "readwrite");
    tx.objectStore(STORE_GRAPHS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function setLastOpenedGraphId(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put(id, KEY_LAST_OPENED);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLastOpenedGraphId(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(KEY_LAST_OPENED);
    req.onsuccess = () => resolve((req.result as string) ?? null);
    req.onerror = () => reject(req.error);
  });
}

import type { AppSettings } from "../engine/types";

const STORE_SETTINGS = "settings";
const KEY_SETTINGS = "app";

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put(settings, KEY_SETTINGS);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSettings(): Promise<AppSettings | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get(KEY_SETTINGS);
    req.onsuccess = () => resolve((req.result as AppSettings) ?? null);
    req.onerror = () => reject(req.error);
  });
}

const KEY_DEADLINE_HIDDEN = "deadlineHidden";

export async function getDeadlineHidden(): Promise<Record<string, number>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readonly");
    const req = tx.objectStore(STORE_META).get(KEY_DEADLINE_HIDDEN);
    req.onsuccess = () => resolve((req.result as Record<string, number>) ?? {});
    req.onerror = () => reject(req.error);
  });
}

export async function setDeadlineHidden(map: Record<string, number>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, "readwrite");
    tx.objectStore(STORE_META).put(map, KEY_DEADLINE_HIDDEN);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}