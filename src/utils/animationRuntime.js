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
    const duration = seg.duration ?? 0.5;
    const p2 = seg.points[seg.points.length - 1];

    if (duration <= 0) {
      lastPoint = p2;
      continue;
    }

    const segEnd = segStart + duration;

    if (currentTime < segEnd) {
      const t = Math.max(0, Math.min(1, (currentTime - segStart) / duration));
      return interpolateSegment(seg, t);
    }

    lastPoint = p2;
    segStart  = segEnd;
  }

  return lastPoint ? { x: lastPoint.x, y: lastPoint.y } : undefined;
}

// Sum all segment durations for a path.
function getPathDuration(path) {
  if (!path?.segments?.length) return 0;
  return path.segments.reduce((sum, seg) => sum + (seg.duration ?? 0.5), 0);
}

/**
 * Derive snap time from the longest pre-snap segment sequence in the play.
 * Returns 0 if no pre-snap segments exist (ball snaps immediately at t=0).
 */
export function getSnapTime(elements) {
  let maxPreSnap = 0;
  for (const el of elements) {
    if (el.type !== 'path' || !el.segments) continue;
    let preSnapDuration = 0;
    for (const seg of el.segments) {
      if (seg.preSnap) preSnapDuration += seg.duration ?? 0.5;
      else break; // pre-snap segments must be contiguous from the route start
    }
    maxPreSnap = Math.max(maxPreSnap, preSnapDuration);
  }
  return maxPreSnap;
}

// Snap always takes this many REAL seconds, regardless of playback speed.
// animation-time duration = SNAP_REAL_SECS × playbackSpeed (passed in from rAF loop).
// At 1x: 0.1 real sec. At 0.5x: 0.1 real sec. At 2x: 0.1 real sec.
const SNAP_REAL_SECS = 0.1;

// Helper: get a player's position at a specific time (for computing snap target)
function carrierPosAt(carrierId, time, pathById, playerById) {
  const player = playerById.get(carrierId);
  if (!player) return null;
  if (player.routeId) {
    const route = pathById.get(player.routeId);
    if (route) {
      const pos = playerPositionAtTime(route, time);
      if (pos) return { x: pos.x + FIELD_CONFIG.PLAYER_RADIUS, y: pos.y };
    }
  }
  return { x: player.x + FIELD_CONFIG.PLAYER_RADIUS, y: player.y };
}

/**
 * Compute the football's position at time t using its journey script.
 *
 * Uses the already-computed player positions from `result` (Map<id,{x,y}>)
 * so ball movement stays in sync with player animation without re-computing routes.
 *
 * @param {Object} football   - football element
 * @param {Map}    result     - already-computed player positions this frame
 * @param {Map}    pathById   - all path elements indexed by id
 * @param {Map}    playerById - all player elements indexed by id
 * @param {number} t          - current playback time
 * @param {number} snapTime   - derived snap time (0 = snap at play start)
 * @returns {{ x: number, y: number }}
 */
function footballPositionAtTime(football, result, pathById, playerById, t, snapTime, playbackSpeed) {
  // Phase 1: pre-snap — ball sits at LOS position.
  // <= so that at t=0 (reset state) ball is always at LOS,
  // even when snapTime=0 (no pre-snap motion defined).
  if (t <= snapTime) return { x: football.x, y: football.y };

  const journey = football.journey;
  if (!journey?.snapToPlayer) {
    // No snap recipient defined — ball stays on the ground
    return { x: football.x, y: football.y };
  }

  // Phase 2: snap animation — ball travels straight from LOS to carrier.
  // Duration = SNAP_REAL_SECS × playbackSpeed so the snap always takes
  // SNAP_REAL_SECS of REAL time regardless of the coach's speed setting.
  const snapAnimDuration = SNAP_REAL_SECS * (playbackSpeed || 1);
  const snapEndTime = snapTime + snapAnimDuration;
  if (t < snapEndTime) {
    const progress   = (t - snapTime) / snapAnimDuration;
    const target     = carrierPosAt(journey.snapToPlayer, snapTime, pathById, playerById);
    const targetX    = target?.x ?? football.x;
    const targetY    = target?.y ?? football.y;
    return {
      x: football.x + progress * (targetX - football.x),
      y: football.y + progress * (targetY - football.y),
    };
  }

  // Phase 3: snap complete — walk journey events
  let currentCarrier = journey.snapToPlayer;
  // Events sorted ascending (enforced on insert, re-sorted here for safety)
  const events = (journey.events || []).slice().sort((a, b) => a.time - b.time);

  for (const event of events) {
    if (t < event.time) break; // event still in the future

    if (event.type === 'handoff') {
      currentCarrier = event.toPlayer;
      continue;
    }

    if (event.type === 'pass' || event.type === 'toss') {
      const arcPath    = event.arcPathId ? pathById.get(event.arcPathId) : null;
      const arcDur     = arcPath ? getPathDuration(arcPath) : 0;
      const arcEndTime = event.time + arcDur;

      if (t < arcEndTime) {
        // Ball is in-flight along the drawn arc
        const pos = playerPositionAtTime(arcPath, t - event.time);
        return pos || { x: football.x, y: football.y };
      }

      // Arc complete — ball now with receiver
      currentCarrier = event.toPlayer;
      continue;
    }
  }

  // Ball is attached to currentCarrier — use their animated position + PLAYER_RADIUS offset
  if (!currentCarrier) return { x: football.x, y: football.y };

  const animPos = result.get(currentCarrier);
  if (animPos) return { x: animPos.x + FIELD_CONFIG.PLAYER_RADIUS, y: animPos.y };

  // Carrier has no animated position (no route) — use stored position
  const player = playerById.get(currentCarrier);
  if (player) return { x: player.x + FIELD_CONFIG.PLAYER_RADIUS, y: player.y };

  return { x: football.x, y: football.y };
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
export function computePositions(elements, currentTime, playbackSpeed = 1) {
  const result = new Map();
  if (!elements?.length) return result;

  // Index by id for O(1) lookup
  const pathById   = new Map();
  const playerById = new Map();
  for (const el of elements) {
    if (el.type === 'path')   pathById.set(el.id, el);
    if (el.type === 'player') playerById.set(el.id, el);
  }

  // Snap time — needed by football runtime
  const snapTime = getSnapTime(elements);

  // Players with a linked route
  for (const el of elements) {
    if (el.type !== 'player' || !el.routeId) continue;
    const path = pathById.get(el.routeId);
    if (!path) continue;
    const pos = playerPositionAtTime(path, currentTime);
    if (pos) result.set(el.id, pos);
  }

  // Football — journey-based position (computed after players so result map is populated)
  for (const el of elements) {
    if (el.type !== 'football') continue;
    const pos = footballPositionAtTime(el, result, pathById, playerById, currentTime, snapTime, playbackSpeed);
    result.set(el.id, pos);
  }

  return result;
}
