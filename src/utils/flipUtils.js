import { FIELD_CONFIG } from '../constants/fieldConfig';

/**
 * Flip a single x coordinate across the field midpoint.
 * x_new = 2 * midX - x_old
 */
export function flipX(x) {
  return 2 * FIELD_CONFIG.MIDPOINT_X - x;
}

/**
 * Flip a single y coordinate across the field midpoint.
 * y_new = 2 * midY - y_old
 */
export function flipY(y) {
  return 2 * FIELD_CONFIG.MIDPOINT_Y - y;
}

/**
 * Flip a player element horizontally (left/right mirror).
 * Reflects x across the field's horizontal midpoint.
 */
export function flipPlayerHorizontal(player) {
  return { ...player, x: flipX(player.x) };
}

/**
 * Flip a player element vertically (top/bottom mirror).
 * Reflects y across the field's vertical midpoint.
 */
export function flipPlayerVertical(player) {
  return { ...player, y: flipY(player.y) };
}

/**
 * Flip a path element horizontally.
 * Reflects all segment points' x coordinates.
 */
export function flipPathHorizontal(path) {
  return {
    ...path,
    segments: (path.segments || []).map(seg => ({
      ...seg,
      points: seg.points.map(p => ({ x: flipX(p.x), y: p.y })),
      ...(seg.controlPoint ? { controlPoint: { x: flipX(seg.controlPoint.x), y: seg.controlPoint.y } } : {}),
    })),
  };
}

/**
 * Flip a path element vertically.
 * Reflects all segment points' y coordinates.
 */
export function flipPathVertical(path) {
  return {
    ...path,
    segments: (path.segments || []).map(seg => ({
      ...seg,
      points: seg.points.map(p => ({ x: p.x, y: flipY(p.y) })),
      ...(seg.controlPoint ? { controlPoint: { x: seg.controlPoint.x, y: flipY(seg.controlPoint.y) } } : {}),
    })),
  };
}

/**
 * Flip all elements in the play horizontally.
 * This is the main "Flip Play" action.
 *
 * @param {Array} elements - All elements from the store
 * @returns {Array} New elements array with flipped coordinates
 */
export function flipPlayHorizontal(elements) {
  return elements.map(el => {
    if (el.type === 'player') return flipPlayerHorizontal(el);
    if (el.type === 'path')   return flipPathHorizontal(el);
    return el;
  });
}

/**
 * Flip all elements in the play vertically.
 *
 * @param {Array} elements
 * @returns {Array}
 */
export function flipPlayVertical(elements) {
  return elements.map(el => {
    if (el.type === 'player') return flipPlayerVertical(el);
    if (el.type === 'path')   return flipPathVertical(el);
    return el;
  });
}
