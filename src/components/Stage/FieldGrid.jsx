import { Layer, Rect, Line, Text } from 'react-konva';
import { FIELD_CONFIG } from '../../constants/fieldConfig';

const {
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  MIDPOINT_X, PX_PER_YARD,
  HASH_NFL_LEFT, HASH_NFL_RIGHT,
} = FIELD_CONFIG;

const FIELD_WIDTH  = FIELD_RIGHT - FIELD_LEFT;
const FIELD_HEIGHT = FIELD_BOTTOM - FIELD_TOP;
const END_ZONE_PX  = 10 * PX_PER_YARD; // 10 yards * 15px = 150px

// Yard line positions — 120 yards total, lines every 5 yards
// Yard 0 = left end zone goal line, Yard 120 = right end zone goal line
function yardToX(yard) {
  return FIELD_LEFT + yard * PX_PER_YARD;
}

export default function FieldGrid() {
  const yardLines   = [];
  const yardNumbers = [];
  const hashMarks   = [];

  for (let yard = 0; yard <= 120; yard += 5) {
    const x = yardToX(yard);
    const isGoalLine = yard === 10 || yard === 110;
    const isMidfield = yard === 60;

    // Skip end zone boundaries (drawn separately)
    // Draw yard lines across the playing field only
    yardLines.push(
      <Line
        key={'yl_' + yard}
        points={[x, FIELD_TOP, x, FIELD_BOTTOM]}
        stroke={isGoalLine ? '#ffffff' : 'rgba(255,255,255,0.25)'}
        strokeWidth={isGoalLine ? 2 : 1}
      />
    );

    // Yard numbers — only on the playing field (yards 10-110)
    // Numbers count up from 10 to 50 then back down to 10
    if (yard > 10 && yard < 110 && yard % 10 === 0) {
      const distFromLeft = yard - 10; // 0 to 100
      const label = distFromLeft <= 50
        ? String(distFromLeft)
        : String(100 - distFromLeft);

      // Top number
      yardNumbers.push(
        <Text
          key={'yn_top_' + yard}
          x={x - 10}
          y={FIELD_TOP + 8}
          text={label}
          fontSize={18}
          fill="rgba(255,255,255,0.5)"
          width={20}
          align="center"
        />
      );
      // Bottom number (flipped)
      yardNumbers.push(
        <Text
          key={'yn_bot_' + yard}
          x={x - 10}
          y={FIELD_BOTTOM - 28}
          text={label}
          fontSize={18}
          fill="rgba(255,255,255,0.5)"
          width={20}
          align="center"
          rotation={180}
          offsetX={-20}
          offsetY={-18}
        />
      );
    }

    // Hash marks — NFL (every yard between goal lines)
    // We draw them every 5 yards here for clarity; full hashes every yard is too dense at this scale
    if (yard > 10 && yard < 110) {
      const hashLen = 8;
      // Left hash
      hashMarks.push(
        <Line
          key={'hl_' + yard}
          points={[x, HASH_NFL_LEFT - hashLen, x, HASH_NFL_LEFT + hashLen]}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
        />
      );
      // Right hash
      hashMarks.push(
        <Line
          key={'hr_' + yard}
          points={[x, HASH_NFL_RIGHT - hashLen, x, HASH_NFL_RIGHT + hashLen]}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
        />
      );
    }
  }

  return (
    <Layer>
      {/* Main field background */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
        fill="#2d5a27"
      />

      {/* Left end zone */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={END_ZONE_PX}
        height={FIELD_HEIGHT}
        fill="#1e3d1a"
        stroke="#ffffff"
        strokeWidth={2}
      />

      {/* Right end zone */}
      <Rect
        x={FIELD_RIGHT - END_ZONE_PX}
        y={FIELD_TOP}
        width={END_ZONE_PX}
        height={FIELD_HEIGHT}
        fill="#1e3d1a"
        stroke="#ffffff"
        strokeWidth={2}
      />

      {/* Field border */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
        fill="transparent"
        stroke="#ffffff"
        strokeWidth={2}
      />

      {/* Yard lines */}
      {yardLines}

      {/* Hash marks */}
      {hashMarks}

      {/* Midfield line — slightly brighter */}
      <Line
        points={[MIDPOINT_X, FIELD_TOP, MIDPOINT_X, FIELD_BOTTOM]}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
      />

      {/* Yard numbers */}
      {yardNumbers}
    </Layer>
  );
}
