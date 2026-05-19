import { FIELD_CONFIG } from '../constants/fieldConfig';

const HANDLE_HIT_RADIUS = 12;
const LINE_HIT_TOLERANCE = 10;
const DRAG_THRESHOLD = 3;

export function hitTestCircle(px, py, cx, cy, radius) {
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

// Sample points along a quadratic bezier (p1, cp, p2) for curve hit testing
function sampleBezier(p1, cp, p2, samples = 16) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p1.x + 2 * mt * t * cp.x + t * t * p2.x,
      y: mt * mt * p1.y + 2 * mt * t * cp.y + t * t * p2.y,
    });
  }
  return pts;
}

/**
 * Hit test a segment-based path.
 * Returns { hit: bool, segmentIndex: number, t: number, point: {x,y} }
 * Curved segments are sampled along the actual bezier — not the straight chord.
 */
export function hitTestPathSegments(px, py, segments) {
  if (!segments || segments.length === 0) return { hit: false };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const pts = seg.points;
    if (!pts || pts.length < 2) continue;

    const p1 = pts[0];
    const p2 = pts[pts.length - 1];

    if (seg.curve) {
      // Derive control point — same logic as renderSegment
      let cp = seg.controlPoint;
      if (!cp) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        cp = len > 0
          ? { x: mx - (dy / len) * (len * 0.35), y: my + (dx / len) * (len * 0.35) }
          : { x: mx, y: my };
      }
      const samples = sampleBezier(p1, cp, p2);
      for (let j = 0; j < samples.length - 1; j++) {
        const a = samples[j];
        const b = samples[j + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
        }
        const cx = a.x + t * dx;
        const cy = a.y + t * dy;
        if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) <= LINE_HIT_TOLERANCE) {
          return { hit: true, segmentIndex: i, t: (j + t) / samples.length, point: { x: cx, y: cy } };
        }
      }
      continue;
    }

    // Straight segment — fast linear test
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    let closestX = x1, closestY = y1;
    if (lenSq > 0) {
      t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      closestX = x1 + t * dx;
      closestY = y1 + t * dy;
    }
    const dist = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    if (dist <= LINE_HIT_TOLERANCE) {
      return { hit: true, segmentIndex: i, t, point: { x: closestX, y: closestY } };
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
  // 1. Handles on selected path — control points checked before endpoint nodes
  if (selectedId) {
    const selected = elements.find(el => el.id === selectedId);
    if (selected && selected.type === 'path' && selected.segments) {
      // 1a. Control point handles on curve segments
      for (let si = 0; si < selected.segments.length; si++) {
        const seg = selected.segments[si];
        if (!seg.curve || !seg.controlPoint) continue;
        if (hitTestHandle(px, py, seg.controlPoint.x, seg.controlPoint.y)) {
          return {
            type: 'controlPoint',
            elementId: selectedId,
            segmentIndex: si,
            nodeIndex: null,
            segmentPoint: null,
          };
        }
      }
      // 1b. Endpoint node handles
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
