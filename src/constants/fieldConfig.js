export const FIELD_CONFIG = {
  // Stage design resolution
  STAGE_WIDTH:  1080,
  STAGE_HEIGHT: 1920,

  // Field boundaries in pixels
  // Field is centered horizontally with sideline margins
  FIELD_LEFT:   40,
  FIELD_RIGHT:  1040,
  FIELD_TOP:    40,
  FIELD_BOTTOM: 1880,

  // Dimensions
  FIELD_WIDTH:  1000,  // 1040 - 40
  FIELD_HEIGHT: 1840,  // 1880 - 40

  // Yard mapping
  // We show a half field: end zone (10yds) + 50 yards of playing field = 60 yards total
  // 1840px / 60 yards = ~30.67px per yard
  PX_PER_YARD: 30.67,

  // End zone
  END_ZONE_PX: 307,  // 10 yards * 30.67

  // Hash marks — NFL
  // Field is 53.3 yards wide = 1000px
  // NFL hashes are 18'6" from each sideline = ~5.7 yards from sideline
  // 5.7 * 30.67 = ~175px from each sideline edge... but measured from field edge:
  HASH_NFL_LEFT:  215,   // px from FIELD_LEFT
  HASH_NFL_RIGHT: 825,   // px from FIELD_LEFT (1000 - 175)

  // Midpoint
  MIDPOINT_X: 540,   // horizontal center
  MIDPOINT_Y: 960,   // vertical center

  // Player defaults
  PLAYER_RADIUS:    18,
  PLAYER_FONT_SIZE: 14,

  // Snap
  SNAP_YARD:      30.67,
  SNAP_HALF_YARD: 15.33,
  SNAP_OFF:       1,

  // Default scrimmage line Y position
  // Placed at 35 yard line from bottom = 25 yards from top of playing field
  // 25 * 30.67 = 767px from top of playing field + END_ZONE_PX + FIELD_TOP
  SCRIMMAGE_DEFAULT_Y: 1100,
};
