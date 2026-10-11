let ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    const canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d")!;
  }
  return ctx;
}

export const FONT_SIZE = 14;
export const FONT_FAMILY = "system-ui, sans-serif";
export const LINE_HEIGHT = 18;

export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number = FONT_SIZE,
  fontFamily: string = FONT_FAMILY,
): string[] {
  const c = getCtx();
  c.font = `${fontSize}px ${fontFamily}`;

  if (!text) return [""];

  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (c.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        if (c.measureText(word).width > maxWidth) {
          let chunk = "";
          for (const ch of word) {
            if (c.measureText(chunk + ch).width > maxWidth) {
              lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
}

export function propLines(
  key: string,
  value: string | number | boolean,
  nodeWidth: number,
  padding: number = 12,
  fontSize: number = 11,
): string[] {
  const text = `${key}: ${value}`;
  return wrapText(text, nodeWidth - padding * 2, fontSize);
}