// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
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

/**
 * Walk a path's segments to find the interpolated position at currentTime.
 * Pre-snap segments use their globally-scheduled time windows (preSnapSchedule).
 * Post-snap segments accumulate from snapTime.
 * Returns { x, y } or undefined (player stays at stored position).
 *
 * @param {Object} path
 * @param {number} currentTime
 * @param {Map}    preSnapSchedule  — Map<segId, { startTime, endTime }> from buildPreSnapSchedule
 * @param {number} snapTime         — when the ball snaps
 */
function playerPositionAtTime(path, currentTime, preSnapSchedule, snapTime) {
  if (!path?.segments?.length) return undefined;
  const st = snapTime ?? 0;

  // --- Pre-snap phase ---
  // Iterate all pre-snap segments; find the one currently animating, or track the
  // latest completed endpoint so the player holds position between phases.
  let lastPreSnapEndTime = -1;
  let lastPreSnapPos     = null;

  for (const seg of path.segments) {
    if (!seg.preSnap || !preSnapSchedule) continue;
    const scheduled = preSnapSchedule.get(seg.id);
    if (!scheduled || !seg.points?.length) continue;

    const { startTime, endTime } = scheduled;
    const delay    = seg.delay ?? 0;
    const duration = seg.duration ?? 0.5;
    const delayEnd = startTime + delay;
    const p2       = seg.points[seg.points.length - 1];

    if (currentTime >= endTime) {
      // Segment fully completed — track as latest endpoint.
      if (endTime >= lastPreSnapEndTime) {
        lastPreSnapEndTime = endTime;
        lastPreSnapPos     = { x: p2.x, y: p2.y };
      }
    } else if (currentTime >= startTime) {
      // Currently animating this pre-snap segment.
      if (currentTime < delayEnd) return { x: seg.points[0].x, y: seg.points[0].y };
      const t = Math.max(0, Math.min(1, (currentTime - delayEnd) / duration));
      return interpolateSegment(seg, t);
    }
    // currentTime < startTime — segment not started yet; skip.
  }

  // Before snap: hold at last completed pre-snap position, or stay at stored position.
  if (currentTime < st) return lastPreSnapPos || undefined;

  // --- Post-snap phase ---
  let segStart = st;
  let lastPoint = lastPreSnapPos;

  for (const seg of path.segments) {
    if (seg.preSnap) continue; // already handled above
    if (!seg.points?.length) continue;

    const delay    = seg.delay ?? 0;
    const duration = seg.duration ?? 0.5;
    const p2       = seg.points[seg.points.length - 1];

    if (duration <= 0 && delay <= 0) {
      lastPoint = { x: p2.x, y: p2.y };
      continue;
    }

    const delayEnd = segStart + delay;
    const segEnd   = delayEnd + duration;

    if (currentTime < delayEnd) return lastPoint || { x: seg.points[0].x, y: seg.points[0].y };
    if (currentTime < segEnd) {
      const t = Math.max(0, Math.min(1, (currentTime - delayEnd) / duration));
      return interpolateSegment(seg, t);
    }

    lastPoint = { x: p2.x, y: p2.y };
    segStart  = segEnd;
  }

  return lastPoint;
}

// Sum all segment durations (+ delays) for a path.
function getPathDuration(path) {
  if (!path?.segments?.length) return 0;
  return path.segments.reduce((sum, seg) => sum + (seg.delay ?? 0) + (seg.duration ?? 0.5), 0);
}

/**
 * Build a global schedule for all pre-snap segments across the play.
 * Segments are sorted by their preSnap sequence number and assigned start/end
 * times sequentially — only one segment animates at a time (NFL rule).
 *
 * @returns {{ schedule: Map<segId, { startTime, endTime }>, totalDuration: number }}
 */
export function buildPreSnapSchedule(elements) {
  const schedule = new Map();

  // Collect all segments with a numeric preSnap value.
  const preSnapSegs = [];
  for (const el of elements) {
    if (el.type !== 'path' || !el.segments) continue;
    for (const seg of el.segments) {
      if (typeof seg.preSnap === 'number' && seg.preSnap > 0) preSnapSegs.push(seg);
    }
  }

  if (preSnapSegs.length === 0) return { schedule, totalDuration: 0 };

  // Sort by sequence number ascending.
  preSnapSegs.sort((a, b) => a.preSnap - b.preSnap);

  // Assign start/end times sequentially.
  let t = 0;
  for (const seg of preSnapSegs) {
    const delay    = seg.delay ?? 0;
    const duration = seg.duration ?? 0.5;
    schedule.set(seg.id, { startTime: t, endTime: t + delay + duration });
    t += delay + duration;
  }

  return { schedule, totalDuration: t };
}

/**
 * Returns when the ball snaps — 0.1s after all pre-snap motion completes,
 * or 0 if there are no pre-snap segments.
 */
export function getSnapTime(elements) {
  const { totalDuration } = buildPreSnapSchedule(elements);
  return totalDuration > 0 ? totalDuration + 0.1 : 0;
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
function carrierPosAt(carrierId, time, pathById, playerById, preSnapSchedule, snapTime) {
  const player = playerById.get(carrierId);
  if (!player) return null;
  if (player.routeId) {
    const route = pathById.get(player.routeId);
    if (route) {
      const pos = playerPositionAtTime(route, time, preSnapSchedule, snapTime ?? 0);
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
function footballPositionAtTime(football, result, pathById, playerById, t, snapTime, playbackSpeed, preSnapSchedule) {
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
    const target   = carrierPosAt(journey.snapToPlayer, snapTime, pathById, playerById, preSnapSchedule, snapTime);
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
        const progress = (t - event.time) / flightDur;
        const startPos = carrierPosAt(currentCarrier, event.time, pathById, playerById, preSnapSchedule, snapTime)
                         || { x: football.x, y: football.y };
        const endPos   = event.interceptPoint
                         || carrierPosAt(event.toPlayer, catchTime, pathById, playerById, preSnapSchedule, snapTime)
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
export function isFootballInFlight(football, elements, currentTime, snapTime = null) {
  if (currentTime <= 0) return false;

  const journey = football.journey;
  if (!journey?.snapToPlayer) return false;

  const st = snapTime ?? getSnapTime(elements);

  if (currentTime > st && currentTime < st + SNAP_REAL_SECS) return true;

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

  // Build schedule once — shared by player positions and football.
  const { schedule: preSnapSchedule, totalDuration } = buildPreSnapSchedule(elements);
  const snapTime = totalDuration > 0 ? totalDuration + 0.1 : 0;

  for (const el of elements) {
    if (el.type !== 'player' || !el.routeId) continue;
    const path = pathById.get(el.routeId);
    if (!path) continue;
    const pos = playerPositionAtTime(path, currentTime, preSnapSchedule, snapTime);
    if (pos) result.set(el.id, pos);
  }

  for (const el of elements) {
    if (el.type !== 'football') continue;
    const pos = footballPositionAtTime(el, result, pathById, playerById, currentTime, snapTime, playbackSpeed, preSnapSchedule);
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

  const { schedule: preSnapSchedule, totalDuration } = buildPreSnapSchedule(elements);
  const snapTime = totalDuration > 0 ? totalDuration + 0.1 : 0;

  const catchTime = event.time + (event.duration ?? flightSecs(event.type));
  return carrierPosAt(event.toPlayer, catchTime, pathById, playerById, preSnapSchedule, snapTime);
}
