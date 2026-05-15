import React from 'react';

const FIELD_WIDTH  = 1920;
const FIELD_HEIGHT = 1080;

// Scale a field coordinate into the thumbnail SVG space
function scaleX(x, w) { return (x / FIELD_WIDTH)  * w; }
function scaleY(y, h) { return (y / FIELD_HEIGHT) * h; }

// Compute auto curve control point matching FieldCanvas logic
function curveCP(p1, p2) {
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

export default function PlayThumbnail({ elements, width = 300, height = 160 }) {
  const hasContent = elements && elements.some(el => el.type !== 'scrimmage');
  if (!hasContent) return <span className="card-thumb-icon">▶</span>;

  const scrimmage = elements.find(el => el.type === 'scrimmage');
  const players   = elements.filter(el => el.type === 'player');
  const paths     = elements.filter(el => el.type === 'path');

  const sx = x => scaleX(x, width);
  const sy = y => scaleY(y, height);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      {/* Scrimmage line */}
      {scrimmage && (
        <line
          x1={0} y1={sy(scrimmage.y)}
          x2={width} y2={sy(scrimmage.y)}
          stroke="rgba(255,200,0,0.7)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Routes */}
      {paths.map(path =>
        path.segments && path.segments.map((seg, i) => {
          const p1 = seg.points[0];
          const p2 = seg.points[1];
          if (!p1 || !p2) return null;
          const x1 = sx(p1.x), y1 = sy(p1.y);
          const x2 = sx(p2.x), y2 = sy(p2.y);

          if (seg.preSnap) {
            // Motion — dashed line
            return (
              <line key={`${path.id}-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(0,0,0,0.7)" strokeWidth={1.5}
                strokeDasharray="3 2"
              />
            );
          }
          if (seg.curve) {
            const cp = seg.controlPoint
              ? { x: sx(seg.controlPoint.x), y: sy(seg.controlPoint.y) }
              : (() => { const c = curveCP(p1, p2); return { x: sx(c.x), y: sy(c.y) }; })();
            return (
              <path key={`${path.id}-${i}`}
                d={`M ${x1} ${y1} Q ${cp.x} ${cp.y} ${x2} ${y2}`}
                stroke="rgba(0,0,0,0.7)" strokeWidth={1.5}
                fill="none"
              />
            );
          }
          return (
            <line key={`${path.id}-${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(0,0,0,0.7)" strokeWidth={1.5}
            />
          );
        })
      )}

      {/* Players */}
      {players.map(pl => {
        const cx = sx(pl.x);
        const cy = sy(pl.y);
        const r  = Math.max(width, height) * 0.022;
        const fill   = pl.style?.fill   || '#cc4444';
        const stroke = pl.style?.stroke || '#000';
        const shape  = pl.style?.shape  || 'circle';
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
