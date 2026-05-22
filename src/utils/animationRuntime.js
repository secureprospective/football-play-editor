import { defaultCurveCP, bezierCtrl } from './curveUtils';
import { FIELD_CONFIG } from '../constants/fieldConfig';

// Quadratic bezier position at parameter t in [0, 1].
// ctrl is the actual bezier control point (not the through-point).
function quadBezier(p1, ctrl, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p1.x + 2 * mt * t * ctrl.x + t * t * p2.x,
    y: mt * mt * p1.y + 2 * mt * t * ctrl.y + t * t * p2.y,
  };
}

// Interpolate a single segment at parameter t in [0, 1].
function interpolateSegment(seg, t) {
  const p1 = seg.points[0];
  const p2 = seg.points[seg.points.length - 1];

  if (seg.curve) {
    const cp   = seg.controlPoint || defaultCurveCP(p1, p2);
    const ctrl = bezierCtrl(cp, p1, p2);
    return quadBezier(p1, ctrl, p2, t);
  }

  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

// Walk a path's segments to find the interpolated position at currentTime.
// Returns { x, y } or undefined if the path has no usable segments.
function playerPositionAtTime(path, currentTime) {
  if (!path?.segments?.length) return undefined;

  let segStart = 0;
  let lastPoint = null;

  for (const seg of path.segments) {
    if (!seg.points?.length) continue;
    const duration = seg.duration ?? 0;
    const p2 = seg.points[seg.points.length - 1];

    if (duration <= 0) {
      // Zero-duration: instantaneous pass-through, advance to end point
      lastPoint = p2;
      continue;
    }

    const segEnd = segStart + duration;

    if (currentTime < segEnd) {
      // currentTime falls inside this segment
      const t = Math.max(0, Math.min(1, (currentTime - segStart) / duration));
      return interpolateSegment(seg, t);
    }

    lastPoint = p2;
    segStart  = segEnd;
  }

  // currentTime >= total duration — clamp to route end point
  return lastPoint ? { x: lastPoint.x, y: lastPoint.y } : undefined;
}

/**
 * Compute interpolated element positions at currentTime.
 *
 * @param {Array}  elements    - active play elements array
 * @param {number} currentTime - playback time in seconds
 * @returns {Map<string, {x: number, y: number}>}
 *   Only elements with a computable position appear in the Map.
 *   Elements absent from the Map stay at their stored position.
 */
export function computePositions(elements, currentTime) {
  const result = new Map();
  if (!elements?.length) return result;

  // Index paths by id for O(1) lookup
  const pathById = new Map();
  for (const el of elements) {
    if (el.type === 'path') pathById.set(el.id, el);
  }

  // Players with a linked route
  for (const el of elements) {
    if (el.type !== 'player' || !el.routeId) continue;
    const path = pathById.get(el.routeId);
    if (!path) continue;
    const pos = playerPositionAtTime(path, currentTime);
    if (pos) result.set(el.id, pos);
  }

  // Football follows its carrying player's computed position
  for (const el of elements) {
    if (el.type !== 'football' || !el.attachedToElementId) continue;
    const playerPos = result.get(el.attachedToElementId);
    if (!playerPos) continue;
    result.set(el.id, { x: playerPos.x + FIELD_CONFIG.PLAYER_RADIUS, y: playerPos.y });
  }

  return result;
}
