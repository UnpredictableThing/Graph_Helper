export interface Pt {
  x: number;
  y: number;
}

/**
 * Catmull-Rom сплайн через точки.
 * tension: 0..1, чем больше — тем сильнее сглаживание.
 * Возвращает массив точек, по которым можно нарисовать кривую.
 */
export function catmullRom(
  points: Pt[],
  segmentsPerCurve: number = 20,
  tension: number = 0.15,
): Pt[] {
  if (points.length < 2) return points;

  const result: Pt[] = [];

  // дублируем первую и последнюю точку — для крайних сегментов
  const pts = [points[0], ...points, points[points.length - 1]];

  for (let i = 0; i < pts.length - 3; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const p2 = pts[i + 2];
    const p3 = pts[i + 3];

    for (let j = 0; j < segmentsPerCurve; j++) {
      const t = j / segmentsPerCurve;
      result.push(catmullRomPoint(p0, p1, p2, p3, t, tension));
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function catmullRomPoint(
  p0: Pt,
  p1: Pt,
  p2: Pt,
  p3: Pt,
  t: number,
  tension: number,
): Pt {
  const t2 = t * t;
  const t3 = t2 * t;

  const s = tension;

  const m1x = s * (p2.x - p0.x);
  const m1y = s * (p2.y - p0.y);
  const m2x = s * (p3.x - p1.x);
  const m2y = s * (p3.y - p1.y);

  const h1 = 2 * t3 - 3 * t2 + 1;
  const h2 = -2 * t3 + 3 * t2;
  const h3 = t3 - 2 * t2 + t;
  const h4 = t3 - t2;

  return {
    x: h1 * p1.x + h2 * p2.x + h3 * m1x + h4 * m2x,
    y: h1 * p1.y + h2 * p2.y + h3 * m1y + h4 * m2y,
  };
}

/**
 * Вычисляет «опорные» точки связи: центр A, середины с точками изгиба, центр B.
 * Возвращает точки в мировых координатах.
 */
export function edgeControlPoints(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  points: Pt[] | undefined,
): Pt[] {
  if (!points || points.length === 0) {
    return [
      { x: ax, y: ay },
      { x: bx, y: by },
    ];
  }

  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;

  const mids = points.map((p) => ({ x: mx + p.x, y: my + p.y }));

  return [{ x: ax, y: ay }, ...mids, { x: bx, y: by }];
}