import { FIELD_CONFIG } from '../constants/fieldConfig';

// Hit region sizes — change these to tune grab sensitivity
const HANDLE_HIT_RADIUS = 12;    // 24x24px effective hit area on node handles
const LINE_HIT_TOLERANCE = 10;   // px distance from line center that counts as a hit
const DRAG_THRESHOLD = 3;        // px of movement before a drag activates

/**
 * Check if a point is within a circular hit region.
 * Used for player bodies and node handles.
 */
export function hitTestCircle(px, py, cx, cy, radius) {
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

/**
 * Check if a point is within the hit region of a line segment.
 * Returns true if the point is within LINE_HIT_TOLERANCE px of the segment.
 */
export function hitTestSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Segment is a point
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= LINE_HIT_TOLERANCE;
  }

  // Project point onto segment, clamp to [0,1]
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  return dist <= LINE_HIT_TOLERANCE;
}

/**
 * Check if a point hits any segment in a path's points array.
 * Returns true if any segment is hit.
 */
export function hitTestPath(px, py, points) {
  if (!points || points.length < 2) return false;
  for (let i = 0; i < points.length - 1; i++) {
    if (hitTestSegment(px, py, points[i].x, points[i].y, points[i+1].x, points[i+1].y)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a point hits a node handle.
 * Uses HANDLE_HIT_RADIUS for the hit region.
 */
export function hitTestHandle(px, py, hx, hy) {
  return hitTestCircle(px, py, hx, hy, HANDLE_HIT_RADIUS);
}

/**
 * Check if a point hits a player element.
 * Uses FIELD_CONFIG.PLAYER_RADIUS plus a small buffer.
 */
export function hitTestPlayer(px, py, player) {
  const radius = (player.style?.radius || FIELD_CONFIG.PLAYER_RADIUS) + 4;
  return hitTestCircle(px, py, player.x, player.y, radius);
}

/**
 * Master hit test — implements the handle-first priority hierarchy.
 *
 * Priority order:
 * 1. Node handles (if a line is selected and in EDIT_NODES mode)
 * 2. Player bodies
 * 3. Line paths
 * 4. Nothing (returns null)
 *
 * @param {number} px - Mouse x
 * @param {number} py - Mouse y
 * @param {Array} elements - All elements from the store
 * @param {string|null} selectedId - Currently selected element id
 * @param {boolean} editNodesMode - Whether EDIT_NODES tool is active
 * @returns {{ type: 'handle'|'player'|'path'|null, elementId: string|null, nodeIndex: number|null }}
 */
export function masterHitTest(px, py, elements, selectedId, editNodesMode) {
  // 1. Check node handles first (only when a path is selected in edit mode)
  if (editNodesMode && selectedId) {
    const selected = elements.find(el => el.id === selectedId);
    if (selected && selected.type === 'path' && selected.points) {
      for (let i = 0; i < selected.points.length; i++) {
        if (hitTestHandle(px, py, selected.points[i].x, selected.points[i].y)) {
          return { type: 'handle', elementId: selectedId, nodeIndex: i };
        }
      }
    }
  }

  // 2. Check player bodies (reverse order so top-rendered player is hit first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'player' && hitTestPlayer(px, py, el)) {
      return { type: 'player', elementId: el.id, nodeIndex: null };
    }
  }

  // 3. Check line paths
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'path' && hitTestPath(px, py, el.points)) {
      return { type: 'path', elementId: el.id, nodeIndex: null };
    }
  }

  // 4. Nothing hit
  return { type: null, elementId: null, nodeIndex: null };
}

/**
 * Returns true if the mouse has moved more than DRAG_THRESHOLD px.
 * Used to distinguish a click (select) from a drag (move).
 */
export function exceededDragThreshold(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) > DRAG_THRESHOLD;
}
