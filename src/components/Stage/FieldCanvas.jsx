import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Arrow } from 'react-konva';
import './FieldCanvas.css';
import useEditorStore from '../../store/useEditorStore';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { TOOL_MODES } from '../../constants/toolModes';
import { masterHitTest, exceededDragThreshold } from '../../utils/hitTesting';
import { snapPoint } from '../../utils/snapToGrid';

function generateId() {
  return 'el_' + Math.random().toString(36).slice(2, 9);
}

export default function FieldCanvas() {
  const {
    elements, addElement, updateElement,
    selectedId, setSelectedId, clearSelection,
    activeTool,
    snapEnabled, snapIncrement,
    pushHistory,
  } = useEditorStore();

  const stageRef      = useRef(null);
  const containerRef  = useRef(null);
  const [stageSize, setStageSize]     = useState({ width: 800, height: 450 });
  const [drawingPath, setDrawingPath] = useState(null);
  const [mousePos, setMousePos]       = useState(null);
  const dragStartRef  = useRef(null);
  const isDraggingRef = useRef(false);
  const dragTargetRef = useRef(null);

  // Resize stage to fit container using ResizeObserver
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

  const scaleX = stageSize.width  / FIELD_CONFIG.STAGE_WIDTH;
  const scaleY = stageSize.height / FIELD_CONFIG.STAGE_HEIGHT;

  function getScaledPos(e) {
    const pos = stageRef.current.getPointerPosition();
    return { x: pos.x / scaleX, y: pos.y / scaleY };
  }

  // --- Mouse Handlers ---

  function handleStageMouseDown(e) {
    const pos = getScaledPos(e);
    dragStartRef.current    = pos;
    isDraggingRef.current   = false;

    const editNodesMode = activeTool === TOOL_MODES.EDIT_NODES;
    const hit = masterHitTest(pos.x, pos.y, elements, selectedId, editNodesMode);

    // ADD_PLAYER
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

    // ADD_LINE — click to add points
    if (activeTool === TOOL_MODES.ADD_LINE) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      if (!drawingPath) {
        const newPath = {
          id: generateId(), type: 'path',
          points: [snapped],
          style: { stroke: '#ffffff', thickness: 3, dash: false, endArrow: true },
          groupId: null,
        };
        setDrawingPath(newPath);
      } else {
        setDrawingPath(prev => ({ ...prev, points: [...prev.points, snapped] }));
      }
      return;
    }

    // SELECT / EDIT_NODES — hit test then drag
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

  function handleStageMouseMove(e) {
    const pos = getScaledPos(e);
    setMousePos(pos);

    if (!dragStartRef.current) return;
    if (!isDraggingRef.current) {
      if (exceededDragThreshold(dragStartRef.current.x, dragStartRef.current.y, pos.x, pos.y)) {
        isDraggingRef.current = true;
      } else return;
    }

    if (isDraggingRef.current && dragTargetRef.current) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      const { type, elementId, nodeIndex } = dragTargetRef.current;

      if (type === 'player') {
        updateElement(elementId, { x: snapped.x, y: snapped.y });
      }
      if (type === 'handle' && nodeIndex !== null) {
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
    isDraggingRef.current = false;
  }

  function handleStageDblClick() {
    if (activeTool === TOOL_MODES.ADD_LINE && drawingPath) {
      if (drawingPath.points.length >= 2) {
        addElement(drawingPath);
        setSelectedId(drawingPath.id);
      }
      setDrawingPath(null);
      setMousePos(null);
    }
  }

  // --- Render Helpers ---

  function renderPath(el) {
    const isSelected = el.id === selectedId;
    const pts = el.points;
    if (!pts || pts.length < 2) return null;

    const flat = pts.flatMap(p => [p.x, p.y]);
    const dashPattern = el.style?.dash ? [10, 8] : [];
    const color  = el.style?.stroke    || '#ffffff';
    const thick  = el.style?.thickness || 3;

    if (el.style?.endArrow) {
      // Draw all segments as a line, then an arrow head at the end
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
          <Line
            points={allFlat}
            stroke="#ffffff"
            strokeWidth={3}
            dash={[6, 4]}
            lineCap="round"
            opacity={0.7}
          />
        )}
        <Line
          points={previewFlat}
          stroke="#e94560"
          strokeWidth={2}
          dash={[6, 4]}
          lineCap="round"
          opacity={0.8}
        />
        {pts.map((p, i) => (
          <Circle key={'preview_node_' + i} x={p.x} y={p.y} radius={5} fill="#e94560" />
        ))}
      </>
    );
  }

  const selectedEl = elements.find(el => el.id === selectedId);

  return (
    <div className="field-canvas-container" ref={containerRef}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scaleX}
        scaleY={scaleY}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onDblClick={handleStageDblClick}
      >
        {/* Layer 1: Field */}
        <Layer>
          <Rect
            x={FIELD_CONFIG.FIELD_LEFT}
            y={FIELD_CONFIG.FIELD_TOP}
            width={FIELD_CONFIG.FIELD_RIGHT  - FIELD_CONFIG.FIELD_LEFT}
            height={FIELD_CONFIG.FIELD_BOTTOM - FIELD_CONFIG.FIELD_TOP}
            fill="#2d5a27"
            stroke="#ffffff"
            strokeWidth={2}
          />
          <Rect
            x={FIELD_CONFIG.MIDPOINT_X - 1}
            y={FIELD_CONFIG.FIELD_TOP}
            width={2}
            height={FIELD_CONFIG.FIELD_BOTTOM - FIELD_CONFIG.FIELD_TOP}
            fill="rgba(255,255,255,0.3)"
          />
        </Layer>

        {/* Layer 2: Routes / Paths */}
        <Layer>
          {elements.filter(el => el.type === 'path').map(el => renderPath(el))}
          {renderDrawingPreview()}
          {activeTool === TOOL_MODES.EDIT_NODES && selectedEl?.type === 'path' &&
            renderNodeHandles(selectedEl)
          }
        </Layer>

        {/* Layer 3: Players */}
        <Layer>
          {elements.filter(el => el.type === 'player').map(el => {
            const isSelected = el.id === selectedId;
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
