import ru from "./ru.json";
import en from "./en.json";
import { useGraph } from "../store/graphStore";
import type { TKey } from "./types";

export type Language = "ru" | "en";

const dicts: Record<Language, unknown> = { ru, en };

function lookup(dict: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
    if (cur === undefined) return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

function resolve(key: string, lang: Language): string {
  const fromLang = lookup(dicts[lang], key);
  if (fromLang !== undefined) return fromLang;
  const fromFallback = lookup(dicts.en, key);
  if (fromFallback !== undefined) return fromFallback;
  return key;
}

function interpolate(
  str: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) => {
    const v = vars[name];
    return v !== undefined ? String(v) : `{${name}}`;
  });
}

export function t(key: TKey, vars?: Record<string, string | number>): string {
  const lang = useGraph.getState().settings.language as Language;
  return interpolate(resolve(key, lang), vars);
}

export function useT(): (key: TKey, vars?: Record<string, string | number>) => string {
  const lang = useGraph((s) => s.settings.language) as Language;
  return (key: TKey, vars?: Record<string, string | number>) =>
    interpolate(resolve(key, lang), vars);
}