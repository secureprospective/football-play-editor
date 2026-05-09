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
