import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import './FieldCanvas.css';
import useEditorStore from '../../store/useEditorStore';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { TOOL_MODES } from '../../constants/toolModes';
import { masterHitTest, hitTestPathSegments, exceededDragThreshold } from '../../utils/hitTesting';
import { snapPoint, constrainToAngle } from '../../utils/snapToGrid';
import FieldGrid from './FieldGrid';

function generateId() {
  return 'el_' + Math.random().toString(36).slice(2, 9);
}

function generateSegId() {
  return 'seg_' + Math.random().toString(36).slice(2, 9);
}

// Returns the last point of the last segment in a path
function getPathTailPoint(path) {
  if (!path?.segments?.length) return null;
  const lastSeg = path.segments[path.segments.length - 1];
  if (!lastSeg?.points?.length) return null;
  return lastSeg.points[lastSeg.points.length - 1];
}

// Generate zigzag points between two points for pre-snap rendering
function zigzagPoints(p1, p2, amplitude = 6, frequency = 8) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return [p1.x, p1.y, p2.x, p2.y];

  const steps = Math.max(2, Math.floor(len / frequency));
  const nx = -dy / len; // normal x
  const ny = dx / len;  // normal y
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

export default function FieldCanvas() {
  const {
    getActivePlay,
    addElement, updateElement, updateSegment,
    selectedId, selectedSegmentId,
    setSelectedId, setSelectedSegmentId, clearSelection,
    activeTool, setActiveTool,
    snapEnabled, snapIncrement,
    pushHistory,
    drawingPath, setDrawingPath, finishDrawing, cancelDrawing,
    activePathId,
    scrimmageVisible,
    presentMode,
  } = useEditorStore();

  const elements = getActivePlay()?.elements || [];

  const stageRef     = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 600, height: 800 });
  const [mousePos, setMousePos]   = useState(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const dragStartRef    = useRef(null);
  const dragStartPos    = useRef(null);
  const isDraggingRef   = useRef(false);
  const dragTargetRef   = useRef(null);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function updateSize() {
      setStageSize({ width: container.clientWidth, height: container.clientHeight });
    }
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Enter')  { e.preventDefault(); finishDrawing(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelDrawing(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !drawingPath) {
        const { selectedId, deleteElement } = useEditorStore.getState();
        if (selectedId && selectedId !== 'scrimmage_line') deleteElement(selectedId);
      }
    }
    function handleKeyUp(e) {
      if (e.key === 'Shift') setShiftHeld(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [finishDrawing, cancelDrawing, drawingPath]);

  const scaleX = stageSize.width  / FIELD_CONFIG.STAGE_WIDTH;
  const scaleY = stageSize.height / FIELD_CONFIG.STAGE_HEIGHT;

  function getScaledPos() {
    const pos = stageRef.current.getPointerPosition();
    return { x: pos.x / scaleX, y: pos.y / scaleY };
  }

  function resolveRoutePoint(rawPos, fromPoint) {
    if (shiftHeld && fromPoint) {
      return constrainToAngle(fromPoint, rawPos);
    }
    return snapPoint(rawPos, snapIncrement, snapEnabled);
  }

  function resolvePreviewPos(rawPos, fromPoint) {
    if (shiftHeld && fromPoint) {
      return constrainToAngle(fromPoint, rawPos);
    }
    return rawPos;
  }

  function resolveDragDelta(fromPos, toPos) {
    if (shiftHeld) {
      return constrainToAngle({ x: 0, y: 0 }, {
        x: toPos.x - fromPos.x,
        y: toPos.y - fromPos.y,
      });
    }
    return { x: toPos.x - fromPos.x, y: toPos.y - fromPos.y };
  }

  const isDrawingTool = (
    activeTool === TOOL_MODES.ADD_LINE_STRAIGHT ||
    activeTool === TOOL_MODES.ADD_LINE_CURVE
  );

  const isCurve = activeTool === TOOL_MODES.ADD_LINE_CURVE;

  // --- Pointer down ---
  function handlePointerDown() {
    if (presentMode) return;

    const pos = getScaledPos();
    dragStartRef.current  = pos;
    dragStartPos.current  = pos;
    isDraggingRef.current = false;

    const hit = masterHitTest(pos.x, pos.y, elements, selectedId);

    // ADD PLAYER
    if (activeTool === TOOL_MODES.ADD_PLAYER) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      const newPlayer = {
        id: generateId(), type: 'player',
        x: snapped.x, y: snapped.y,
        label: 'X',
        style: { fill: '#e94560', stroke: '#ffffff', shape: 'circle' },
        groupId: null,
      };
      addElement(newPlayer);
      setSelectedId(newPlayer.id);
      return;
    }

    // DRAWING TOOL — straight or curve
    if (isDrawingTool) {
      // Case 1: Already drawing — add next segment
      if (drawingPath) {
        const tail = getPathTailPoint(drawingPath) ?? drawingPath._branchOrigin ?? drawingPath._startPoint;
        const resolved = resolveRoutePoint(pos, tail);
        const newSeg = {
          id: generateSegId(),
          points: [tail, resolved],
          curve: isCurve,
          preSnap: false,
        };
        setDrawingPath({
          ...drawingPath,
          segments: [...drawingPath.segments, newSeg],
        });
        return;
      }

      // Case 2: A path is selected — branch or continue from clicked point on path
      if (selectedId) {
        const selectedEl = elements.find(el => el.id === selectedId);
        if (selectedEl?.type === 'path') {
          const pathHit = hitTestPathSegments(pos.x, pos.y, selectedEl.segments);
          if (pathHit.hit) {
            // Insert branch node at click point on the existing path
            const branchOrigin = snapPoint(pathHit.point, snapIncrement, snapEnabled);
            const { setDrawingPath: sdp, activePathId: apid } = useEditorStore.getState();
            useEditorStore.setState({ activePathId: selectedId });
            setDrawingPath({
              id: selectedId,
              type: 'path',
              segments: [],
              _branchOrigin: branchOrigin,
              style: selectedEl.style,
            });
            // Start preview from branch origin
            setMousePos(branchOrigin);
            return;
          }
          // Clicked off the path — start new route
        }
      }

      // Case 3: Nothing selected or clicked off existing path — start new route
      const resolved = resolveRoutePoint(pos, null);
      clearSelection();
      useEditorStore.setState({ activePathId: null });
      setDrawingPath({
        id: generateId(),
        type: 'path',
        segments: [],
        _startPoint: resolved,
        style: { stroke: '#ffffff', thickness: 3, endArrow: true },
      });
      return;
    }

    // SCRIMMAGE drag
    if (scrimmageVisible) {
      const scrimmage = elements.find(el => el.id === 'scrimmage_line');
      if (scrimmage && Math.abs(pos.y - scrimmage.y) < 10) {
        setSelectedId('scrimmage_line');
        dragTargetRef.current = { type: 'scrimmage', elementId: 'scrimmage_line' };
        return;
      }
    }

    // Handle / player / path selection
    if (hit.type === 'handle') {
      setSelectedSegmentId(hit.elementId, hit.segmentIndex !== null ? `seg_sel_${hit.segmentIndex}` : null);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'player') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'path') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }

    clearSelection();
    dragTargetRef.current = null;
  }

  // --- Pointer move ---
  function handlePointerMove() {
    if (presentMode) return;

    const pos = getScaledPos();

    // Preview point for drawing
    if (drawingPath) {
      const tail = drawingPath._branchOrigin ||
        getPathTailPoint(drawingPath) ||
        drawingPath._startPoint;
      setMousePos(resolvePreviewPos(pos, tail));
    } else {
      setMousePos(pos);
    }

    if (!dragStartRef.current && scrimmageVisible) {
      const scrimmage = elements.find(el => el.id === 'scrimmage_line');
      if (scrimmage && Math.abs(pos.y - scrimmage.y) < 10) {
        setHoveredId('scrimmage_line');
      } else {
        setHoveredId(null);
      }
    }

    if (!dragStartRef.current) return;
    if (!isDraggingRef.current) {
      if (exceededDragThreshold(dragStartRef.current.x, dragStartRef.current.y, pos.x, pos.y)) {
        isDraggingRef.current = true;
      } else return;
    }

    if (isDraggingRef.current && dragTargetRef.current) {
      const { type, elementId } = dragTargetRef.current;

      if (type === 'handle') {
        const snapped = snapPoint(pos, snapIncrement, snapEnabled);
        const el = elements.find(e => e.id === elementId);
        if (!el?.segments) return;
        const { segmentIndex, nodeIndex } = dragTargetRef.current;
        const newSegments = el.segments.map((seg, si) => {
          if (si !== segmentIndex) return seg;
          return {
            ...seg,
            points: seg.points.map((p, pi) => pi === nodeIndex ? snapped : p),
          };
        });
        updateElement(elementId, { segments: newSegments });
        return;
      }
      if (type === 'scrimmage') {
        updateElement('scrimmage_line', { y: pos.y });
        return;
      }

      if (type === 'player') {
        const delta = resolveDragDelta(dragStartPos.current, pos);
        const newPos = snapPoint(
          { x: dragStartPos.current.x + delta.x, y: dragStartPos.current.y + delta.y },
          snapIncrement, snapEnabled
        );
        updateElement(elementId, { x: newPos.x, y: newPos.y });
        return;
      }

      if (type === 'path') {
        const delta = resolveDragDelta(dragStartRef.current, pos);
        const el = elements.find(e => e.id === elementId);
        if (!el?.segments) return;
        const newSegments = el.segments.map(seg => ({
          ...seg,
          points: seg.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
        }));
        updateElement(elementId, { segments: newSegments });
        dragStartRef.current = pos;
        return;
      }
    }
  }

  // --- Pointer up ---
  function handlePointerUp() {
    if (isDraggingRef.current && dragTargetRef.current) pushHistory();
    dragStartRef.current  = null;
    dragStartPos.current  = null;
    isDraggingRef.current = false;
    dragTargetRef.current = null;
  }

  // Mouse handlers
  function handleStageMouseDown() { handlePointerDown(); }
  function handleStageMouseMove() { handlePointerMove(); }
  function handleStageMouseUp()   { handlePointerUp(); }

  function handleStageRightClick(e) {
    e.evt.preventDefault();
    if (isDrawingTool && drawingPath) finishDrawing();
  }

  // Touch handlers
  function handleStageTouchStart(e) { e.evt.preventDefault(); handlePointerDown(); }
  function handleStageTouchMove(e)  { e.evt.preventDefault(); handlePointerMove(); }
  function handleStageTouchEnd(e)   { e.evt.preventDefault(); handlePointerUp(); }

  // --- Render helpers ---

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

  // Render a single segment — straight, curved, or pre-snap zigzag
  function renderSegment(seg, color, thick, isPathSelected, key) {
    const pts = seg.points;
    if (!pts || pts.length < 2) return null;
    const p1 = pts[0];
    const p2 = pts[pts.length - 1];
    const stroke = isPathSelected ? '#ffff00' : color;
    const sw = isPathSelected ? thick + 1 : thick;

    if (seg.preSnap) {
      const zz = zigzagPoints(p1, p2);
      return (
        <Line key={key} points={zz} stroke={stroke} strokeWidth={sw}
          lineCap="round" lineJoin="round" />
      );
    }

    if (seg.curve) {
      // Quadratic bezier — control point is midpoint offset perpendicular
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const cpx = mx - (dy / len) * (len * 0.25);
      const cpy = my + (dx / len) * (len * 0.25);
      return (
        <Line key={key}
          points={[p1.x, p1.y, cpx, cpy, p2.x, p2.y]}
          stroke={stroke} strokeWidth={sw}
          bezier={true} lineCap="round" lineJoin="round"
        />
      );
    }

    return (
      <Line key={key} points={[p1.x, p1.y, p2.x, p2.y]}
        stroke={stroke} strokeWidth={sw}
        lineCap="round" lineJoin="round"
      />
    );
  }

  function renderPath(el) {
    if (!el.segments?.length) return null;
    const isSelected = el.id === selectedId;
    const color = el.style?.stroke || '#ffffff';
    const thick = el.style?.thickness || 3;

    // Collect all rendered segments as an array of Konva elements
    const rendered = [];

    el.segments.forEach((seg, i) => {
      rendered.push(renderSegment(seg, color, thick, isSelected, `${el.id}_seg_${i}`));
    });

    // Arrow on the last segment end point
    const lastSeg = el.segments[el.segments.length - 1];
    if (el.style?.endArrow && lastSeg?.points?.length >= 2) {
      const pts = lastSeg.points;
      const p1 = pts[pts.length - 2] || pts[0];
      const p2 = pts[pts.length - 1];
      rendered.push(
        <Arrow key={`${el.id}_arrow`}
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke={isSelected ? '#ffff00' : color}
          fill={isSelected ? '#ffff00' : color}
          strokeWidth={isSelected ? thick + 1 : thick}
          pointerLength={12}
          pointerWidth={10}
        />
      );
    }

    return rendered;
  }

  function renderNodeHandles(el) {
    if (!el?.segments) return null;
    const seen = new Set();
    const handles = [];
    el.segments.forEach((seg, si) => {
      seg.points?.forEach((p, pi) => {
        const key = `${Math.round(p.x)}_${Math.round(p.y)}`;
        if (seen.has(key)) return;
        seen.add(key);
        handles.push(
          <Circle key={`${el.id}_node_${si}_${pi}`}
            x={p.x} y={p.y} radius={6}
            fill="#ffffff" stroke="#e94560" strokeWidth={2}
          />
        );
      });
    });
    return handles;
  }

  function renderDrawingPreview() {
    if (!drawingPath || !mousePos) return null;

    const tail = drawingPath._branchOrigin ||
      getPathTailPoint(drawingPath) ||
      drawingPath._startPoint;

    if (!tail) return null;

    const color = '#ffffff';
    const thick = 3;

    // Already-committed segments in this drawing session
    const committed = drawingPath.segments.map((seg, i) => {
      const pts = seg.points;
      if (!pts || pts.length < 2) return null;
      return (
        <Line key={`preview_seg_${i}`}
          points={[pts[0].x, pts[0].y, pts[pts.length-1].x, pts[pts.length-1].y]}
          stroke={color} strokeWidth={thick}
          dash={[6, 4]} lineCap="round" opacity={0.7}
        />
      );
    });

    // Ghost line from tail to mouse
    const ghost = (
      <Line
        points={[tail.x, tail.y, mousePos.x, mousePos.y]}
        stroke={shiftHeld ? '#00ffaa' : '#e94560'}
        strokeWidth={2}
        dash={[6, 4]} lineCap="round" opacity={0.8}
      />
    );

    // Node dots
    const nodes = [];
    drawingPath.segments.forEach((seg, i) => {
      seg.points?.forEach((p, pi) => {
        nodes.push(
          <Circle key={`preview_node_${i}_${pi}`}
            x={p.x} y={p.y} radius={5} fill="#e94560"
          />
        );
      });
    });
    if (drawingPath._startPoint || drawingPath._branchOrigin) {
      const origin = drawingPath._branchOrigin || drawingPath._startPoint;
      nodes.push(
        <Circle key="preview_origin" x={origin.x} y={origin.y} radius={5} fill="#e94560" />
      );
    }

    return <>{committed}{ghost}{nodes}</>;
  }

  const selectedEl = elements.find(el => el.id === selectedId);
  const cursorStyle = presentMode
    ? 'default'
    : hoveredId === 'scrimmage_line' ? 'ns-resize' : 'crosshair';

  return (
    <div className="field-canvas-container" ref={containerRef} style={{ cursor: cursorStyle }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scaleX}
        scaleY={scaleY}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={handleStageRightClick}
        onTouchStart={handleStageTouchStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
      >
        <FieldGrid />

        <Layer>
          {renderScrimmage()}
          {elements.filter(el => el.type === 'path').map(el => renderPath(el))}
          {!presentMode && renderDrawingPreview()}
          {!presentMode && selectedEl?.type === 'path' && renderNodeHandles(selectedEl)}
        </Layer>

        <Layer>
          {elements.filter(el => el.type === 'player').map(el => {
            const isSelected = !presentMode && el.id === selectedId;
            const shape  = el.style?.shape  || 'circle';
            const fill   = el.style?.fill   || '#e94560';
            const stroke = isSelected ? '#ffff00' : (el.style?.stroke || '#ffffff');
            const sw     = isSelected ? 3 : 2;
            const r      = FIELD_CONFIG.PLAYER_RADIUS;
            if (shape === 'square') {
              return (
                <Rect key={el.id}
                  x={el.x - r} y={el.y - r}
                  width={r * 2} height={r * 2}
                  fill={fill} stroke={stroke} strokeWidth={sw} cornerRadius={3}
                />
              );
            }
            return (
              <Circle key={el.id}
                x={el.x} y={el.y} radius={r}
                fill={fill} stroke={stroke} strokeWidth={sw}
              />
            );
          })}
          {elements.filter(el => el.type === 'player' && el.label).map(el => (
            <Text key={el.id + '_label'}
              x={el.x - 12} y={el.y - 7}
              text={el.label}
              fontSize={FIELD_CONFIG.PLAYER_FONT_SIZE}
              fill="#ffffff" width={24} align="center"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
