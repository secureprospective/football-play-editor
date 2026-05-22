import { Layer, Rect, Circle, Text, Line, RegularPolygon, Ellipse } from 'react-konva';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { FOOTBALL_RX, FOOTBALL_RY, TEXT_FONT_SIZE } from '../../utils/hitTesting';
import { defaultCurveCP, bezierCtrl } from '../../utils/curveUtils';

const FOOTBALL_ATTACH_OFFSET = FIELD_CONFIG.PLAYER_RADIUS;

function zigzagPoints(p1, p2, amplitude = 6, frequency = 8) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [p1.x, p1.y, p2.x, p2.y];
  const steps = Math.max(2, Math.floor(len / frequency));
  const nx = -dy / len;
  const ny =  dx / len;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = p1.x + t * dx;
    const by = p1.y + t * dy;
    const offset = (i % 2 === 0 ? 1 : -1) * amplitude;
    pts.push(bx + nx * offset, by + ny * offset);
  }
  return pts;
}

function isVisible(visibility, t) {
  if (!visibility) return true;
  if (visibility.startTime !== null && t < visibility.startTime) return false;
  if (visibility.endTime   !== null && t > visibility.endTime)   return false;
  return true;
}

export default function FieldRenderer({
  elements, colors, selectedId, marqueeIds, liveMarqueeIds,
  drawingPath, mousePos, presentMode, scrimmageVisible,
  shiftHeld, hoveredId, guidingPlayerId, placingHighlight, marqueeRect, isBoxSelect,
  positions = new Map(), currentTime = 0,
}) {
  const selectedEl = elements.find(el => el.id === selectedId);

  function renderScrimmage() {
    if (!scrimmageVisible) return null;
    const scrimmage = elements.find(el => el.id === 'scrimmage_line');
    if (!scrimmage) return null;
    const isSelected = selectedId === 'scrimmage_line';
    const isHovered  = hoveredId  === 'scrimmage_line';
    return (
      <Line
        points={[FIELD_CONFIG.FIELD_LEFT, scrimmage.y, FIELD_CONFIG.FIELD_RIGHT, scrimmage.y]}
        stroke={isSelected ? '#ffff00' : '#e8c840'}
        strokeWidth={isSelected ? 3 : 2}
        opacity={isHovered ? 1 : 0.85}
        dash={[12, 6]}
      />
    );
  }

  function renderSegment(seg, color, thick, isPathSelected, key, lineStyle = 'solid') {
    const pts = seg.points;
    if (!pts || pts.length < 2) return null;
    const p1 = pts[0];
    const p2 = pts[pts.length - 1];
    const stroke = isPathSelected ? '#ffff00' : color;
    const sw = isPathSelected ? thick + 1 : thick;
    const dashProp = lineStyle === 'dash' ? [8, 6] : lineStyle === 'dotted' ? [3, 10] : undefined;

    if (seg.preSnap) {
      const zz = zigzagPoints(p1, p2);
      return <Line key={key} points={zz} stroke={stroke} strokeWidth={sw} lineCap="round" lineJoin="round" />;
    }

    if (seg.curve) {
      const cp = seg.controlPoint;
      if (cp) {
        return (
          <Line key={key}
            points={[p1.x, p1.y, cp.x, cp.y, p2.x, p2.y]}
            stroke={stroke} strokeWidth={sw}
            tension={0.5} lineCap="round" lineJoin="round" dash={dashProp}
          />
        );
      }
      const { x: cpx, y: cpy } = defaultCurveCP(p1, p2);
      return (
        <Line key={key}
          points={[p1.x, p1.y, cpx, cpy, p2.x, p2.y]}
          stroke={stroke} strokeWidth={sw}
          tension={0.5} lineCap="round" lineJoin="round" dash={dashProp}
        />
      );
    }

    return (
      <Line key={key} points={[p1.x, p1.y, p2.x, p2.y]}
        stroke={stroke} strokeWidth={sw} lineCap="round" lineJoin="round" dash={dashProp}
      />
    );
  }

  function renderPath(el) {
    if (!el.segments?.length) return null;
    const isSelected = el.id === selectedId;
    const ci = el.style?.colorIndex ?? -1;
    const color = ci >= 0 ? colors.palette[ci] : colors.text;
    const thick = el.style?.thickness || 3;
    const lineStyle = el.style?.lineStyle || 'solid';

    const rendered = [];

    el.segments.forEach((seg, i) => {
      const segCi = seg.colorIndex !== undefined ? seg.colorIndex : ci;
      const segColor = segCi >= 0 ? colors.palette[segCi] : colors.text;
      rendered.push(renderSegment(seg, segColor, thick, isSelected, `${el.id}_seg_${i}`, lineStyle));
    });

    const lastSeg = el.segments[el.segments.length - 1];
    if (el.style?.endArrow && lastSeg?.points?.length >= 2) {
      const pts = lastSeg.points;
      const p2 = pts[pts.length - 1];
      let arrowPoints;
      if (lastSeg.curve) {
        const p0 = pts[0];
        const cp = lastSeg.controlPoint || defaultCurveCP(p0, p2);
        const ctrl = bezierCtrl(cp, p0, p2);
        const tdx = p2.x - ctrl.x;
        const tdy = p2.y - ctrl.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
        const tailLen = 20;
        arrowPoints = tlen > 0
          ? [p2.x - (tdx / tlen) * tailLen, p2.y - (tdy / tlen) * tailLen, p2.x, p2.y]
          : [p0.x, p0.y, p2.x, p2.y];
      } else {
        const p1 = pts[pts.length - 2] || pts[0];
        arrowPoints = [p1.x, p1.y, p2.x, p2.y];
      }
      const tailX = arrowPoints[0];
      const tailY = arrowPoints[1];
      const angle = Math.atan2(p2.y - tailY, p2.x - tailX) * (180 / Math.PI);
      rendered.push(
        <RegularPolygon key={`${el.id}_arrow`}
          x={p2.x} y={p2.y} sides={3} radius={10}
          fill={isSelected ? '#ffff00' : color}
          stroke={isSelected ? '#ffff00' : color}
          strokeWidth={1} rotation={angle + 90}
        />
      );
    }

    if (el.style?.endT && lastSeg?.points?.length >= 2) {
      const pts = lastSeg.points;
      const p2 = pts[pts.length - 1];
      let perpX = 1, perpY = 0;
      if (lastSeg.curve) {
        const p0 = pts[0];
        const cp = lastSeg.controlPoint || defaultCurveCP(p0, p2);
        const ctrl = bezierCtrl(cp, p0, p2);
        const tdx = p2.x - ctrl.x;
        const tdy = p2.y - ctrl.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tlen > 0) { perpX = -tdy / tlen; perpY = tdx / tlen; }
      } else {
        const p1 = pts[pts.length - 2] || pts[0];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) { perpX = -dy / len; perpY = dx / len; }
      }
      const halfLen = 18;
      rendered.push(
        <Line key={`${el.id}_tend`}
          points={[
            p2.x - perpX * halfLen, p2.y - perpY * halfLen,
            p2.x + perpX * halfLen, p2.y + perpY * halfLen,
          ]}
          stroke={isSelected ? '#ffff00' : color}
          strokeWidth={thick} lineCap="round"
        />
      );
    }

    return rendered;
  }

  function renderFootball(el) {
    const isSelected = !presentMode && el.id === selectedId;
    const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
    const animPos = positions.get(el.id);
    let visualX = animPos?.x ?? el.x;
    let visualY = animPos?.y ?? el.y;
    if (!animPos && el.attachedToElementId) {
      const player = elements.find(e => e.id === el.attachedToElementId && e.type === 'player');
      if (player) {
        const playerAnimPos = positions.get(player.id);
        visualX = (playerAnimPos?.x ?? player.x) + FOOTBALL_ATTACH_OFFSET;
        visualY = playerAnimPos?.y ?? player.y;
      }
    }
    return (
      <Ellipse key={el.id}
        x={visualX} y={visualY}
        radiusX={FOOTBALL_RX} radiusY={FOOTBALL_RY}
        fill="#8B5E3C"
        stroke={isSelected ? '#ffff00' : inMarquee ? colors.accent : '#4A2C17'}
        strokeWidth={isSelected || inMarquee ? 3 : 2}
      />
    );
  }

  function renderHighlightPreview() {
    if (!placingHighlight || !mousePos) return null;
    const dx = mousePos.x - placingHighlight.x;
    const dy = mousePos.y - placingHighlight.y;
    const radius = Math.max(20, Math.sqrt(dx * dx + dy * dy));
    return (
      <Circle
        x={placingHighlight.x} y={placingHighlight.y} radius={radius}
        fill="#ffff00" opacity={0.2}
        stroke={colors.accent} strokeWidth={1} dash={[8, 6]}
      />
    );
  }

  function renderNodeHandles(el) {
    if (!el?.segments) return null;
    const seen = new Set();
    const handles = [];
    el.segments.forEach((seg, si) => {
      if (seg.curve && seg.controlPoint) {
        const p1 = seg.points[0];
        const p2 = seg.points[seg.points.length - 1];
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const cp = seg.controlPoint;
        handles.push(
          <Line key={`${el.id}_cp_arm_${si}`}
            points={[mid.x, mid.y, cp.x, cp.y]}
            stroke={colors.accent} strokeWidth={1} dash={[4, 4]} opacity={0.6}
          />,
          <Circle key={`${el.id}_cp_${si}`}
            x={cp.x} y={cp.y} radius={5}
            fill={colors.accent} stroke={colors.field} strokeWidth={2}
          />
        );
      }
      seg.points?.forEach((p, pi) => {
        const key = `${Math.round(p.x)}_${Math.round(p.y)}`;
        if (seen.has(key)) return;
        seen.add(key);
        handles.push(
          <Circle key={`${el.id}_node_${si}_${pi}`}
            x={p.x} y={p.y} radius={6}
            fill={colors.text} stroke={colors.accent} strokeWidth={2}
          />
        );
      });
    });
    return handles;
  }

  function renderDrawingPreview() {
    if (!drawingPath || !mousePos) return null;
    const tail = drawingPath._branchOrigin || drawingPath.segments?.[drawingPath.segments.length - 1]?.points?.slice(-1)[0] || drawingPath._startPoint;
    if (!tail) return null;
    const color = colors.text;
    const thick = 3;
    const committed = drawingPath.segments.map((seg, i) =>
      renderSegment(seg, color, thick, false, `preview_seg_${i}`)
    );
    const ghost = (
      <Line
        points={[tail.x, tail.y, mousePos.x, mousePos.y]}
        stroke={shiftHeld ? '#00ffaa' : colors.accent}
        strokeWidth={2} dash={[6, 4]} lineCap="round" opacity={0.8}
      />
    );
    const nodes = [];
    drawingPath.segments.forEach((seg, i) => {
      seg.points?.forEach((p, pi) => {
        nodes.push(<Circle key={`preview_node_${i}_${pi}`} x={p.x} y={p.y} radius={5} fill={colors.accent} />);
      });
    });
    if (drawingPath._startPoint || drawingPath._branchOrigin) {
      const origin = drawingPath._branchOrigin || drawingPath._startPoint;
      nodes.push(<Circle key="preview_origin" x={origin.x} y={origin.y} radius={5} fill={colors.accent} />);
    }
    return <>{committed}{ghost}{nodes}</>;
  }

  function renderAllNodes() {
    if (!isBoxSelect || presentMode) return null;
    const seen = new Set();
    return elements.filter(el => el.type === 'path').flatMap(el => {
      const isLive = liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id);
      return el.segments.flatMap((seg, si) =>
        seg.points.filter(p => {
          const key = `${Math.round(p.x)}_${Math.round(p.y)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).map((p, pi) => (
          <Circle key={`mn_${el.id}_${si}_${pi}`}
            x={p.x} y={p.y}
            radius={isLive ? 6 : 4}
            fill={isLive ? colors.accent : colors.text}
            stroke={isLive ? colors.field : colors.accent}
            strokeWidth={isLive ? 2 : 1}
            opacity={isLive ? 1 : 0.3}
          />
        ))
      );
    });
  }

  return (
    <>
      <Layer>
        {/* Alignment guides */}
        {guidingPlayerId && elements
          .filter(el => el.type === 'player' && el.id === guidingPlayerId)
          .flatMap(pl => {
            const r = pl.style?.radius || FIELD_CONFIG.PLAYER_RADIUS;
            return [
              <Line key={`gt_${pl.id}`} points={[0, pl.y - r, FIELD_CONFIG.STAGE_WIDTH, pl.y - r]} stroke={colors.accent} strokeWidth={1} opacity={0.375} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />,
              <Line key={`gb_${pl.id}`} points={[0, pl.y + r, FIELD_CONFIG.STAGE_WIDTH, pl.y + r]} stroke={colors.accent} strokeWidth={1} opacity={0.375} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />,
              <Line key={`gl_${pl.id}`} points={[pl.x - r, 0, pl.x - r, FIELD_CONFIG.STAGE_HEIGHT]} stroke={colors.accent} strokeWidth={1} opacity={0.375} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />,
              <Line key={`gr_${pl.id}`} points={[pl.x + r, 0, pl.x + r, FIELD_CONFIG.STAGE_HEIGHT]} stroke={colors.accent} strokeWidth={1} opacity={0.375} dash={[4, 4]} listening={false} perfectDrawEnabled={false} />,
            ];
          })
        }
        {/* Highlights */}
        {elements.filter(el => el.type === 'highlight' && ((!presentMode && currentTime === 0) || isVisible(el.visibility, currentTime))).map(el => {
          const isSelected = !presentMode && el.id === selectedId;
          const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
          return (
            <Circle key={el.id}
              x={el.x} y={el.y} radius={el.radius}
              fill={el.color}
              opacity={isSelected ? Math.min(1, (el.opacity ?? 0.3) + 0.15) : (el.opacity ?? 0.3)}
              stroke={isSelected ? '#ffff00' : inMarquee ? colors.accent : undefined}
              strokeWidth={isSelected || inMarquee ? 2 : 0}
            />
          );
        })}
        {!presentMode && renderHighlightPreview()}
        {renderScrimmage()}
        {elements.filter(el => el.type === 'path').flatMap(el => {
          const result = renderPath(el);
          return Array.isArray(result) ? result : (result ? [result] : []);
        })}
        {!presentMode && renderDrawingPreview()}
        {!presentMode && !isBoxSelect && selectedEl?.type === 'path' && renderNodeHandles(selectedEl)}
        {renderAllNodes()}
        {/* Football — Layer 1 so players (Layer 2) draw over attached ball */}
        {elements.filter(el => el.type === 'football').map(el => renderFootball(el))}
        {/* Marquee rect */}
        {marqueeRect && (
          <Rect
            x={Math.min(marqueeRect.x, marqueeRect.x + marqueeRect.width)}
            y={Math.min(marqueeRect.y, marqueeRect.y + marqueeRect.height)}
            width={Math.abs(marqueeRect.width)}
            height={Math.abs(marqueeRect.height)}
            stroke={colors.accent} strokeWidth={1} dash={[6, 4]}
            fill={colors.accent} opacity={0.08}
          />
        )}
      </Layer>

      <Layer>
        {elements.filter(el => el.type === 'player').map(el => {
          const isSelected = !presentMode && el.id === selectedId;
          const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
          const shape = el.style?.shape || 'circle';
          const ci    = el.style?.colorIndex ?? -1;
          const fill  = ci >= 0 ? colors.palette[ci] : colors.accent;
          const labelColor = ci >= 0 ? colors.labels[ci] : colors.text;
          const stroke = isSelected ? '#ffff00' : inMarquee ? colors.accent : labelColor;
          const sw = isSelected || inMarquee ? 3 : 2;
          const r  = FIELD_CONFIG.PLAYER_RADIUS;
          const animPos = positions.get(el.id);
          const px = animPos?.x ?? el.x;
          const py = animPos?.y ?? el.y;
          if (shape === 'square') {
            return (
              <Rect key={el.id}
                x={px - r} y={py - r}
                width={r * 2} height={r * 2}
                fill={fill} stroke={stroke} strokeWidth={sw} cornerRadius={3}
              />
            );
          }
          return (
            <Circle key={el.id}
              x={px} y={py} radius={r}
              fill={fill} stroke={stroke} strokeWidth={sw}
            />
          );
        })}
        {elements.filter(el => el.type === 'player' && el.label).map(el => {
          const isSelected = !presentMode && el.id === selectedId;
          const animPos = positions.get(el.id);
          const px = animPos?.x ?? el.x;
          const py = animPos?.y ?? el.y;
          return (
            <Text key={el.id + '_label'}
              x={px - 12} y={py - 7}
              text={el.label}
              fontSize={FIELD_CONFIG.PLAYER_FONT_SIZE}
              fill={isSelected ? '#ffff00' : (el.style?.colorIndex >= 0 ? colors.labels[el.style.colorIndex] : colors.text)}
              width={24} align="center"
            />
          );
        })}
        {/* Text annotations */}
        {elements.filter(el => el.type === 'text' && el.content && ((!presentMode && currentTime === 0) || isVisible(el.visibility, currentTime))).map(el => {
          const isSelected = !presentMode && el.id === selectedId;
          const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
          return (
            <Text key={el.id}
              x={el.x} y={el.y}
              text={el.content || ''}
              fontSize={TEXT_FONT_SIZE}
              fontFamily="sans-serif"
              fill={isSelected ? '#ffff00' : inMarquee ? colors.accent : colors.text}
            />
          );
        })}
      </Layer>
    </>
  );
}
