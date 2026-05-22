import { useRef, useEffect, useState } from 'react';
import useEditorStore from '../../store/useEditorStore';
import { useAnimationLoop } from './useAnimationLoop';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { TOOL_MODES } from '../../constants/toolModes';
import { masterHitTest, hitTestPathSegments, hitTestPlayer, exceededDragThreshold } from '../../utils/hitTesting';
import { snapPoint, constrainToAngle } from '../../utils/snapToGrid';
import { defaultCurveCP } from '../../utils/curveUtils';
import { THEME_COLORS } from '../../constants/themeColors';

function generateId() {
  return 'el_' + Math.random().toString(36).slice(2, 9);
}

function generateSegId() {
  return 'seg_' + Math.random().toString(36).slice(2, 9);
}

function getPathTailPoint(path) {
  if (!path?.segments?.length) return null;
  const lastSeg = path.segments[path.segments.length - 1];
  if (!lastSeg?.points?.length) return null;
  return lastSeg.points[lastSeg.points.length - 1];
}

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
      if (el.type === 'path')      return el.segments?.length > 0 && el.segments.every(seg => seg.points.every(p => inRect(p)));
      return false;
    })
    .map(el => el.id);
}

export function useFieldInteraction() {
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

  const theme  = useEditorStore(s => s.theme);
  const colors = THEME_COLORS[theme] || THEME_COLORS['theme-sun-cyan'];

  const elements     = getActivePlay()?.elements || [];
  const positionsRef = useAnimationLoop();

  const stageRef     = useRef(null);
  const containerRef = useRef(null);
  const [stageSize, setStageSize]               = useState({ width: 600, height: 800 });
  const [mousePos, setMousePos]                 = useState(null);
  const [shiftHeld, setShiftHeld]               = useState(false);
  const [hoveredId, setHoveredId]               = useState(null);
  const [marqueeRect, setMarqueeRect]           = useState(null);
  const [liveMarqueeIds, setLiveMarqueeIds]     = useState([]);
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
      if (e.key === 'Enter') { e.preventDefault(); finishDrawing(); }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelDrawing();
        clearMarquee();
        setLiveMarqueeIds([]);
        setMarqueeRect(null);
        setPlacingHighlight(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !drawingPath) {
        const { selectedId: sid, deleteElement } = useEditorStore.getState();
        if (sid && sid !== 'scrimmage_line') deleteElement(sid);
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
    if (shiftHeld && fromPoint) return constrainToAngle(fromPoint, rawPos);
    return snapPoint(rawPos, snapIncrement, snapEnabled);
  }

  function resolvePreviewPos(rawPos, fromPoint) {
    if (shiftHeld && fromPoint) return constrainToAngle(fromPoint, rawPos);
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
  const isCurve     = activeTool === TOOL_MODES.ADD_LINE_CURVE;
  const isBoxSelect = activeTool === TOOL_MODES.BOX_SELECT;

  // --- Pointer down ---
  function handlePointerDown() {
    if (!stageRef.current) return;
    if (presentMode) return;

    const pos = getScaledPos();
    if (!pos) return;
    dragStartRef.current  = pos;
    dragStartPos.current  = pos;
    isDraggingRef.current = false;

    const hit = masterHitTest(pos.x, pos.y, elements, selectedId, positionsRef.current);

    if (activeTool === TOOL_MODES.ADD_PLAYER) {
      const snapped = snapPoint(pos, snapIncrement, snapEnabled);
      const newPlayer = {
        id: generateId(), type: 'player',
        x: snapped.x, y: snapped.y,
        label: 'X',
        style: { shape: 'circle', colorIndex: 0 },
        groupId: null,
        routeId: null,
      };
      addElement(newPlayer);
      setSelectedId(newPlayer.id);
      useEditorStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

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

    if (isDrawingTool) {
      // Case 1: Already drawing — read directly from store to avoid stale closure
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
        setDrawingPath({ ...currentDrawingPath, segments: [...currentDrawingPath.segments, newSeg] });
        return;
      }

      // Case 2: A path is selected — branch or continue
      if (selectedId) {
        const selectedEl = elements.find(el => el.id === selectedId);
        if (selectedEl?.type === 'path') {
          const pathHit = hitTestPathSegments(pos.x, pos.y, selectedEl.segments);
          if (pathHit.hit) {
            const branchOrigin = snapPoint(pathHit.point, snapIncrement, snapEnabled);
            setActivePathId(selectedId);
            setDrawingPath({
              id: selectedId,
              type: 'path',
              segments: [],
              _branchOrigin: branchOrigin,
              style: selectedEl.style,
            });
            setMousePos(branchOrigin);
            return;
          }
        }
      }

      // Case 3: Start new route
      const resolved = resolveRoutePoint(pos, null);
      clearSelection();
      setActivePathId(null);
      setDrawingPath({
        id: generateId(),
        type: 'path',
        segments: [],
        _startPoint: resolved,
        style: { thickness: 3, endArrow: true, endT: false, lineStyle: 'solid', colorIndex: 0 },
        playerId: null,
      });
      return;
    }

    if (activeTool === TOOL_MODES.BOX_SELECT) {
      // Read directly from store to avoid stale closure on marqueeIds
      const currentMarqueeIds = useEditorStore.getState().marqueeIds;
      if (currentMarqueeIds.length > 0) {
        const onGroup = elements.some(el =>
          currentMarqueeIds.includes(el.id) && (
            el.type === 'player' ? hitTestPlayer(pos.x, pos.y, el) :
            el.type === 'path'   ? hitTestPathSegments(pos.x, pos.y, el.segments).hit : false
          )
        );
        if (onGroup) {
          groupStartRef.current = elements
            .filter(el => currentMarqueeIds.includes(el.id))
            .map(el => ({
              id: el.id, type: el.type,
              ...(el.type === 'player'    ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'football'  ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'text'      ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'highlight' ? { x: el.x, y: el.y } : {}),
              ...(el.type === 'path'      ? { segments: JSON.parse(JSON.stringify(el.segments)) } : {}),
            }));
          dragTargetRef.current = { type: 'groupMove' };
          return;
        }
      }
      clearMarquee();
      setLiveMarqueeIds([]);
      marqueeStartRef.current = pos;
      setMarqueeRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      dragTargetRef.current = null;
      return;
    }

    if (scrimmageVisible) {
      const scrimmage = elements.find(el => el.id === 'scrimmage_line');
      if (scrimmage && Math.abs(pos.y - scrimmage.y) < 10) {
        setSelectedId('scrimmage_line');
        dragTargetRef.current = { type: 'scrimmage', elementId: 'scrimmage_line' };
        return;
      }
    }

    if (hit.type === 'controlPoint') { setSelectedId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'handle')       { setSelectedId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'player') {
      setSelectedId(hit.elementId);
      const player = elements.find(el => el.id === hit.elementId);
      const animPos = positionsRef.current.get(player.id);
      const routeId = player?.routeId || null;
      const linkedPath = routeId ? elements.find(el => el.id === routeId) : null;
      dragTargetRef.current = {
        ...hit,
        playerStart: { x: animPos?.x ?? player.x, y: animPos?.y ?? player.y },
        linkedRouteId: routeId,
        linkedRouteStartSegments: linkedPath ? JSON.parse(JSON.stringify(linkedPath.segments)) : null,
      };
      return;
    }
    if (hit.type === 'football')     { setSelectedId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'text')         { setSelectedId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'highlight')    { setSelectedId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'path')         { setSelectedId(hit.elementId); dragTargetRef.current = hit; return; }

    clearSelection();
    dragTargetRef.current = null;
  }

  // --- Pointer move ---
  function handlePointerMove() {
    if (!stageRef.current) return;
    if (presentMode) return;

    const pos = getScaledPos();
    if (!pos) return;

    if (drawingPath) {
      const tail = drawingPath._branchOrigin || getPathTailPoint(drawingPath) || drawingPath._startPoint;
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
        // Commit any animated positions to stored before drag takes over,
        // then clear the Map so FieldRenderer uses stored positions going forward.
        if (positionsRef.current.size > 0 && dragTargetRef.current) {
          const { type: dType, elementId: dId } = dragTargetRef.current;
          if (dType === 'player') {
            const ap = positionsRef.current.get(dId);
            if (ap) updateElement(dId, { x: ap.x, y: ap.y });
          } else if (dType === 'path') {
            const pathEl = elements.find(e => e.id === dId);
            if (pathEl?.playerId) {
              const ap = positionsRef.current.get(pathEl.playerId);
              if (ap) updateElement(pathEl.playerId, { x: ap.x, y: ap.y });
            }
          }
          positionsRef.current = new Map();
        }
      } else return;
    }

    if (isDraggingRef.current && dragTargetRef.current) {
      const { type, elementId } = dragTargetRef.current;

      if (type === 'groupMove') {
        const delta = resolveDragDelta(dragStartRef.current, pos);
        const updates = groupStartRef.current.map(start => {
          if (start.type === 'player' || start.type === 'football' || start.type === 'text' || start.type === 'highlight') {
            const newPos = snapPoint({ x: start.x + delta.x, y: start.y + delta.y }, snapIncrement, snapEnabled);
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
        updateElement(elementId, { segments: el.segments.map((s, si) => si !== segmentIndex ? s : { ...s, controlPoint: newCp }) });
        return;
      }

      if (type === 'handle') {
        const snapped = snapPoint(pos, snapIncrement, snapEnabled);
        const el = elements.find(e => e.id === elementId);
        if (!el?.segments) return;
        const { segmentIndex, nodeIndex } = dragTargetRef.current;
        updateElement(elementId, {
          segments: el.segments.map((seg, si) =>
            si !== segmentIndex ? seg : { ...seg, points: seg.points.map((p, pi) => pi === nodeIndex ? snapped : p) }
          ),
        });
        return;
      }

      if (type === 'scrimmage') {
        updateElement('scrimmage_line', { y: pos.y });
        return;
      }

      if (type === 'player' || type === 'football' || type === 'text' || type === 'highlight') {
        const delta = resolveDragDelta(dragStartPos.current, pos);
        const newPos = snapPoint({ x: dragStartPos.current.x + delta.x, y: dragStartPos.current.y + delta.y }, snapIncrement, snapEnabled);
        const { linkedRouteId, linkedRouteStartSegments, playerStart } = dragTargetRef.current;
        if (type === 'player' && linkedRouteId && linkedRouteStartSegments && playerStart) {
          const rd = { x: newPos.x - playerStart.x, y: newPos.y - playerStart.y };
          updateElements([
            { id: elementId, changes: { x: newPos.x, y: newPos.y } },
            {
              id: linkedRouteId,
              changes: {
                segments: linkedRouteStartSegments.map(seg => ({
                  ...seg,
                  points: seg.points.map(p => ({ x: p.x + rd.x, y: p.y + rd.y })),
                  ...(seg.controlPoint ? { controlPoint: { x: seg.controlPoint.x + rd.x, y: seg.controlPoint.y + rd.y } } : {}),
                })),
              },
            },
          ]);
        } else {
          updateElement(elementId, { x: newPos.x, y: newPos.y });
        }
        return;
      }

      if (type === 'path') {
        const delta = resolveDragDelta(dragStartRef.current, pos);
        const el = elements.find(e => e.id === elementId);
        if (!el?.segments) return;
        const translatedSegments = el.segments.map(seg => ({
          ...seg,
          points: seg.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
          ...(seg.controlPoint ? { controlPoint: { x: seg.controlPoint.x + delta.x, y: seg.controlPoint.y + delta.y } } : {}),
        }));
        const linkedPlayer = el.playerId ? elements.find(e => e.id === el.playerId) : null;
        if (linkedPlayer) {
          updateElements([
            { id: elementId, changes: { segments: translatedSegments } },
            { id: linkedPlayer.id, changes: { x: linkedPlayer.x + delta.x, y: linkedPlayer.y + delta.y } },
          ]);
        } else {
          updateElement(elementId, { segments: translatedSegments });
        }
        dragStartRef.current = pos;
        return;
      }
    }

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

  const cursorStyle = presentMode
    ? 'default'
    : hoveredId === 'scrimmage_line' ? 'ns-resize'
    : isBoxSelect && marqueeIds.length > 0 ? 'move'
    : 'crosshair';

  return {
    stageRef,
    containerRef,
    stageSize,
    scaleX,
    scaleY,
    theme,
    cursorStyle,
    isBoxSelect,
    mousePos,
    shiftHeld,
    hoveredId,
    guidingPlayerId,
    placingHighlight,
    marqueeRect,
    liveMarqueeIds,
    elements,
    positions: positionsRef.current,
    colors,
    selectedId,
    marqueeIds,
    drawingPath,
    presentMode,
    scrimmageVisible,
    handlers: {
      onMouseDown:    () => handlePointerDown(),
      onMouseMove:    () => handlePointerMove(),
      onMouseUp:      () => handlePointerUp(),
      onContextMenu:  (e) => { e.evt.preventDefault(); if (isDrawingTool && drawingPath) finishDrawing(); },
      onTouchStart:   (e) => { e.evt.preventDefault(); handlePointerDown(); },
      onTouchMove:    (e) => { e.evt.preventDefault(); handlePointerMove(); },
      onTouchEnd:     (e) => { e.evt.preventDefault(); handlePointerUp(); },
    },
  };
}
