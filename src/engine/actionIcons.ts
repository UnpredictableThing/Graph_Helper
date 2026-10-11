export function drawExportIcon(
  ctx: CanvasRenderingContext2D,
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

  // стрелка вниз
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.25);
  ctx.lineTo(cx, cy + s * 0.15);
  ctx.stroke();

  // наконечник
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy + s * 0.02);
  ctx.lineTo(cx, cy + s * 0.18);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.02);
  ctx.stroke();

  // горизонтальная линия (полка)
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.25, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.25, cy + s * 0.3);
  ctx.stroke();

  ctx.restore();
}