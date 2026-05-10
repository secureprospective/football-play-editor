import { Layer, Rect, Line } from 'react-konva';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import useEditorStore from '../../store/useEditorStore';

const {
  FIELD_LEFT, FIELD_RIGHT, FIELD_TOP, FIELD_BOTTOM,
  FIELD_WIDTH, FIELD_HEIGHT,
  LOS_Y, PX_PER_YARD,
  HASH_LEFT_X, HASH_RIGHT_X,
  YARDS_ABOVE_LOS, YARDS_BELOW_LOS,
} = FIELD_CONFIG;

const THEME_FIELD_COLORS = {
  'theme-sun-cyan':        { field: '#111111', fieldLine: '#ffffff' },
  'theme-sun-orange':      { field: '#0f0f0f', fieldLine: '#ffffff' },
  'theme-paper-overcast':  { field: '#f2f6fa', fieldLine: '#141e28' },
  'theme-paper-newsprint': { field: '#f0ece4', fieldLine: '#0a0806' },
};

export default function FieldGrid() {
  const theme = useEditorStore(s => s.theme);
  const colors = THEME_FIELD_COLORS[theme] || THEME_FIELD_COLORS['theme-sun-cyan'];

  const yardLines = [];
  const hashMarks = [];

  for (let yard = -YARDS_BELOW_LOS; yard <= YARDS_ABOVE_LOS; yard += 5) {
    const y = LOS_Y - (yard * PX_PER_YARD);
    if (yard === 0) continue;
    yardLines.push(
      <Line key={'yl_' + yard}
        points={[FIELD_LEFT, y, FIELD_RIGHT, y]}
        stroke={colors.fieldLine} strokeWidth={1} opacity={0.4}
      />
    );
  }

  for (let yard = -YARDS_BELOW_LOS; yard <= YARDS_ABOVE_LOS; yard += 5) {
    const y = LOS_Y - (yard * PX_PER_YARD);
    const hashLen = 12;
    hashMarks.push(
      <Line key={'hl_' + yard}
        points={[HASH_LEFT_X, y - hashLen, HASH_LEFT_X, y + hashLen]}
        stroke={colors.fieldLine} strokeWidth={1} opacity={0.6}
      />,
      <Line key={'hr_' + yard}
        points={[HASH_RIGHT_X, y - hashLen, HASH_RIGHT_X, y + hashLen]}
        stroke={colors.fieldLine} strokeWidth={1} opacity={0.6}
      />
    );
  }

  return (
    <Layer>
      <Rect x={FIELD_LEFT} y={FIELD_TOP} width={FIELD_WIDTH} height={FIELD_HEIGHT} fill={colors.field} />
      {yardLines}
      <Line key="hash_col_left"
        points={[HASH_LEFT_X, FIELD_TOP, HASH_LEFT_X, FIELD_BOTTOM]}
        stroke={colors.fieldLine} strokeWidth={1} opacity={0.15}
      />
      <Line key="hash_col_right"
        points={[HASH_RIGHT_X, FIELD_TOP, HASH_RIGHT_X, FIELD_BOTTOM]}
        stroke={colors.fieldLine} strokeWidth={1} opacity={0.15}
      />
      {hashMarks}
      <Line key="sideline_left"
        points={[FIELD_LEFT + 4, FIELD_TOP, FIELD_LEFT + 4, FIELD_BOTTOM]}
        stroke={colors.fieldLine} strokeWidth={2} opacity={0.8}
      />
      <Line key="sideline_right"
        points={[FIELD_RIGHT - 4, FIELD_TOP, FIELD_RIGHT - 4, FIELD_BOTTOM]}
        stroke={colors.fieldLine} strokeWidth={2} opacity={0.8}
      />
    </Layer>
  );
}
