import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, RegularPolygon, Ellipse } from 'react-konva';
import './FieldCanvas.css';
import useEditorStore from '../../store/useEditorStore';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { TOOL_MODES } from '../../constants/toolModes';
import { masterHitTest, hitTestPathSegments, hitTestPlayer, hitTestFootball, hitTestText, hitTestHighlight, exceededDragThreshold, FOOTBALL_RX, FOOTBALL_RY, TEXT_FONT_SIZE } from '../../utils/hitTesting';
import { snapPoint, constrainToAngle } from '../../utils/snapToGrid';
import { defaultCurveCP, bezierCtrl } from '../../utils/curveUtils';
import FieldGrid from './FieldGrid';
import { THEME_COLORS } from '../../constants/themeColors';

const FOOTBALL_ATTACH_OFFSET = FIELD_CONFIG.PLAYER_RADIUS;

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

// Returns IDs of elements where ALL points are inside the rect (all-or-nothing rule)
function getElementsInRect(rect, elements) {
  const minX = Math.min(rect.x, rect.x + rect.width);
  const maxX = Math.max(rect.x, rect.x + rect.width);
  const minY = Math.min(rect.y, rect.y + rect.height);
  const maxY = Math.max(rect.y, rect.y + rect.height);
  const inRect = p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  return elements
    .filter(el => el.type !== 'scrimmage')
    .filter(el => {
      if (el.type === 'player')    return inRect({ x: el.x, y: el.y });
      if (el.type === 'football')  return inRect({ x: el.x, y: el.y });
      if (el.type === 'text')      return inRect({ x: el.x, y: el.y });
      if (el.type === 'highlight') return inRect({ x: el.x, y: el.y });
      if (el.type === 'path')     return el.segments?.length > 0 && el.segments.every(seg => seg.points.every(p => inRect(p)));
      return false;
    })
    .map(el => el.id);
}

export default function FieldCanvas() {
  const {
    getActivePlay,
    addElement, updateElement, updateElements,
    selectedId,
    setSelectedId, clearSelection,
    activeTool,
    snapEnabled, snapIncrement,
    pushHistory,
    drawingPath, setDrawingPath, finishDrawing, cancelDrawing,
    setActivePathId,
    scrimmageVisible,
    presentMode,
    marqueeIds, setMarqueeIds, clearMarquee,
  } = useEditorStore();

  const theme = useEditorStore(s => s.theme);
  const colors = THEME_COLORS[theme] || THEME_COLORS['theme-sun-cyan'];

  const elements = getActivePlay()?.elements || [];

  const stageRef     = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize]       = useState({ width: 600, height: 800 });
  const [mousePos, setMousePos]         = useState(null);
  const [shiftHeld, setShiftHeld]       = useState(false);
  const [hoveredId, setHoveredId]       = useState(null);
  const [marqueeRect, setMarqueeRect]       = useState(null);
  const [liveMarqueeIds, setLiveMarqueeIds] = useState([]);
  const [placingHighlight, setPlacingHighlight] = useState(null);
  const [guidingPlayerId, setGuidingPlayerId]   = useState(null);
  const dragStartRef    = useRef(null);
  const dragStartPos    = useRef(null);
  const isDraggingRef   = useRef(false);
  const dragTargetRef   = useRef(null);
  const marqueeStartRef = useRef(null);
  const groupStartRef   = useRef([]);

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
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelDrawing();
        clearMarquee();
        setLiveMarqueeIds([]);
        setMarqueeRect(null);
        setPlacingHighlight(null);
      }
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
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return null;
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
    if (!stageRef.current) return;
    if (presentMode) return;

    const pos = getScaledPos();
    if (!pos) return;
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
        style: { shape: 'circle', colorIndex: 0 },
        groupId: null,
      };
      addElement(newPlayer);
      setSelectedId(newPlayer.id);
      useEditorStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

    // ADD FOOTBALL — max one per play
    if (activeTool === TOOL_MODES.ADD_FOOTBALL) {
      const hasFootball = elements.some(el => el.type === 'football');
      if (!hasFootball) {
        const snapped = snapPoint(pos, snapIncrement, snapEnabled);
        const newFootball = {
          id: generateId(), type: 'football',
          x: snapped.x, y: snapped.y,
          attachedToElementId: null,
        };
        addElement(newFootball);
        setSelectedId(newFootball.id);
      }
      useEditorStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

    // ADD TEXT — places element, selects it; inspector textarea handles content entry
    if (activeTool === TOOL_MODES.ADD_TEXT) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      const newText = {
        id: generateId(), type: 'text',
        x: snapped.x, y: snapped.y,
        content: 'Text',
        visibility: { startTime: null, endTime: null, fade: false },
      };
      addElement(newText);
      setSelectedId(newText.id);
      useEditorStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

    // ADD HIGHLIGHT — two-click: click 1 sets center, click 2 confirms radius
    if (activeTool === TOOL_MODES.ADD_HIGHLIGHT) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      if (!placingHighlight) {
        setPlacingHighlight({ x: snapped.x, y: snapped.y });
      } else {
        const dx = snapped.x - placingHighlight.x;
        const dy = snapped.y - placingHighlight.y;
        const radius = Math.max(20, Math.sqrt(dx * dx + dy * dy));
        const newHighlight = {
          id: generateId(), type: 'highlight',
          x: placingHighlight.x, y: placingHighlight.y,
          radius,
          color: '#ffff00',
          opacity: 0.3,
          visibility: { startTime: null, endTime: null, fade: false },
        };
        addElement(newHighlight);
        setSelectedId(newHighlight.id);
        setPlacingHighlight(null);
        useEditorStore.getState().setActiveTool(TOOL_MODES.SELECT);
      }
      return;
    }

    // DRAWING TOOL — straight or curve
    if (isDrawingTool) {
      // Case 1: Already drawing — add next segment
      // Read directly from store to avoid stale closure on drawingPath
      const currentDrawingPath = useEditorStore.getState().drawingPath;
      if (currentDrawingPath) {
        const tail = getPathTailPoint(currentDrawingPath) ?? currentDrawingPath._branchOrigin ?? currentDrawingPath._startPoint;
        const resolved = resolveRoutePoint(pos, tail);
        const controlPoint = isCurve ? defaultCurveCP(tail, resolved) : undefined;
        const newSeg = {
          id: generateSegId(),
          points: [tail, resolved],
          curve: isCurve,
          preSnap: false,
          duration: 0.5,
          ...(controlPoint && { controlPoint }),
        };
        setDrawingPath({
          ...currentDrawingPath,
          segments: [...currentDrawingPath.segments, newSeg],
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
            setActivePathId(selectedId);
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
      setActivePathId(null);
      setDrawingPath({
        id: generateId(),
        type: 'path',
        segments: [],
        _startPoint: resolved,
        style: { thickness: 3, endArrow: true, endT: false, lineStyle: 'solid', colorIndex: 0 },
      });
      return;
    }

    // BOX SELECT tool
    if (activeTool === TOOL_MODES.BOX_SELECT) {
      const currentMarqueeIds = useEditorStore.getState().marqueeIds;
      if (currentMarqueeIds.length > 0) {
        const onGroup = elements.some(el =>
          currentMarqueeIds.includes(el.id) && (
            el.type === 'player' ? hitTestPlayer(pos.x, pos.y, el) :
            el.type === 'path'   ? hitTestPathSegments(pos.x, pos.y, el.segments).hit : false
          )
        );
        if (onGroup) {
          // Record starting state of all group elements for the move
          groupStartRef.current = elements
            .filter(el => currentMarqueeIds.includes(el.id))
            .map(el => ({
              id: el.id, type: el.type,
              ...(el.type === 'player'    ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'football'  ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'text'      ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'highlight' ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'path'     ? { segments: JSON.parse(JSON.stringify(el.segments)) } : {}),
            }));
          dragTargetRef.current = { type: 'groupMove' };
          return;
        }
      }
      // Start a new marquee rect
      clearMarquee();
      setLiveMarqueeIds([]);
      marqueeStartRef.current = pos;
      setMarqueeRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      dragTargetRef.current = null;
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
    if (hit.type === 'controlPoint') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'handle') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'player') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'football') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'text') {
      setSelectedId(hit.elementId);
      dragTargetRef.current = hit;
      return;
    }
    if (hit.type === 'highlight') {
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
    if (!stageRef.current) return;
    if (presentMode) return;

    const pos = getScaledPos();
    if (!pos) return;

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
        if (dragTargetRef.current?.type === 'player' && marqueeIds.length === 0) {
          setGuidingPlayerId(dragTargetRef.current.elementId);
        }
      } else return;
    }

    if (isDraggingRef.current && dragTargetRef.current) {
      const { type, elementId } = dragTargetRef.current;

      if (type === 'groupMove') {
        const delta = resolveDragDelta(dragStartRef.current, pos);
        const updates = groupStartRef.current.map(start => {
          if (start.type === 'player' || start.type === 'football' || start.type === 'text' || start.type === 'highlight') {
            const newPos = snapPoint(
              { x: start.x + delta.x, y: start.y + delta.y },
              snapIncrement, snapEnabled
            );
            return { id: start.id, changes: { x: newPos.x, y: newPos.y } };
          }
          if (start.type === 'path') {
            return {
              id: start.id,
              changes: {
                segments: start.segments.map(seg => ({
                  ...seg,
                  points: seg.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
                  ...(seg.controlPoint ? { controlPoint: { x: seg.controlPoint.x + delta.x, y: seg.controlPoint.y + delta.y } } : {}),
                })),
              },
            };
          }
          return null;
        }).filter(Boolean);
        updateElements(updates);
        return;
      }

      if (type === 'controlPoint') {
        const el = elements.find(e => e.id === elementId);
        if (!el?.segments) return;
        const { segmentIndex } = dragTargetRef.current;
        const seg = el.segments[segmentIndex];
        const p1 = seg.points[0];
        const p2 = seg.points[seg.points.length - 1];
        const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const newCp = shiftHeld ? constrainToAngle(midpoint, pos) : pos;
        const newSegments = el.segments.map((s, si) =>
          si !== segmentIndex ? s : { ...s, controlPoint: newCp }
        );
        updateElement(elementId, { segments: newSegments });
        return;
      }

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

      if (type === 'player' || type === 'football' || type === 'text' || type === 'highlight') {
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

    // Marquee rect drawing (BOX_SELECT, no dragTarget)
    if (activeTool === TOOL_MODES.BOX_SELECT && marqueeStartRef.current && !dragTargetRef.current) {
      const rect = {
        x: marqueeStartRef.current.x,
        y: marqueeStartRef.current.y,
        width:  pos.x - marqueeStartRef.current.x,
        height: pos.y - marqueeStartRef.current.y,
      };
      setMarqueeRect(rect);
      setLiveMarqueeIds(getElementsInRect(rect, elements));
    }
  }

  // --- Pointer up ---
  function handlePointerUp() {
    if (isDraggingRef.current && dragTargetRef.current) pushHistory();

    // Finalize marquee selection on release
    if (activeTool === TOOL_MODES.BOX_SELECT && marqueeStartRef.current && !dragTargetRef.current) {
      setMarqueeIds(isDraggingRef.current ? liveMarqueeIds : []);
    }

    setMarqueeRect(null);
    setGuidingPlayerId(null);
    marqueeStartRef.current = null;
    dragStartRef.current    = null;
    dragStartPos.current    = null;
    isDraggingRef.current   = false;
    dragTargetRef.current   = null;
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
      return (
        <Line key={key} points={zz} stroke={stroke} strokeWidth={sw}
          lineCap="round" lineJoin="round" />
      );
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
        stroke={stroke} strokeWidth={sw}
        lineCap="round" lineJoin="round" dash={dashProp}
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

    // Collect all rendered segments as an array of Konva elements
    const rendered = [];

    el.segments.forEach((seg, i) => {
      rendered.push(renderSegment(seg, color, thick, isSelected, `${el.id}_seg_${i}`, lineStyle));
    });

    // Arrow on the last segment end point
    const lastSeg = el.segments[el.segments.length - 1];
    if (el.style?.endArrow && lastSeg?.points?.length >= 2) {
      const pts = lastSeg.points;
      const p2 = pts[pts.length - 1];
      // For curved segments use control point to get correct arrow direction
      // For straight segments use previous point
      let arrowPoints;
      if (lastSeg.curve) {
        const p0 = pts[0];
        const cp = lastSeg.controlPoint || defaultCurveCP(p0, p2);
        const ctrl = bezierCtrl(cp, p0, p2);
        // Analytical tangent at t=1 for quadratic bezier: direction = p2 - ctrl
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
      // Derive angle from tail to tip
      const tailX = arrowPoints[0];
      const tailY = arrowPoints[1];
      const angle = Math.atan2(p2.y - tailY, p2.x - tailX) * (180 / Math.PI);
      rendered.push(
        <RegularPolygon key={`${el.id}_arrow`}
          x={p2.x} y={p2.y}
          sides={3}
          radius={10}
          fill={isSelected ? '#ffff00' : color}
          stroke={isSelected ? '#ffff00' : color}
          strokeWidth={1}
          rotation={angle + 90}
        />
      );
    }

    // T-end on the last segment endpoint
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
          strokeWidth={thick}
          lineCap="round"
        />
      );
    }

    return rendered;
  }

  function renderFootball(el) {
    const isSelected = !presentMode && el.id === selectedId;
    const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));

    let visualX = el.x;
    let visualY = el.y;

    if (el.attachedToElementId) {
      const player = elements.find(e => e.id === el.attachedToElementId && e.type === 'player');
      if (player) {
        // Default carry side: right. Phase 3 will derive side from motion direction.
        visualX = player.x + FOOTBALL_ATTACH_OFFSET;
        visualY = player.y;
      }
    }

    return (
      <Ellipse
        key={el.id}
        x={visualX}
        y={visualY}
        radiusX={FOOTBALL_RX}
        radiusY={FOOTBALL_RY}
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
        x={placingHighlight.x}
        y={placingHighlight.y}
        radius={radius}
        fill="#ffff00"
        opacity={0.2}
        stroke={colors.accent}
        strokeWidth={1}
        dash={[8, 6]}
      />
    );
  }

  function renderNodeHandles(el) {
    if (!el?.segments) return null;
    const seen = new Set();
    const handles = [];

    el.segments.forEach((seg, si) => {
      // Control point handle for curve segments
      if (seg.curve && seg.controlPoint) {
        const p1 = seg.points[0];
        const p2 = seg.points[seg.points.length - 1];
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const cp = seg.controlPoint;
        handles.push(
          <Line key={`${el.id}_cp_arm_${si}`}
            points={[mid.x, mid.y, cp.x, cp.y]}
            stroke={colors.accent} strokeWidth={1}
            dash={[4, 4]} opacity={0.6}
          />,
          <Circle key={`${el.id}_cp_${si}`}
            x={cp.x} y={cp.y} radius={5}
            fill={colors.accent} stroke={colors.field} strokeWidth={2}
          />
        );
      }

      // Endpoint node handles
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

    const tail = drawingPath._branchOrigin ||
      getPathTailPoint(drawingPath) ||
      drawingPath._startPoint;

    if (!tail) return null;

    const color = colors.text;
    const thick = 3;

    // Already-committed segments in this drawing session
    const committed = drawingPath.segments.map((seg, i) =>
      renderSegment(seg, color, thick, false, `preview_seg_${i}`)
    );

    // Ghost line from tail to mouse
    const ghost = (
      <Line
        points={[tail.x, tail.y, mousePos.x, mousePos.y]}
        stroke={shiftHeld ? '#00ffaa' : colors.accent}
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
            x={p.x} y={p.y} radius={5} fill={colors.accent}
          />
        );
      });
    });
    if (drawingPath._startPoint || drawingPath._branchOrigin) {
      const origin = drawingPath._branchOrigin || drawingPath._startPoint;
      nodes.push(
        <Circle key="preview_origin" x={origin.x} y={origin.y} radius={5} fill={colors.accent} />
      );
    }

    return <>{committed}{ghost}{nodes}</>;
  }

  // In BOX_SELECT mode: all path nodes visible (muted), live-captured ones fully lit
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

  const selectedEl = elements.find(el => el.id === selectedId);
  const isBoxSelect = activeTool === TOOL_MODES.BOX_SELECT;
  const cursorStyle = presentMode
    ? 'default'
    : hoveredId === 'scrimmage_line' ? 'ns-resize'
    : isBoxSelect && marqueeIds.length > 0 ? 'move'
    : 'crosshair';

  return (
    <div className="field-canvas-container" ref={containerRef} style={{ cursor: cursorStyle }}>
      <Stage
        key={theme}
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
          {/* Alignment guides — bounding box tangent to dragged player's circle edges */}
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
          {/* Highlights — first so they render under everything else in this layer */}
          {elements.filter(el => el.type === 'highlight').map(el => {
            const isSelected = !presentMode && el.id === selectedId;
            const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
            return (
              <Circle
                key={el.id}
                x={el.x}
                y={el.y}
                radius={el.radius}
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
          {/* Football — rendered in Layer 1 so Layer 2 players draw over it (correct z-order for attached ball) */}
          {elements.filter(el => el.type === 'football').map(el => renderFootball(el))}
          {/* Marquee selection rect — topmost in this layer */}
          {marqueeRect && (
            <Rect
              x={Math.min(marqueeRect.x, marqueeRect.x + marqueeRect.width)}
              y={Math.min(marqueeRect.y, marqueeRect.y + marqueeRect.height)}
              width={Math.abs(marqueeRect.width)}
              height={Math.abs(marqueeRect.height)}
              stroke={colors.accent}
              strokeWidth={1}
              dash={[6, 4]}
              fill={colors.accent}
              opacity={0.08}
            />
          )}
        </Layer>

        <Layer>
          {elements.filter(el => el.type === 'player').map(el => {
            const isSelected  = !presentMode && el.id === selectedId;
            const inMarquee   = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
            const shape  = el.style?.shape  || 'circle';
            const ci = el.style?.colorIndex ?? -1;
            const fill   = ci >= 0 ? colors.palette[ci] : colors.accent;
            const labelColor = ci >= 0 ? colors.labels[ci] : colors.text;
            const stroke = isSelected ? '#ffff00' : inMarquee ? colors.accent : labelColor;
            const sw     = isSelected || inMarquee ? 3 : 2;
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
          {elements.filter(el => el.type === 'player' && el.label).map(el => {
            const isSelected = !presentMode && el.id === selectedId;
            return (
              <Text key={el.id + '_label'}
                x={el.x - 12} y={el.y - 7}
                text={el.label}
                fontSize={FIELD_CONFIG.PLAYER_FONT_SIZE}
                fill={isSelected ? '#ffff00' : (el.style?.colorIndex >= 0 ? colors.labels[el.style.colorIndex] : colors.text)} width={24} align="center"
              />
            );
          })}
          {/* Text annotations — rendered after players so they appear on top */}
          {elements.filter(el => el.type === 'text' && el.content).map(el => {
            const isSelected = !presentMode && el.id === selectedId;
            const inMarquee  = !presentMode && (liveMarqueeIds.includes(el.id) || marqueeIds.includes(el.id));
            return (
              <Text key={el.id}
                x={el.x}
                y={el.y}
                text={el.content || ''}
                fontSize={TEXT_FONT_SIZE}
                fontFamily="sans-serif"
                fill={isSelected ? '#ffff00' : inMarquee ? colors.accent : colors.text}
              />
            );
          })}
        </Layer>
      </Stage>

    </div>
  );
}
