export interface Point { x: number; y: number }

// Catmull-Rom to cubic Bezier segments for smooth interpolation through raw points
export function catmullRomToBezier(points: Point[], tension = 1): Point[][] {
  if (points.length < 2) return [];
  const segments: Point[][] = [];
  const pts = [points[0], ...points, points[points.length - 1]];

  for (let i = 1; i < pts.length - 2; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2];

    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) / (6 * tension),
      y: p1.y + (p2.y - p0.y) / (6 * tension),
    };
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) / (6 * tension),
      y: p2.y - (p3.y - p1.y) / (6 * tension),
    };
    segments.push([p1, cp1, cp2, p2]);
  }
  return segments;
}

export function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

// Dense sample of the full multi-segment curve, used to build an arc-length LUT
export function sampleCurve(segments: Point[][], samplesPerSegment = 32): Point[] {
  const out: Point[] = [];
  segments.forEach(([p0, p1, p2, p3], segIdx) => {
    const start = segIdx === 0 ? 0 : 1; // avoid duplicate joint point
    for (let i = start; i <= samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      out.push(bezierPoint(t, p0, p1, p2, p3));
    }
  });
  return out;
}

export interface ArcLUT {
  points: Point[];
  cumulative: number[]; // cumulative arc length at each sample index
  totalLength: number;
}

export function buildArcLengthLUT(points: Point[]): ArcLUT {
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  return { points, cumulative, totalLength: cumulative[cumulative.length - 1] };
}

// Given normalized distance d in [0,1], return the interpolated point at constant arc-length speed
export function pointAtArcLength(lut: ArcLUT, d: number): Point {
  const targetLen = Math.max(0, Math.min(1, d)) * lut.totalLength;

  let lo = 0, hi = lut.cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lut.cumulative[mid] < targetLen) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const segLen = lut.cumulative[i] - lut.cumulative[i - 1] || 1;
  const segT = (targetLen - lut.cumulative[i - 1]) / segLen;
  const a = lut.points[i - 1];
  const b = lut.points[i];
  return { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
}

export function pointsToSvgPath(segments: Point[][]): string {
  if (segments.length === 0) return '';
  const [p0] = segments[0];
  let d = `M ${p0.x} ${p0.y}`;
  segments.forEach(([, cp1, cp2, p3]) => {
    d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p3.x} ${p3.y}`;
  });
  return d;
}

// Ramer-Douglas-Peucker simplification for raw pointer input before smoothing
export function simplifyPath(points: Point[], epsilon = 2): Point[] {
  if (points.length < 3) return points;

  const perpDist = (p: Point, a: Point, b: Point) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  };

  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}
