const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, HTMLImageElement>();
let onChange: (() => void) | null = null;

export function setImageCacheListener(fn: () => void) {
  onChange = fn;
}

export function getImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  const cached = cache.get(src);
  if (cached && cached.complete) return cached;
  if (pending.has(src)) return null;

  const img = new Image();
  img.onload = () => {
    cache.set(src, img);
    pending.delete(src);
    onChange?.();
  };
  img.onerror = () => {
    pending.delete(src);
  };
  img.src = src;
  pending.set(src, img);
  return null;
}