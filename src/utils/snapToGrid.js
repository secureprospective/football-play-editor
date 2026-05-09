export function snapToGrid(value, increment, enabled) {
  if (!enabled || increment <= 1) return value;
  return Math.round(value / increment) * increment;
}

export function snapPoint(point, increment, enabled) {
  return {
    x: snapToGrid(point.x, increment, enabled),
    y: snapToGrid(point.y, increment, enabled),
  };
}

/**
 * Constrains a point to the nearest 45° angle from an origin point.
 * Used when Shift is held during route drawing.
 *
 * The 8 allowed directions are: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
 *
 * @param {{ x: number, y: number }} from - The previous point (origin)
 * @param {{ x: number, y: number }} to   - The raw mouse position
 * @returns {{ x: number, y: number }}     - The constrained point
 */
export function constrainToAngle(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return to;

  // Get the angle in degrees (0° = right, clockwise)
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Snap to nearest 45°
  const snapped = Math.round(angle / 45) * 45;
  const radians = snapped * (Math.PI / 180);

  return {
    x: from.x + Math.round(distance * Math.cos(radians)),
    y: from.y + Math.round(distance * Math.sin(radians)),
  };
}
