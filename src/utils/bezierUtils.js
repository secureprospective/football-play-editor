/**
 * Quadratic Bézier point calculation.
 * B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
 *
 * @param {number} t - Parameter 0 to 1
 * @param {{x,y}} p0 - Start point
 * @param {{x,y}} p1 - Control point
 * @param {{x,y}} p2 - End point
 * @returns {{x,y}}
 */
export function quadraticBezierPoint(t, p0, p1, p2) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/**
 * Calculate the midpoint control point for a smooth curve through three points.
 * When a user drags a midpoint on a path, this derives the Bézier control point.
 *
 * @param {{x,y}} p0 - Start point
 * @param {{x,y}} drag - Where the user dragged the midpoint to
 * @param {{x,y}} p2 - End point
 * @returns {{x,y}} The control point P1
 */
export function deriveControlPoint(p0, drag, p2) {
  // Invert the quadratic formula at t=0.5 to find P1
  // drag = 0.25*P0 + 0.5*P1 + 0.25*P2
  // P1 = (drag - 0.25*P0 - 0.25*P2) / 0.5
  return {
    x: 2 * drag.x - 0.5 * p0.x - 0.5 * p2.x,
    y: 2 * drag.y - 0.5 * p0.y - 0.5 * p2.y,
  };
}

/**
 * Generate a series of points along a quadratic Bézier curve.
 * Used to approximate the curve for hit testing.
 *
 * @param {{x,y}} p0 - Start point
 * @param {{x,y}} p1 - Control point
 * @param {{x,y}} p2 - End point
 * @param {number} steps - Number of segments (default 20)
 * @returns {Array<{x,y}>}
 */
export function sampleBezierCurve(p0, p1, p2, steps = 20) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    points.push(quadraticBezierPoint(i / steps, p0, p1, p2));
  }
  return points;
}

/**
 * Get the flat points array that Konva's Line component expects.
 * Konva uses [x0, y0, x1, y1, ...] format.
 *
 * @param {Array<{x,y}>} points
 * @returns {Array<number>}
 */
export function pointsToKonvaFlat(points) {
  return points.flatMap(p => [p.x, p.y]);
}
