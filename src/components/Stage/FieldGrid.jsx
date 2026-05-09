import { Layer, Rect, Line } from 'react-konva';
import { FIELD_CONFIG } from '../../constants/fieldConfig';

const {
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  FIELD_WIDTH, FIELD_HEIGHT,
  LOS_Y, PX_PER_YARD,
  HASH_LEFT_X, HASH_RIGHT_X,
  YARDS_ABOVE_LOS, YARDS_BELOW_LOS,
} = FIELD_CONFIG;

export default function FieldGrid() {
  const yardLines = [];
  const hashMarks = [];
  const bands     = [];

  // Draw yard lines every 5 yards
  // From -YARDS_BELOW_LOS to +YARDS_ABOVE_LOS
  const totalYards = YARDS_ABOVE_LOS + YARDS_BELOW_LOS;

  for (let yard = -YARDS_BELOW_LOS; yard <= YARDS_ABOVE_LOS; yard += 5) {
    const y = LOS_Y - (yard * PX_PER_YARD);
    const isLOS = yard === 0;

    // Skip LOS — rendered separately as scrimmage line
    if (isLOS) continue;

    yardLines.push(
      <Line
        key={'yl_' + yard}
        points={[FIELD_LEFT, y, FIELD_RIGHT, y]}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
      />
    );
  }

  // Alternating 10-yard bands for mowed grass effect
  for (let yard = -YARDS_BELOW_LOS; yard < YARDS_ABOVE_LOS; yard += 10) {
    const y1 = LOS_Y - (yard * PX_PER_YARD);
    const y2 = LOS_Y - ((yard + 10) * PX_PER_YARD);
    const top    = Math.min(y1, y2);
    const height = Math.abs(y2 - y1);

    if (Math.floor((yard + YARDS_BELOW_LOS) / 10) % 2 === 0) {
      bands.push(
        <Rect
          key={'band_' + yard}
          x={FIELD_LEFT}
          y={top}
          width={FIELD_WIDTH}
          height={height}
          fill="rgba(0,0,0,0.07)"
        />
      );
    }
  }

  // Hash marks — short vertical ticks at hash columns, every 5 yards
  for (let yard = -YARDS_BELOW_LOS; yard <= YARDS_ABOVE_LOS; yard += 5) {
    const y = LOS_Y - (yard * PX_PER_YARD);
    const hashLen = 12;

    hashMarks.push(
      <Line
        key={'hl_' + yard}
        points={[HASH_LEFT_X, y - hashLen, HASH_LEFT_X, y + hashLen]}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
      />
    );
    hashMarks.push(
      <Line
        key={'hr_' + yard}
        points={[HASH_RIGHT_X, y - hashLen, HASH_RIGHT_X, y + hashLen]}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
      />
    );
  }

  // Sideline hash columns — very faint vertical lines
  const hashColumnLines = [
    <Line
      key="hash_col_left"
      points={[HASH_LEFT_X, FIELD_TOP, HASH_LEFT_X, FIELD_BOTTOM]}
      stroke="rgba(255,255,255,0.06)"
      strokeWidth={1}
    />,
    <Line
      key="hash_col_right"
      points={[HASH_RIGHT_X, FIELD_TOP, HASH_RIGHT_X, FIELD_BOTTOM]}
      stroke="rgba(255,255,255,0.06)"
      strokeWidth={1}
    />,
  ];

  // Left and right sidelines
  const sidelines = [
    <Line
      key="sideline_left"
      points={[FIELD_LEFT + 4, FIELD_TOP, FIELD_LEFT + 4, FIELD_BOTTOM]}
      stroke="rgba(255,255,255,0.4)"
      strokeWidth={2}
    />,
    <Line
      key="sideline_right"
      points={[FIELD_RIGHT - 4, FIELD_TOP, FIELD_RIGHT - 4, FIELD_BOTTOM]}
      stroke="rgba(255,255,255,0.4)"
      strokeWidth={2}
    />,
  ];

  return (
    <Layer>
      {/* Field background */}
      <Rect
        x={FIELD_LEFT}
        y={FIELD_TOP}
        width={FIELD_WIDTH}
        height={FIELD_HEIGHT}
        fill="#2d5a27"
      />

      {/* Alternating bands */}
      {bands}

      {/* Yard lines */}
      {yardLines}

      {/* Hash columns */}
      {hashColumnLines}

      {/* Hash marks */}
      {hashMarks}

      {/* Sidelines */}
      {sidelines}
    </Layer>
  );
}
