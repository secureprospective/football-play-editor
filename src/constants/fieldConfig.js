// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
const STAGE_W  = 1920;
const STAGE_H  = 1080;
const LOS_Y    = 771; // 20 yards * 38.57px/yard from top

export const FIELD_CONFIG = {
  // Design resolution — landscape
  STAGE_WIDTH:  STAGE_W,
  STAGE_HEIGHT: STAGE_H,

  // Field bounds — same as stage, named for canvas rendering clarity
  FIELD_LEFT:   0,
  FIELD_RIGHT:  STAGE_W,
  FIELD_TOP:    0,
  FIELD_BOTTOM: STAGE_H,
  FIELD_WIDTH:  STAGE_W,
  FIELD_HEIGHT: STAGE_H,

  YARDS_ABOVE_LOS: 20,
  YARDS_BELOW_LOS: 8,
  TOTAL_YARDS: 28,

  PX_PER_YARD:   38.57, // 1080 / 28 yards
  PX_PER_YARD_H: 36.02, // 1920 / 53.3 yards

  LOS_Y,
  SCRIMMAGE_DEFAULT_Y: LOS_Y, // scrimmage starts at LOS

  HASH_LEFT_X:  640,  // ~1/3 field width
  HASH_RIGHT_X: 1280, // ~2/3 field width

  MIDPOINT_X: STAGE_W / 2,
  MIDPOINT_Y: STAGE_H / 2,

  PLAYER_RADIUS:    22,
  PLAYER_FONT_SIZE: 16,

  SNAP_HALF_YARD: 19.28,
};
