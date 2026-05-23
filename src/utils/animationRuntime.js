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
    const delay    = seg.delay ?? 0;
    const duration = seg.duration ?? 0.5;
    const p2       = seg.points[seg.points.length - 1];

    if (duration <= 0 && delay <= 0) {
      lastPoint = p2;
      continue;
    }

    const delayEnd = segStart + delay;
    const segEnd   = delayEnd + duration;

    if (currentTime < delayEnd) {
      // In the delay window — player holds at the start of this segment
      return { x: seg.points[0].x, y: seg.points[0].y };
    }

    if (currentTime < segEnd) {
      const t = Math.max(0, Math.min(1, (currentTime - delayEnd) / duration));
      return interpolateSegment(seg, t);
    }

    lastPoint = p2;
    segStart  = segEnd;
  }

  return lastPoint ? { x: lastPoint.x, y: lastPoint.y } : undefined;
}

// Sum all segment durations (+ delays) for a path.
function getPathDuration(path) {
  if (!path?.segments?.length) return 0;
  return path.segments.reduce((sum, seg) => sum + (seg.delay ?? 0) + (seg.duration ?? 0.5), 0);
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
      if (seg.preSnap) preSnapDuration += (seg.delay ?? 0) + (seg.duration ?? 0.5);
      else break; // pre-snap segments must be contiguous from the route start
    }
    maxPreSnap = Math.max(maxPreSnap, preSnapDuration);
  }
  return maxPreSnap;
}

// Flight durations — all in REAL seconds (multiplied by playbackSpeed for timeline duration).
// Snap is the median; toss is 10% slower (soft lateral); pass is 10% faster (tight spiral).
const SNAP_REAL_SECS = 0.13915;
export const TOSS_REAL_SECS = SNAP_REAL_SECS * 1.1;  // ~0.153s — 10% slower
export const PASS_REAL_SECS = SNAP_REAL_SECS;         // same as snap

// Return the real-second flight duration for a pass/toss event type.
function flightSecs(type) {
  return type === 'pass' ? PASS_REAL_SECS : TOSS_REAL_SECS;
}

// Helper: get a player's position at a specific time (for computing snap/throw targets).
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
 * Pass/toss use linear interpolation from the thrower's position to the
 * interceptPoint (coach-placed target node) or the receiver's position at
 * catch time when no interceptPoint is set.
 *
 * @param {Object} football     - football element
 * @param {Map}    result       - already-computed player positions this frame
 * @param {Map}    pathById     - all path elements indexed by id
 * @param {Map}    playerById   - all player elements indexed by id
 * @param {number} t            - current playback time
 * @param {number} snapTime     - derived snap time (0 = snap at play start)
 * @param {number} playbackSpeed
 * @returns {{ x: number, y: number }}
 */
function footballPositionAtTime(football, result, pathById, playerById, t, snapTime, playbackSpeed) {
  const speed = playbackSpeed || 1;

  // Phase 1: pre-snap — ball sits at LOS position.
  if (t <= snapTime) return { x: football.x, y: football.y };

  const journey = football.journey;
  if (!journey?.snapToPlayer) return { x: football.x, y: football.y };

  // Phase 2: snap animation — straight line from LOS to snap recipient.
  const snapAnimDuration = SNAP_REAL_SECS * speed;
  const snapEndTime = snapTime + snapAnimDuration;
  if (t < snapEndTime) {
    const progress = (t - snapTime) / snapAnimDuration;
    const target   = carrierPosAt(journey.snapToPlayer, snapTime, pathById, playerById);
    return {
      x: football.x + progress * ((target?.x ?? football.x) - football.x),
      y: football.y + progress * ((target?.y ?? football.y) - football.y),
    };
  }

  // Phase 3: walk journey events
  let currentCarrier = journey.snapToPlayer;
  const events = (journey.events || []).slice().sort((a, b) => a.time - b.time);

  for (const event of events) {
    if (t < event.time) break;

    if (event.type === 'handoff') {
      currentCarrier = event.toPlayer;
      continue;
    }

    if (event.type === 'pass' || event.type === 'toss') {
      const flightDur  = (event.duration ?? flightSecs(event.type)) * speed;
      const catchTime  = event.time + flightDur;

      if (t < catchTime) {
        // Ball in-flight — linear from thrower to interceptPoint (or receiver catch position)
        const progress = (t - event.time) / flightDur;
        const startPos = carrierPosAt(currentCarrier, event.time, pathById, playerById)
                         || { x: football.x, y: football.y };
        const endPos   = event.interceptPoint
                         || carrierPosAt(event.toPlayer, catchTime, pathById, playerById)
                         || { x: football.x, y: football.y };
        return {
          x: startPos.x + progress * (endPos.x - startPos.x),
          y: startPos.y + progress * (endPos.y - startPos.y),
        };
      }

      currentCarrier = event.toPlayer;
      continue;
    }
  }

  // Ball is with currentCarrier — use their animated position + offset
  if (!currentCarrier) return { x: football.x, y: football.y };

  const animPos = result.get(currentCarrier);
  if (animPos) return { x: animPos.x + FIELD_CONFIG.PLAYER_RADIUS, y: animPos.y };

  const player = playerById.get(currentCarrier);
  if (player) return { x: player.x + FIELD_CONFIG.PLAYER_RADIUS, y: player.y };

  return { x: football.x, y: football.y };
}

/**
 * Returns true when the football should show its highlight ring —
 * snap in-flight, handoff pulse (0.1s), pass/toss in-flight.
 */
export function isFootballInFlight(football, elements, currentTime) {
  if (currentTime <= 0) return false;

  const journey = football.journey;
  if (!journey?.snapToPlayer) return false;

  const snapTime = getSnapTime(elements);

  if (currentTime > snapTime && currentTime < snapTime + SNAP_REAL_SECS) return true;

  for (const event of (journey.events || [])) {
    if (event.time > currentTime) continue;

    if (event.type === 'handoff') {
      if (currentTime < event.time + 0.1) return true;
    }

    if (event.type === 'pass' || event.type === 'toss') {
      if (currentTime < event.time + (event.duration ?? flightSecs(event.type))) return true;
    }
  }

  return false;
}

/**
 * Compute interpolated element positions at currentTime.
 */
export function computePositions(elements, currentTime, playbackSpeed = 1) {
  const result = new Map();
  if (!elements?.length) return result;

  const pathById   = new Map();
  const playerById = new Map();
  for (const el of elements) {
    if (el.type === 'path')   pathById.set(el.id, el);
    if (el.type === 'player') playerById.set(el.id, el);
  }

  const snapTime = getSnapTime(elements);

  for (const el of elements) {
    if (el.type !== 'player' || !el.routeId) continue;
    const path = pathById.get(el.routeId);
    if (!path) continue;
    const pos = playerPositionAtTime(path, currentTime);
    if (pos) result.set(el.id, pos);
  }

  for (const el of elements) {
    if (el.type !== 'football') continue;
    const pos = footballPositionAtTime(el, result, pathById, playerById, currentTime, snapTime, playbackSpeed);
    result.set(el.id, pos);
  }

  return result;
}

/**
 * Return the intercept point for a pass/toss event — stored interceptPoint
 * or the receiver's computed position at catch time (anticipation default).
 * Used by FieldRenderer to position the draggable target node.
 *
 * @param {Object} event      - journey event (pass or toss)
 * @param {Array}  elements   - active play elements
 * @returns {{ x: number, y: number } | null}
 */
export function getInterceptPoint(event, elements) {
  if (event.interceptPoint) return event.interceptPoint;
  if (!event.toPlayer) return null;

  const pathById   = new Map();
  const playerById = new Map();
  for (const el of elements) {
    if (el.type === 'path')   pathById.set(el.id, el);
    if (el.type === 'player') playerById.set(el.id, el);
  }

  const catchTime = event.time + (event.duration ?? flightSecs(event.type));
  return carrierPosAt(event.toPlayer, catchTime, pathById, playerById);
}
