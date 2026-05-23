import { FIELD_CONFIG } from '../constants/fieldConfig';
import { defaultCurveCP, bezierCtrl } from './curveUtils';

const HANDLE_HIT_RADIUS = 12;
const LINE_HIT_TOLERANCE = 10;
const DRAG_THRESHOLD = 3;

export const FOOTBALL_RX = 12;
export const FOOTBALL_RY = 20;

export const TEXT_FONT_SIZE  = 28;
const        TEXT_CHAR_WIDTH = 14; // approximate px per char at TEXT_FONT_SIZE

export function hitTestCircle(px, py, cx, cy, radius) {
  const dx = px - cx;
  const dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

// Sample a quadratic bezier that passes THROUGH cp at t=0.5
function sampleBezier(p1, cp, p2, samples = 20) {
  const ctrl = bezierCtrl(cp, p1, p2);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p1.x + 2 * mt * t * ctrl.x + t * t * p2.x,
      y: mt * mt * p1.y + 2 * mt * t * ctrl.y + t * t * p2.y,
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
      const cp = seg.controlPoint || defaultCurveCP(p1, p2);
      const samples = sampleBezier(p1, cp, p2);
      for (let j = 0; j < samples.length - 1; j++) {
        const a = samples[j];
        const b = samples[j + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        let cx = a.x, cy = a.y;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
          cx = a.x + t * dx;
          cy = a.y + t * dy;
        }
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

export function hitTestPlayer(px, py, player, positions) {
  const radius = (player.style?.radius || FIELD_CONFIG.PLAYER_RADIUS) + 4;
  const ex = positions?.get(player.id)?.x ?? player.x;
  const ey = positions?.get(player.id)?.y ?? player.y;
  return hitTestCircle(px, py, ex, ey, radius);
}

export function hitTestFootball(px, py, football, positions) {
  const ex = positions?.get(football.id)?.x ?? football.x;
  const ey = positions?.get(football.id)?.y ?? football.y;
  const dx = px - ex;
  const dy = py - ey;
  return (dx * dx) / (FOOTBALL_RX * FOOTBALL_RX) + (dy * dy) / (FOOTBALL_RY * FOOTBALL_RY) <= 1;
}

export function hitTestHighlight(px, py, highlight, positions) {
  const ex = positions?.get(highlight.id)?.x ?? highlight.x;
  const ey = positions?.get(highlight.id)?.y ?? highlight.y;
  const dx = px - ex;
  const dy = py - ey;
  return Math.sqrt(dx * dx + dy * dy) <= highlight.radius + 8;
}

export function hitTestText(px, py, textEl, positions) {
  const ex = positions?.get(textEl.id)?.x ?? textEl.x;
  const ey = positions?.get(textEl.id)?.y ?? textEl.y;
  const content = textEl.content || '';
  const w = Math.max(40, content.length * TEXT_CHAR_WIDTH);
  const h = TEXT_FONT_SIZE;
  const pad = 6;
  return px >= ex - pad && px <= ex + w + pad &&
         py >= ey - pad && py <= ey + h + pad;
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
export function masterHitTest(px, py, elements, selectedId, positions = new Map()) {
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

  // 2. Text — checked before players because text renders on top visually
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'text' && hitTestText(px, py, el, positions)) {
      return { type: 'text', elementId: el.id, nodeIndex: null, segmentIndex: null, segmentPoint: null };
    }
  }

  // 3. Players
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'player' && hitTestPlayer(px, py, el, positions)) {
      return { type: 'player', elementId: el.id, nodeIndex: null, segmentIndex: null, segmentPoint: null };
    }
  }

  // 4. Football — after players so player wins when they overlap
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'football' && hitTestFootball(px, py, el, positions)) {
      return { type: 'football', elementId: el.id, nodeIndex: null, segmentIndex: null, segmentPoint: null };
    }
  }

  // 5. Paths
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

  // 6. Highlights — last priority, matches visual z-order (under everything)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'highlight' && hitTestHighlight(px, py, el, positions)) {
      return { type: 'highlight', elementId: el.id, nodeIndex: null, segmentIndex: null, segmentPoint: null };
    }
  }

  return { type: null, elementId: null, nodeIndex: null, segmentIndex: null, segmentPoint: null };
}

export function exceededDragThreshold(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) > DRAG_THRESHOLD;
}
