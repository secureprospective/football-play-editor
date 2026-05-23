// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
// Shared curve math used by FieldCanvas, PlayThumbnail, and hitTesting.
// Changing curve behavior (e.g. the 0.35 tension factor) happens here only.

// Returns the default perpendicular midpoint control point for a curve segment.
// Used when no user-defined controlPoint exists.
export function defaultCurveCP(p1, p2) {
  const mx  = (p1.x + p2.x) / 2;
  const my  = (p1.y + p2.y) / 2;
  const dx  = p2.x - p1.x;
  const dy  = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: mx, y: my };
  return {
    x: mx - (dy / len) * (len * 0.35),
    y: my + (dx / len) * (len * 0.35),
  };
}

// Converts a through-point (cp) into the actual quadratic bezier control point
// such that the curve passes through cp at t=0.5.
// Formula: ctrl = 2*cp - 0.5*(p1+p2)
export function bezierCtrl(cp, p1, p2) {
  return {
    x: 2 * cp.x - 0.5 * (p1.x + p2.x),
    y: 2 * cp.y - 0.5 * (p1.y + p2.y),
  };
}
