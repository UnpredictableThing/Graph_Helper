export function drawModuleIcon(
  ctx: CanvasRenderingContext2D,
  moduleId: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const s = size;
  const cx = x + s / 2;
  const cy = y + s / 2;

  if (moduleId === "link") {
    // цепочка: два овальных звена
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.15, cy, s * 0.22, s * 0.13, -Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + s * 0.15, cy, s * 0.22, s * 0.13, -Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (moduleId === "image") {
    // рамка + горы
    ctx.strokeRect(x + s * 0.15, y + s * 0.2, s * 0.7, s * 0.6);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.2, y + s * 0.7);
    ctx.lineTo(x + s * 0.42, y + s * 0.45);
    ctx.lineTo(x + s * 0.6, y + s * 0.65);
    ctx.lineTo(x + s * 0.78, y + s * 0.5);
    ctx.stroke();
    // солнце
    ctx.beginPath();
    ctx.arc(x + s * 0.68, y + s * 0.35, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
  } else if (moduleId === "note") {
  // три горизонтальные линии
  const pad = s * 0.2;
  const w = s * 0.6;
  for (let i = 0; i < 3; i++) {
    const yy = y + pad + i * s * 0.22;
    ctx.beginPath();
    ctx.moveTo(x + pad, yy);
    ctx.lineTo(x + pad + w * (i === 2 ? 0.6 : 1), yy);
    ctx.stroke();
  }
} else if (moduleId === "deadline") {
  // часы
  const r = s * 0.32;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.55);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.45, cy);
  ctx.stroke();
}

  ctx.restore();
}