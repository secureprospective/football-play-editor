import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import './FieldCanvas.css';
import useEditorStore from '../../store/useEditorStore';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { TOOL_MODES } from '../../constants/toolModes';
import { masterHitTest, exceededDragThreshold } from '../../utils/hitTesting';
import { snapPoint, constrainToAngle } from '../../utils/snapToGrid';
import FieldGrid from './FieldGrid';

function generateId() {
  return 'el_' + Math.random().toString(36).slice(2, 9);
}

export default function FieldCanvas() {
  const {
    getActivePlay,
    addElement, updateElement,
    selectedId, setSelectedId, clearSelection,
    activeTool,
    snapEnabled, snapIncrement,
    pushHistory,
    drawingPath, setDrawingPath, finishDrawing, cancelDrawing,
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

  // Keyboard shortcuts + shift tracking
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

  // Stretch to fill — field always fills 100% of container
  // scaleX and scaleY are independent so there is no letterboxing
  const scaleX = stageSize.width  / FIELD_CONFIG.STAGE_WIDTH;
  const scaleY = stageSize.height / FIELD_CONFIG.STAGE_HEIGHT;

  function getScaledPos() {
    const pos = stageRef.current.getPointerPosition();
    return { x: pos.x / scaleX, y: pos.y / scaleY };
  }

  function resolveRoutePoint(rawPos) {
    if (shiftHeld && drawingPath && drawingPath.points.length > 0) {
      const lastPt = drawingPath.points[drawingPath.points.length - 1];
      return constrainToAngle(lastPt, rawPos);
    }
    return snapPoint(rawPos, snapIncrement, snapEnabled);
  }

  function resolvePreviewPos(rawPos) {
    if (shiftHeld && drawingPath && drawingPath.points.length > 0) {
      const lastPt = drawingPath.points[drawingPath.points.length - 1];
      return constrainToAngle(lastPt, rawPos);
    }
    return rawPos;
  }

  // Constrain a drag delta to 45deg axes when Shift held
  function resolveDragDelta(fromPos, toPos) {
    if (shiftHeld) {
      return constrainToAngle({ x: 0, y: 0 }, {
        x: toPos.x - fromPos.x,
        y: toPos.y - fromPos.y,
      });
    }
    return { x: toPos.x - fromPos.x, y: toPos.y - fromPos.y };
  }

  function handleStageMouseDown() {
    // In present mode — no interaction
    if (presentMode) return;

    const pos = getScaledPos();
    dragStartRef.current  = pos;
    dragStartPos.current  = pos;
    isDraggingRef.current = false;

    const editNodesMode = activeTool === TOOL_MODES.EDIT_NODES;
    const hit = masterHitTest(pos.x, pos.y, elements, selectedId, editNodesMode);

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

    if (activeTool === TOOL_MODES.ADD_LINE) {
      const resolved = resolveRoutePoint(pos);
      if (!drawingPath) {
        setDrawingPath({
          id: generateId(), type: 'path',
          points: [resolved],
          style: { stroke: '#ffffff', thickness: 3, dash: false, endArrow: true },
          groupId: null,
        });
      } else {
        setDrawingPath({ ...drawingPath, points: [...drawingPath.points, resolved] });
      }
      return;
    }

    // Scrimmage line hit
    if (scrimmageVisible) {
      const scrimmage = elements.find(el => el.id === 'scrimmage_line');
      if (scrimmage && Math.abs(pos.y - scrimmage.y) < 10) {
        setSelectedId('scrimmage_line');
        dragTargetRef.current = { type: 'scrimmage', elementId: 'scrimmage_line', nodeIndex: null };
        return;
      }
    }

    if (hit.type === 'handle') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'player' || hit.type === 'path') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }

    clearSelection();
    dragTargetRef.current = null;
  }

  function handleStageMouseMove() {
    if (presentMode) return;

    const pos = getScaledPos();
    const resolved = resolvePreviewPos(pos);
    setMousePos(resolved);

    // Hover detection for scrimmage cursor
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
      const { type, elementId, nodeIndex } = dragTargetRef.current;

      // Scrimmage — vertical only, no snap
      if (type === 'scrimmage') {
        updateElement('scrimmage_line', { y: pos.y });
        return;
      }

      // Player — snap + optional Shift constraint
      if (type === 'player') {
        const delta = resolveDragDelta(dragStartPos.current, pos);
        const newPos = snapPoint(
          { x: dragStartPos.current.x + delta.x, y: dragStartPos.current.y + delta.y },
          snapIncrement, snapEnabled
        );
        updateElement(elementId, { x: newPos.x, y: newPos.y });
        return;
      }

      // Whole path drag — translate all points by delta
      if (type === 'path') {
        const delta = resolveDragDelta(dragStartRef.current, pos);
        const el = elements.find(e => e.id === elementId);
        if (!el) return;
        const newPoints = el.points.map(p => ({
          x: p.x + delta.x,
          y: p.y + delta.y,
        }));
        updateElement(elementId, { points: newPoints });
        // Update drag start for next frame delta
        dragStartRef.current = pos;
        return;
      }

      // Node handle
      if (type === 'handle' && nodeIndex !== null) {
        const snapped = snapPoint(pos, snapIncrement, snapEnabled);
        const el = elements.find(e => e.id === elementId);
        if (!el) return;
        const newPoints = el.points.map((p, i) => i === nodeIndex ? snapped : p);
        updateElement(elementId, { points: newPoints });
      }
    }
  }

  function handleStageMouseUp() {
    if (isDraggingRef.current && dragTargetRef.current) pushHistory();
    dragStartRef.current  = null;
    dragStartPos.current  = null;
    isDraggingRef.current = false;
    dragTargetRef.current = null;
  }

  function handleStageRightClick(e) {
    e.evt.preventDefault();
    if (activeTool === TOOL_MODES.ADD_LINE && drawingPath) finishDrawing();
  }

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

  function renderPath(el) {
    const isSelected = el.id === selectedId;
    const pts = el.points;
    if (!pts || pts.length < 2) return null;
    const flat = pts.flatMap(p => [p.x, p.y]);
    const dashPattern = el.style?.dash ? [10, 8] : [];
    const color = el.style?.stroke    || '#ffffff';
    const thick = el.style?.thickness || 3;

    if (el.style?.endArrow) {
      return (
        <Arrow
          key={el.id}
          points={flat}
          stroke={isSelected ? '#ffff00' : color}
          strokeWidth={isSelected ? thick + 1 : thick}
          fill={isSelected ? '#ffff00' : color}
          pointerLength={12}
          pointerWidth={10}
          dash={dashPattern}
          lineCap="round"
          lineJoin="round"
        />
      );
    }
    return (
      <Line
        key={el.id}
        points={flat}
        stroke={isSelected ? '#ffff00' : color}
        strokeWidth={isSelected ? thick + 1 : thick}
        dash={dashPattern}
        lineCap="round"
        lineJoin="round"
      />
    );
  }

  function renderNodeHandles(el) {
    if (!el || el.type !== 'path' || !el.points) return null;
    return el.points.map((p, i) => (
      <Circle
        key={el.id + '_node_' + i}
        x={p.x} y={p.y}
        radius={6}
        fill="#ffffff"
        stroke="#e94560"
        strokeWidth={2}
      />
    ));
  }

  function renderDrawingPreview() {
    if (!drawingPath || !mousePos) return null;
    const pts = drawingPath.points;
    if (pts.length === 0) return null;
    const lastPt = pts[pts.length - 1];
    const previewFlat = [lastPt.x, lastPt.y, mousePos.x, mousePos.y];
    const allFlat = pts.flatMap(p => [p.x, p.y]);
    return (
      <>
        {pts.length >= 2 && (
          <Line points={allFlat} stroke="#ffffff" strokeWidth={3}
            dash={[6, 4]} lineCap="round" opacity={0.7} />
        )}
        <Line points={previewFlat}
          stroke={shiftHeld ? '#00ffaa' : '#e94560'}
          strokeWidth={2}
          dash={[6, 4]} lineCap="round" opacity={0.8} />
        {pts.map((p, i) => (
          <Circle key={'preview_node_' + i} x={p.x} y={p.y} radius={5} fill="#e94560" />
        ))}
      </>
    );
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
      >
        <FieldGrid />

        <Layer>
          {renderScrimmage()}
          {elements.filter(el => el.type === 'path').map(el => renderPath(el))}
          {!presentMode && renderDrawingPreview()}
          {!presentMode && activeTool === TOOL_MODES.EDIT_NODES && selectedEl?.type === 'path' &&
            renderNodeHandles(selectedEl)
          }
        </Layer>

        <Layer>
          {elements.filter(el => el.type === 'player').map(el => {
            const isSelected = !presentMode && el.id === selectedId;
            return (
              <Circle
                key={el.id}
                x={el.x} y={el.y}
                radius={FIELD_CONFIG.PLAYER_RADIUS}
                fill={el.style?.fill || '#e94560'}
                stroke={isSelected ? '#ffff00' : (el.style?.stroke || '#ffffff')}
                strokeWidth={isSelected ? 3 : 2}
              />
            );
          })}
          {elements.filter(el => el.type === 'player' && el.label).map(el => (
            <Text
              key={el.id + '_label'}
              x={el.x - 12} y={el.y - 7}
              text={el.label}
              fontSize={FIELD_CONFIG.PLAYER_FONT_SIZE}
              fill="#ffffff"
              width={24}
              align="center"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
