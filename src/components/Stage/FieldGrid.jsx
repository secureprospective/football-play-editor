import { Layer, Rect, Line, Text } from 'react-konva';
import { FIELD_CONFIG } from '../../constants/fieldConfig';

const {
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  FIELD_WIDTH, END_ZONE_PX,
  HASH_NFL_LEFT, HASH_NFL_RIGHT,
  PX_PER_YARD,
} = FIELD_CONFIG;

// Convert yard number (0=goal line, 50=midfield) to Y pixel position
// End zone is at top, 50yd line is at bottom
function yardToY(yard) {
  return FIELD_TOP + END_ZONE_PX + yard * PX_PER_YARD;
}

export default function FieldGrid() {
  const yardLines   = [];
  const yardNumbers = [];
  const hashMarks   = [];

  // Draw yard lines every 5 yards from goal line (0) to 50
  for (let yard = 0; yard <= 50; yard += 5) {
    const y = yardToY(yard);
    const isGoalLine = yard === 0;
    const isMidfield = yard === 50;

    yardLines.push(
      <Line
        key={'yl_' + yard}
        points={[FIELD_LEFT, y, FIELD_RIGHT, y]}
        stroke={isGoalLine ? '#ffffff' : isMidfield ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}
        strokeWidth={isGoalLine ? 3 : isMidfield ? 2 : 1}
      />
    );

    // Yard numbers on left and right sidelines (10, 20, 30, 40, 50)
    if (yard > 0 && yard % 10 === 0) {
      const label = String(yard);

      // Left side number
      yardNumbers.push(
        <Text
          key={'yn_left_' + yard}
          x={FIELD_LEFT + 6}
          y={y - 10}
          text={label}
          fontSize={20}
          fill="rgba(255,255,255,0.5)"
        />
      );

      // Right side number
      yardNumbers.push(
        <Text
          key={'yn_right_' + yard}
          x={FIELD_RIGHT - 36}
          y={y - 10}
          text={label}
          fontSize={20}
          fill="rgba(255,255,255,0.5)"
        />
      );
    }

    // Hash marks — short horizontal ticks on the hash columns
    if (yard > 0 && yard < 50) {
      const hashLen = 10;
      const hashX1 = FIELD_LEFT + HASH_NFL_LEFT;
      const hashX2 = FIELD_LEFT + HASH_NFL_RIGHT;

      hashMarks.push(
        <Line
          key={'hl_' + yard}
          points={[hashX1 - hashLen, y, hashX1 + hashLen, y]}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
        />
      );
      hashMarks.push(
        <Line
          key={'hr_' + yard}
          points={[hashX2 - hashLen, y, hashX2 + hashLen, y]}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
        />
      );
    }
  }

  // Alternating yard bands for mowed grass effect (every 10 yards)
  const bands = [];
  for (let yard = 0; yard < 50; yard += 10) {
    const y1 = yardToY(yard);
    const y2 = yardToY(yard + 10);
    if (yard % 20 === 0) {
      bands.push(
        <Rect
          key={'band_' + yard}
          x={FIELD_LEFT}
          y={y1}
          width={FIELD_WIDTH}
          height={y2 - y1}
          fill="rgba(0,0,0,0.06)"
        />
      );
    }
  }

  return (
    <Layer>
      {/* Main field */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_WIDTH}
        height={FIELD_BOTTOM - FIELD_TOP}
        fill="#2d5a27"
      />

      {/* End zone — darker green at top */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_WIDTH}
        height={END_ZONE_PX}
        fill="#1e3d1a"
      />

      {/* Alternating grass bands */}
      {bands}

      {/* Yard lines */}
      {yardLines}

      {/* Hash marks */}
      {hashMarks}

      {/* Hash columns — faint vertical lines showing hash positions */}
      <Line
        points={[FIELD_LEFT + HASH_NFL_LEFT, FIELD_TOP + END_ZONE_PX, FIELD_LEFT + HASH_NFL_LEFT, FIELD_BOTTOM]}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />
      <Line
        points={[FIELD_LEFT + HASH_NFL_RIGHT, FIELD_TOP + END_ZONE_PX, FIELD_LEFT + HASH_NFL_RIGHT, FIELD_BOTTOM]}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />

      {/* Field border */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_WIDTH}
        height={FIELD_BOTTOM - FIELD_TOP}
        fill="transparent"
        stroke="#ffffff"
        strokeWidth={2}
      />

      {/* Goal line label */}
      <Text
        x={FIELD_LEFT + FIELD_WIDTH / 2 - 30}
        y={FIELD_TOP + END_ZONE_PX + 6}
        text="GOAL LINE"
        fontSize={14}
        fill="rgba(255,255,255,0.4)"
      />

      {/* Yard numbers */}
      {yardNumbers}
    </Layer>
  );
}
