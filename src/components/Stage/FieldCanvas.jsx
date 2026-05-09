import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';
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

  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 450 });
  const [drawingPath, setDrawingPath] = useState(null);
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragTargetRef = useRef(null);

  // Resize stage to fit container using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function updateSize() {
      setStageSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Scale factor from design coordinates (1920x1080) to actual stage size
  const scaleX = stageSize.width  / FIELD_CONFIG.STAGE_WIDTH;
  const scaleY = stageSize.height / FIELD_CONFIG.STAGE_HEIGHT;

  function getScaledPos(e) {
    const stage = stageRef.current;
    const pos   = stage.getPointerPosition();
    return {
      x: pos.x / scaleX,
      y: pos.y / scaleY,
    };
  }

  function handleStageMouseDown(e) {
    const pos = getScaledPos(e);
    dragStartRef.current = pos;
    isDraggingRef.current = false;

    const editNodesMode = activeTool === TOOL_MODES.EDIT_NODES;
    const hit = masterHitTest(pos.x, pos.y, elements, selectedId, editNodesMode);

    if (activeTool === TOOL_MODES.ADD_PLAYER) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      const newPlayer = {
        id: generateId(),
        type: 'player',
        x: snapped.x,
        y: snapped.y,
        label: 'X',
        style: { fill: '#e94560', stroke: '#ffffff', shape: 'circle' },
        groupId: null,
      };
      addElement(newPlayer);
      setSelectedId(newPlayer.id);
      return;
    }

    if (activeTool === TOOL_MODES.ADD_LINE) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      if (!drawingPath) {
        const newPath = {
          id: generateId(),
          type: 'path',
          points: [snapped],
          style: { stroke: '#ffffff', thickness: 3, dash: false, endArrow: true },
          groupId: null,
        };
        setDrawingPath(newPath);
      } else {
        setDrawingPath(prev => ({
          ...prev,
          points: [...prev.points, snapped],
        }));
      }
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
    if (!dragStartRef.current) return;
    const pos = getScaledPos(e);

    if (!isDraggingRef.current) {
      if (exceededDragThreshold(dragStartRef.current.x, dragStartRef.current.y, pos.x, pos.y)) {
        isDraggingRef.current = true;
      } else {
        return;
      }
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
        const newPoints = el.points.map((p, i) =>
          i === nodeIndex ? snapped : p
        );
        updateElement(elementId, { points: newPoints });
      }
    }
  }

  function handleStageMouseUp() {
    if (isDraggingRef.current && dragTargetRef.current) {
      pushHistory();
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
  }

  function handleStageDblClick() {
    if (activeTool === TOOL_MODES.ADD_LINE && drawingPath) {
      if (drawingPath.points.length >= 2) {
        addElement(drawingPath);
        setSelectedId(drawingPath.id);
      }
      setDrawingPath(null);
    }
  }

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
        <Layer>
          {/* Field placeholder */}
          <Rect
            x={FIELD_CONFIG.FIELD_LEFT}
            y={FIELD_CONFIG.FIELD_TOP}
            width={FIELD_CONFIG.FIELD_RIGHT - FIELD_CONFIG.FIELD_LEFT}
            height={FIELD_CONFIG.FIELD_BOTTOM - FIELD_CONFIG.FIELD_TOP}
            fill="#2d5a27"
            stroke="#ffffff"
            strokeWidth={2}
          />

          {/* Midfield line */}
          <Rect
            x={FIELD_CONFIG.MIDPOINT_X - 1}
            y={FIELD_CONFIG.FIELD_TOP}
            width={2}
            height={FIELD_CONFIG.FIELD_BOTTOM - FIELD_CONFIG.FIELD_TOP}
            fill="rgba(255,255,255,0.3)"
          />
        </Layer>

        <Layer>
          {/* Render all elements */}
          {elements.map(el => {
            if (el.type === 'player') {
              const isSelected = el.id === selectedId;
              return (
                <Circle
                  key={el.id}
                  x={el.x}
                  y={el.y}
                  radius={FIELD_CONFIG.PLAYER_RADIUS}
                  fill={el.style?.fill || '#e94560'}
                  stroke={isSelected ? '#ffff00' : (el.style?.stroke || '#ffffff')}
                  strokeWidth={isSelected ? 3 : 2}
                />
              );
            }
            return null;
          })}

          {/* Player labels */}
          {elements.map(el => {
            if (el.type === 'player' && el.label) {
              return (
                <Text
                  key={el.id + '_label'}
                  x={el.x - 12}
                  y={el.y - 7}
                  text={el.label}
                  fontSize={FIELD_CONFIG.PLAYER_FONT_SIZE}
                  fill="#ffffff"
                  width={24}
                  align="center"
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
