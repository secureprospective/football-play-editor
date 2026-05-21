import { memo } from 'react';
import useEditorStore from '../../store/useEditorStore';
import { THEME_COLORS } from '../../constants/themeColors';
import { defaultCurveCP } from '../../utils/curveUtils';
import { FIELD_CONFIG } from '../../constants/fieldConfig';

function scaleX(x, w) { return (x / FIELD_CONFIG.STAGE_WIDTH)  * w; }
function scaleY(y, h) { return (y / FIELD_CONFIG.STAGE_HEIGHT) * h; }

function PlayThumbnail({ elements, width = 300, height = 160, playersOnly = false }) {
  const theme  = useEditorStore(s => s.theme);
  const colors = THEME_COLORS[theme] || THEME_COLORS['theme-sun-cyan'];

  const hasContent = elements && elements.some(el =>
    playersOnly
      ? (el.type === 'player' || el.type === 'football')
      : el.type !== 'scrimmage'
  );
  if (!hasContent) return <span className="card-thumb-icon">▶</span>;

  const scrimmage  = elements.find(el => el.type === 'scrimmage');
  const players    = elements.filter(el => el.type === 'player');
  const paths      = elements.filter(el => el.type === 'path');
  const football   = elements.find(el => el.type === 'football');
  const highlights = elements.filter(el => el.type === 'highlight');

  const sx = x => scaleX(x, width);
  const sy = y => scaleY(y, height);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {/* Field background */}
      <rect x={0} y={0} width={width} height={height} fill={colors.field} />

      {/* Scrimmage line */}
      {scrimmage && (
        <line
          x1={0} y1={sy(scrimmage.y)}
          x2={width} y2={sy(scrimmage.y)}
          stroke="rgba(232,200,64,0.7)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Highlights — play thumbnails only, not formation thumbnails */}
      {!playersOnly && highlights.map(h => (
        <circle
          key={h.id}
          cx={sx(h.x)}
          cy={sy(h.y)}
          r={(h.radius / FIELD_CONFIG.STAGE_WIDTH) * width}
          fill={h.color}
          opacity={h.opacity ?? 0.3}
        />
      ))}

      {/* Routes */}
      {!playersOnly && paths.map(path => {
        const ci         = path.style?.colorIndex ?? -1;
        const routeColor = ci >= 0 ? colors.palette[ci] : colors.text;

        const lineStyle = path.style?.lineStyle || 'solid';
        const routeDash = lineStyle === 'dash' ? '6 4' : lineStyle === 'dotted' ? '2 5' : undefined;

        return path.segments && path.segments.map((seg, i) => {
          const p1 = seg.points[0];
          const p2 = seg.points[1];
          if (!p1 || !p2) return null;
          const x1 = sx(p1.x), y1 = sy(p1.y);
          const x2 = sx(p2.x), y2 = sy(p2.y);

          if (seg.preSnap) {
            return (
              <line key={`${path.id}-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={routeColor} strokeWidth={1.5}
                strokeDasharray="3 2" opacity={0.6}
              />
            );
          }
          if (seg.curve) {
            const rawCp = seg.controlPoint || defaultCurveCP(p1, p2);
            const cp = { x: sx(rawCp.x), y: sy(rawCp.y) };
            return (
              <path key={`${path.id}-${i}`}
                d={`M ${x1} ${y1} Q ${cp.x} ${cp.y} ${x2} ${y2}`}
                stroke={routeColor} strokeWidth={1.5}
                strokeDasharray={routeDash}
                fill="none"
              />
            );
          }
          return (
            <line key={`${path.id}-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={routeColor} strokeWidth={1.5}
              strokeDasharray={routeDash}
            />
          );
        });
      })}

      {/* Football — rendered before players so players draw over it in SVG z-order */}
      {football && (
        <ellipse
          cx={sx(football.x)}
          cy={sy(football.y)}
          rx={Math.max(width, height) * 0.008}
          ry={Math.max(width, height) * 0.014}
          fill="#8B5E3C"
          stroke="#4A2C17"
          strokeWidth={0.8}
        />
      )}

      {/* Players */}
      {players.map(pl => {
        const cx = sx(pl.x);
        const cy = sy(pl.y);
        const r  = Math.max(width, height) * 0.022;
        const ci     = pl.style?.colorIndex ?? -1;
        const fill   = ci >= 0 ? colors.palette[ci] : colors.accent;
        const stroke = ci >= 0 ? colors.labels[ci]  : colors.text;
        const shape  = pl.style?.shape || 'circle';
        if (shape === 'square') {
          return (
            <rect key={pl.id}
              x={cx - r} y={cy - r} width={r * 2} height={r * 2}
              fill={fill} stroke={stroke} strokeWidth={0.8}
            />
          );
        }
        return (
          <circle key={pl.id}
            cx={cx} cy={cy} r={r}
            fill={fill} stroke={stroke} strokeWidth={0.8}
          />
        );
      })}
    </svg>
  );
}

export default memo(PlayThumbnail);
