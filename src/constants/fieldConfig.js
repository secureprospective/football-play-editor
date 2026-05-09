export const FIELD_CONFIG = {
  // Design resolution — landscape
  STAGE_WIDTH:  1920,
  STAGE_HEIGHT: 1080,

  // Field fills the full stage
  FIELD_LEFT:   0,
  FIELD_RIGHT:  1920,
  FIELD_TOP:    0,
  FIELD_BOTTOM: 1080,
  FIELD_WIDTH:  1920,
  FIELD_HEIGHT: 1080,

  // We show 28 yards total height
  // LOS is at 35% from bottom = 65% from top
  // Above LOS: 20 yards (routes going deep toward top)
  // Below LOS: 8 yards (backfield toward bottom)
  YARDS_ABOVE_LOS: 20,
  YARDS_BELOW_LOS: 8,
  TOTAL_YARDS: 28,

  // px per yard vertically
  // 1080px / 28 yards = 38.57px per yard
  PX_PER_YARD: 38.57,

  // LOS Y position in design coords
  // 20 yards from top * 38.57 = 771px from top
  LOS_Y: 771,

  // Field is 53.3 yards wide
  // 1920px / 53.3 yards = 36.02px per yard horizontally
  PX_PER_YARD_H: 36.02,

  // Hash marks — NFL hashes are 18'6" from each sideline = ~5.7 yards
  // But visually we place them at 1/3 and 2/3 of field width
  HASH_LEFT_X:  640,
  HASH_RIGHT_X: 1280,

  // Yard lines — horizontal lines every 5 yards
  // From -8 yards (below LOS) to +20 yards (above LOS)
  // Stored as Y positions in design coords

  // Midpoint
  MIDPOINT_X: 960,
  MIDPOINT_Y: 540,

  // Player defaults — larger for landscape visibility
  PLAYER_RADIUS:    22,
  PLAYER_FONT_SIZE: 16,

  // Snap
  SNAP_YARD:      38.57,
  SNAP_HALF_YARD: 19.28,
  SNAP_OFF:       1,

  // Default scrimmage Y
  SCRIMMAGE_DEFAULT_Y: 771,
};
