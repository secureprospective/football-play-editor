import { FIELD_CONFIG } from '../constants/fieldConfig';

const HANDLE_HIT_RADIUS = 12;
const LINE_HIT_TOLERANCE = 10;
const DRAG_THRESHOLD = 3;

export function hitTestCircle(px, py, cx, cy, radius) {
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

export function hitTestSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2) <= LINE_HIT_TOLERANCE;
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  return dist <= LINE_HIT_TOLERANCE;
}

/**
 * Hit test a segment-based path.
 * Returns { hit: bool, segmentIndex: number, t: number, point: {x,y} }
 * t is the position along the hit segment (0=start, 1=end).
 * point is the exact location on the segment where the click landed.
 */
export function hitTestPathSegments(px, py, segments) {
  if (!segments || segments.length === 0) return { hit: false };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const pts = seg.points;
    if (!pts || pts.length < 2) continue;

    const x1 = pts[0].x, y1 = pts[0].y;
    const x2 = pts[pts.length - 1].x, y2 = pts[pts.length - 1].y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    let closestX = x1, closestY = y1;

    if (lenSq > 0) {
      t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      closestX = x1 + t * dx;
      closestY = y1 + t * dy;
    }

    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    if (dist <= LINE_HIT_TOLERANCE) {
      return {
        hit: true,
        segmentIndex: i,
        t,
        point: { x: closestX, y: closestY },
      };
    }
  }

  return { hit: false };
}

export function hitTestHandle(px, py, hx, hy) {
  return hitTestCircle(px, py, hx, hy, HANDLE_HIT_RADIUS);
}

export function hitTestPlayer(px, py, player) {
  const radius = (player.style?.radius || FIELD_CONFIG.PLAYER_RADIUS) + 4;
  return hitTestCircle(px, py, player.x, player.y, radius);
}

/**
 * Master hit test.
 *
 * Priority order:
 * 1. Node handles on the selected path (always shown when a path is selected)
 * 2. Player bodies
 * 3. Path segments
 * 4. Nothing
 *
 * Returns:
 * { type: 'handle'|'player'|'path'|null, elementId, nodeIndex, segmentIndex, segmentPoint }
 */
export function masterHitTest(px, py, elements, selectedId) {
  // 1. Node handles on selected path
  if (selectedId) {
    const selected = elements.find(el => el.id === selectedId);
    if (selected && selected.type === 'path' && selected.segments) {
      // Collect all unique node points across segments
      const nodes = [];
      selected.segments.forEach((seg, si) => {
        seg.points?.forEach((p, pi) => {
          nodes.push({ x: p.x, y: p.y, segmentIndex: si, nodeIndex: pi });
        });
      });
      for (const node of nodes) {
        if (hitTestHandle(px, py, node.x, node.y)) {
          return {
            type: 'handle',
            elementId: selectedId,
            nodeIndex: node.nodeIndex,
            segmentIndex: node.segmentIndex,
            segmentPoint: null,
          };
        }
      }
    }
  }

  // 2. Players
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'player' && hitTestPlayer(px, py, el)) {
      return { type: 'player', elementId: el.id, nodeIndex: null, segmentIndex: null, segmentPoint: null };
    }
  }

  // 3. Paths
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'path') {
      const result = hitTestPathSegments(px, py, el.segments);
      if (result.hit) {
        return {
          type: 'path',
          elementId: el.id,
          nodeIndex: null,
          segmentIndex: result.segmentIndex,
          segmentPoint: result.point,
        };
      }
    }
  }

  return { type: null, elementId: null, nodeIndex: null, segmentIndex: null, segmentPoint: null };
}

export function exceededDragThreshold(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) > DRAG_THRESHOLD;
}
