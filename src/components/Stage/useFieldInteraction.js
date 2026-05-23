import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import useDataStore, { genId } from '../../store/useDataStore';
import useUIStore from '../../store/useUIStore';
import { useAnimationLoop } from './useAnimationLoop';
import { FIELD_CONFIG } from '../../constants/fieldConfig';
import { TOOL_MODES } from '../../constants/toolModes';
import { masterHitTest, hitTestPathSegments, hitTestPlayer, exceededDragThreshold } from '../../utils/hitTesting';
import { getInterceptPoint } from '../../utils/animationRuntime';
import { snapPoint, constrainToAngle } from '../../utils/snapToGrid';
import { defaultCurveCP } from '../../utils/curveUtils';
import { THEME_COLORS } from '../../constants/themeColors';


// --- Module-level pure helpers (no closure over hook state) ---

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

// Pure helpers — all mutable values passed as explicit args so handlers can be useCallback([])
function resolveRoutePoint(rawPos, fromPoint, shiftHeld, snapEnabled, snapIncrement) {
  if (shiftHeld && fromPoint) return constrainToAngle(fromPoint, rawPos);
  return snapPoint(rawPos, snapIncrement, snapEnabled);
}

function resolvePreviewPos(rawPos, fromPoint, shiftHeld) {
  if (shiftHeld && fromPoint) return constrainToAngle(fromPoint, rawPos);
  return rawPos;
}

function resolveDragDelta(fromPos, toPos, shiftHeld) {
  if (shiftHeld) {
    return constrainToAngle({ x: 0, y: 0 }, {
      x: toPos.x - fromPos.x,
      y: toPos.y - fromPos.y,
    });
  }
  return { x: toPos.x - fromPos.x, y: toPos.y - fromPos.y };
}

export function useFieldInteraction() {
  // Store subscription — values needed for render output and derived display state.
  // Handlers do NOT read these closed-over values; they use getState() for fresh reads.
  const {
    getActivePlay,
    selectedId,
    setSelectedId,
    marqueeIds, clearMarquee,
  } = useDataStore();

  const {
    activeTool,
    drawingPath, finishDrawing, cancelDrawing,
    scrimmageVisible,
    presentMode,
  } = useUIStore();

  const theme  = useUIStore(s => s.theme);
  const colors = THEME_COLORS[theme] || THEME_COLORS['theme-sun-cyan'];

  const elements     = getActivePlay()?.elements || [];
  const positionsRef = useAnimationLoop();

  // Stable DOM refs
  const stageRef     = useRef(null);
  const containerRef = useRef(null);

  // Mirror refs — kept in sync with local state; read inside useCallback([]) handlers
  // to avoid stale closures without triggering re-renders.
  const stageSizeRef        = useRef({ width: 600, height: 800 });
  const shiftHeldRef        = useRef(false);
  const placingHighlightRef = useRef(null);
  const liveMarqueeIdsRef   = useRef([]);

  // Local state — drives rendering only
  const [stageSize, setStageSize]               = useState({ width: 600, height: 800 });
  const [mousePos, setMousePos]                 = useState(null);
  const [shiftHeld, setShiftHeld]               = useState(false);
  const [hoveredId, setHoveredId]               = useState(null);
  const [marqueeRect, setMarqueeRect]           = useState(null);
  const [liveMarqueeIds, setLiveMarqueeIds]     = useState([]);
  const [placingHighlight, setPlacingHighlight] = useState(null);
  const [guidingPlayerId, setGuidingPlayerId]   = useState(null);

  // Interaction refs
  const dragStartRef    = useRef(null);
  const dragStartPos    = useRef(null);
  const isDraggingRef   = useRef(false);
  const dragTargetRef   = useRef(null);
  const marqueeStartRef = useRef(null);
  const groupStartRef   = useRef([]);

  // Football tool toggle — fires the moment the tool button is pressed.
  // If a football exists: toggle its selection (select if not selected, deselect if selected),
  // then switch to SELECT so the coach can drag immediately.
  // If no football exists: stay in ADD_FOOTBALL so the next canvas click places one.
  useEffect(() => {
    if (activeTool !== TOOL_MODES.ADD_FOOTBALL) return;
    const football = elements.find(el => el.type === 'football');
    if (!football) return; // let canvas click handle placement
    const alreadySelected = selectedId === football.id;
    setSelectedId(alreadySelected ? null : football.id);
    useUIStore.getState().setActiveTool(TOOL_MODES.SELECT);
  }, [activeTool]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize observer — updates both state (for render) and ref (for handlers)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function updateSize() {
      const size = { width: container.clientWidth, height: container.clientHeight };
      stageSizeRef.current = size;
      setStageSize(size);
    }
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts
  // finishDrawing/cancelDrawing/clearMarquee are stable Zustand actions.
  // State setters (setLiveMarqueeIds etc.) are stable from useState. Deps: []
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Shift') {
        setShiftHeld(true);
        shiftHeldRef.current = true;
      }
      if (e.key === 'Enter') { e.preventDefault(); finishDrawing(); }
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelDrawing();
        clearMarquee();
        setLiveMarqueeIds([]);
        liveMarqueeIdsRef.current = [];
        setMarqueeRect(null);
        setPlacingHighlight(null);
        placingHighlightRef.current = null;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !useUIStore.getState().drawingPath) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
        const { selectedId: sid, deleteElement } = useDataStore.getState();
        if (sid && sid !== 'scrimmage_line') deleteElement(sid);
      }
    }
    function handleKeyUp(e) {
      if (e.key === 'Shift') {
        setShiftHeld(false);
        shiftHeldRef.current = false;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived display values (from subscription — for render and cursor logic)
  const scaleX      = stageSize.width  / FIELD_CONFIG.STAGE_WIDTH;
  const scaleY      = stageSize.height / FIELD_CONFIG.STAGE_HEIGHT;
  const isBoxSelect = activeTool === TOOL_MODES.BOX_SELECT;

  // Stable pointer-position helper — reads only refs and constants
  const getScaledPos = useCallback(() => {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return null;
    const scX = stageSizeRef.current.width  / FIELD_CONFIG.STAGE_WIDTH;
    const scY = stageSizeRef.current.height / FIELD_CONFIG.STAGE_HEIGHT;
    return { x: pos.x / scX, y: pos.y / scY };
  }, []);

  // --- Pointer down (stable reference — all store state read via getState()) ---
  const handlePointerDown = useCallback(() => {
    if (!stageRef.current) return;

    const {
      activeTool: tool,
      presentMode: pm,
      snapEnabled: snapEn,
      snapIncrement: snapInc,
      scrimmageVisible: scrimVis,
      setDrawingPath: setDP,
      setActivePathId: setAPId,
    } = useUIStore.getState();

    const {
      selectedId: selId,
      getActivePlay: getPlay,
      addElement: addEl,
      setSelectedId: setSelId,
      clearSelection: clearSel,
      clearMarquee: clearMq,
      setEventInterceptPoint,
    } = useDataStore.getState();

    if (pm) return;

    const pos = getScaledPos();
    if (!pos) return;

    const els          = getPlay()?.elements || [];
    const shiftH       = shiftHeldRef.current;
    const isCurveLocal = tool === TOOL_MODES.ADD_LINE_CURVE;
    const isDrawLocal  = tool === TOOL_MODES.ADD_LINE_STRAIGHT || tool === TOOL_MODES.ADD_LINE_CURVE;

    dragStartRef.current  = pos;
    dragStartPos.current  = pos;
    isDraggingRef.current = false;

    // Intercept node hit test — check before masterHitTest so small diamond takes priority.
    // Only active when football is selected and not in a drawing/tool mode.
    if (tool === TOOL_MODES.SELECT && selId) {
      const selFootball = els.find(el => el.id === selId && el.type === 'football');
      if (selFootball) {
        const inFlightEvents = (selFootball.journey?.events || [])
          .filter(evt => evt.type === 'pass' || evt.type === 'toss');
        for (const evt of inFlightEvents) {
          const pt = getInterceptPoint(evt, els);
          if (pt) {
            const dist = Math.sqrt((pos.x - pt.x) ** 2 + (pos.y - pt.y) ** 2);
            if (dist < 16) { // 16px catch radius for the diamond node
              dragTargetRef.current = {
                type: 'interceptNode',
                footballId: selFootball.id,
                eventId: evt.id,
              };
              return;
            }
          }
        }
      }
    }

    const hit = masterHitTest(pos.x, pos.y, els, selId, positionsRef.current);

    if (tool === TOOL_MODES.ADD_PLAYER) {
      const snapped = snapPoint(pos, snapInc, snapEn);
      const newPlayer = {
        id: genId("el"), type: 'player',
        x: snapped.x, y: snapped.y,
        label: 'X',
        style: { shape: 'circle', colorIndex: 0 },
        groupId: null,
        routeId: null,
      };
      addEl(newPlayer);
      setSelId(newPlayer.id);
      useUIStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

    if (tool === TOOL_MODES.ADD_FOOTBALL) {
      // Only reaches here when no football exists yet (useEffect handles the existing-football case)
      const snapped = snapPoint(pos, snapInc, snapEn);
      const newFootball = {
        id: genId("el"), type: 'football',
        x: snapped.x, y: snapped.y,
        attachedToElementId: null,
      };
      addEl(newFootball);
      setSelId(newFootball.id);
      useUIStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

    if (tool === TOOL_MODES.ADD_TEXT) {
      const snapped = snapPoint(pos, snapInc, snapEn);
      const newText = {
        id: genId("el"), type: 'text',
        x: snapped.x, y: snapped.y,
        content: 'Text',
        visibility: { startTime: null, endTime: null, fade: false },
      };
      addEl(newText);
      setSelId(newText.id);
      useUIStore.getState().setActiveTool(TOOL_MODES.SELECT);
      return;
    }

    if (tool === TOOL_MODES.ADD_HIGHLIGHT) {
      const snapped = snapPoint(pos, snapInc, snapEn);
      const phCurrent = placingHighlightRef.current;
      if (!phCurrent) {
        const ph = { x: snapped.x, y: snapped.y };
        setPlacingHighlight(ph);
        placingHighlightRef.current = ph;
      } else {
        const dx = snapped.x - phCurrent.x;
        const dy = snapped.y - phCurrent.y;
        const radius = Math.max(20, Math.sqrt(dx * dx + dy * dy));
        const newHighlight = {
          id: genId("el"), type: 'highlight',
          x: phCurrent.x, y: phCurrent.y,
          radius,
          color: '#ffff00',
          opacity: 0.3,
          visibility: { startTime: null, endTime: null, fade: false },
        };
        addEl(newHighlight);
        setSelId(newHighlight.id);
        setPlacingHighlight(null);
        placingHighlightRef.current = null;
        useUIStore.getState().setActiveTool(TOOL_MODES.SELECT);
      }
      return;
    }

    if (isDrawLocal) {
      // Case 1: Already drawing
      const currentDP = useUIStore.getState().drawingPath;
      if (currentDP) {
        const tail = getPathTailPoint(currentDP) ?? currentDP._branchOrigin ?? currentDP._startPoint;
        const resolved = resolveRoutePoint(pos, tail, shiftH, snapEn, snapInc);
        const controlPoint = isCurveLocal ? defaultCurveCP(tail, resolved) : undefined;
        const newSeg = {
          id: genId("seg"),
          points: [tail, resolved],
          curve: isCurveLocal,
          preSnap: false,
          duration: 0.5,
          ...(controlPoint && { controlPoint }),
        };
        setDP({ ...currentDP, segments: [...currentDP.segments, newSeg] });
        return;
      }

      // Case 2: A path is selected — branch or continue
      if (selId) {
        const selectedEl = els.find(el => el.id === selId);
        if (selectedEl?.type === 'path') {
          const pathHit = hitTestPathSegments(pos.x, pos.y, selectedEl.segments);
          if (pathHit.hit) {
            const branchOrigin = snapPoint(pathHit.point, snapInc, snapEn);
            setAPId(selId);
            setDP({
              id: selId,
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
      const resolved = resolveRoutePoint(pos, null, shiftH, snapEn, snapInc);
      clearSel();
      setAPId(null);
      setDP({
        id: genId("el"),
        type: 'path',
        segments: [],
        _startPoint: resolved,
        style: { thickness: 3, endArrow: true, endT: false, lineStyle: 'solid', colorIndex: 0 },
        playerId: null,
      });
      return;
    }

    if (tool === TOOL_MODES.BOX_SELECT) {
      const currentMarqueeIds = useDataStore.getState().marqueeIds;
      if (currentMarqueeIds.length > 0) {
        const onGroup = els.some(el =>
          currentMarqueeIds.includes(el.id) && (
            el.type === 'player' ? hitTestPlayer(pos.x, pos.y, el) :
            el.type === 'path'   ? hitTestPathSegments(pos.x, pos.y, el.segments).hit : false
          )
        );
        if (onGroup) {
          groupStartRef.current = els
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
      clearMq();
      setLiveMarqueeIds([]);
      liveMarqueeIdsRef.current = [];
      marqueeStartRef.current = pos;
      setMarqueeRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      dragTargetRef.current = null;
      return;
    }

    if (scrimVis) {
      const scrimmage = els.find(el => el.id === 'scrimmage_line');
      if (scrimmage && Math.abs(pos.y - scrimmage.y) < 10) {
        setSelId('scrimmage_line');
        dragTargetRef.current = { type: 'scrimmage', elementId: 'scrimmage_line' };
        return;
      }
    }

    if (hit.type === 'controlPoint') { setSelId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'handle')       { setSelId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'player') {
      setSelId(hit.elementId);
      const player  = els.find(el => el.id === hit.elementId);
      const animPos = positionsRef.current.get(player.id);
      const routeId = player?.routeId || null;
      const linkedPath = routeId ? els.find(el => el.id === routeId) : null;
      dragTargetRef.current = {
        ...hit,
        playerStart: { x: animPos?.x ?? player.x, y: animPos?.y ?? player.y },
        linkedRouteId: routeId,
        linkedRouteStartSegments: linkedPath ? JSON.parse(JSON.stringify(linkedPath.segments)) : null,
      };
      return;
    }
    if (hit.type === 'football')  { setSelId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'text')      { setSelId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'highlight') { setSelId(hit.elementId); dragTargetRef.current = hit; return; }
    if (hit.type === 'path')      { setSelId(hit.elementId); dragTargetRef.current = hit; return; }

    clearSel();
    dragTargetRef.current = null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pointer move (stable reference) ---
  const handlePointerMove = useCallback(() => {
    if (!stageRef.current) return;

    const {
      presentMode: pm,
      drawingPath: dp,
      activeTool: tool,
      scrimmageVisible: scrimVis,
      snapEnabled: snapEn,
      snapIncrement: snapInc,
    } = useUIStore.getState();

    const {
      getActivePlay: getPlay,
      updateElement: updEl,
      updateElements: updEls,
    } = useDataStore.getState();

    if (pm) return;

    const pos  = getScaledPos();
    if (!pos) return;

    const els    = getPlay()?.elements || [];
    const shiftH = shiftHeldRef.current;

    if (dp) {
      const tail = dp._branchOrigin || getPathTailPoint(dp) || dp._startPoint;
      setMousePos(resolvePreviewPos(pos, tail, shiftH));
    } else {
      setMousePos(pos);
    }

    if (!dragStartRef.current && scrimVis) {
      const scrimmage = els.find(el => el.id === 'scrimmage_line');
      setHoveredId(scrimmage && Math.abs(pos.y - scrimmage.y) < 10 ? 'scrimmage_line' : null);
    }

    if (!dragStartRef.current) return;

    if (!isDraggingRef.current) {
      if (exceededDragThreshold(dragStartRef.current.x, dragStartRef.current.y, pos.x, pos.y)) {
        isDraggingRef.current = true;
        const { marqueeIds: mqIds } = useDataStore.getState();
        if (dragTargetRef.current?.type === 'player' && mqIds.length === 0) {
          setGuidingPlayerId(dragTargetRef.current.elementId);
        }
        // Commit animated positions to stored before drag; clear map so renderer uses stored truth
        if (positionsRef.current.size > 0 && dragTargetRef.current) {
          const { type: dType, elementId: dId } = dragTargetRef.current;
          if (dType === 'player') {
            const ap = positionsRef.current.get(dId);
            if (ap) updEl(dId, { x: ap.x, y: ap.y });
          } else if (dType === 'path') {
            const pathEl = els.find(e => e.id === dId);
            if (pathEl?.playerId) {
              const ap = positionsRef.current.get(pathEl.playerId);
              if (ap) updEl(pathEl.playerId, { x: ap.x, y: ap.y });
            }
          }
          positionsRef.current = new Map();
        }
      } else return;
    }

    if (isDraggingRef.current && dragTargetRef.current) {
      const { type, elementId } = dragTargetRef.current;

      if (type === 'groupMove') {
        const delta = resolveDragDelta(dragStartRef.current, pos, shiftH);
        const updates = groupStartRef.current.map(start => {
          if (start.type === 'player' || start.type === 'football' || start.type === 'text' || start.type === 'highlight') {
            const newPos = snapPoint({ x: start.x + delta.x, y: start.y + delta.y }, snapInc, snapEn);
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
        updEls(updates);
        return;
      }

      if (type === 'controlPoint') {
        const el = els.find(e => e.id === elementId);
        if (!el?.segments) return;
        const { segmentIndex } = dragTargetRef.current;
        const seg = el.segments[segmentIndex];
        const p1  = seg.points[0];
        const p2  = seg.points[seg.points.length - 1];
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const newCp = shiftH ? constrainToAngle(mid, pos) : pos;
        updEl(elementId, {
          segments: el.segments.map((s, si) => si !== segmentIndex ? s : { ...s, controlPoint: newCp }),
        });
        return;
      }

      if (type === 'handle') {
        const snapped = snapPoint(pos, snapInc, snapEn);
        const el = els.find(e => e.id === elementId);
        if (!el?.segments) return;
        const { segmentIndex, nodeIndex } = dragTargetRef.current;
        updEl(elementId, {
          segments: el.segments.map((seg, si) =>
            si !== segmentIndex ? seg : { ...seg, points: seg.points.map((p, pi) => pi === nodeIndex ? snapped : p) }
          ),
        });
        return;
      }

      if (type === 'interceptNode') {
        const { footballId, eventId } = dragTargetRef.current;
        const snapped = snapPoint(pos, snapInc, snapEn);
        useDataStore.getState().setEventInterceptPoint(footballId, eventId, snapped);
        return;
      }

      if (type === 'scrimmage') {
        updEl('scrimmage_line', { y: pos.y });
        return;
      }

      if (type === 'player' || type === 'football' || type === 'text' || type === 'highlight') {
        const delta  = resolveDragDelta(dragStartPos.current, pos, shiftH);
        const newPos = snapPoint(
          { x: dragStartPos.current.x + delta.x, y: dragStartPos.current.y + delta.y },
          snapInc, snapEn
        );
        const { linkedRouteId, linkedRouteStartSegments, playerStart } = dragTargetRef.current;
        if (type === 'player' && linkedRouteId && linkedRouteStartSegments && playerStart) {
          const rd = { x: newPos.x - playerStart.x, y: newPos.y - playerStart.y };
          updEls([
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
          updEl(elementId, { x: newPos.x, y: newPos.y });
        }
        return;
      }

      if (type === 'path') {
        const delta = resolveDragDelta(dragStartRef.current, pos, shiftH);
        const el    = els.find(e => e.id === elementId);
        if (!el?.segments) return;
        const translatedSegments = el.segments.map(seg => ({
          ...seg,
          points: seg.points.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
          ...(seg.controlPoint ? { controlPoint: { x: seg.controlPoint.x + delta.x, y: seg.controlPoint.y + delta.y } } : {}),
        }));
        const linkedPlayer = el.playerId ? els.find(e => e.id === el.playerId) : null;
        if (linkedPlayer) {
          updEls([
            { id: elementId, changes: { segments: translatedSegments } },
            { id: linkedPlayer.id, changes: { x: linkedPlayer.x + delta.x, y: linkedPlayer.y + delta.y } },
          ]);
        } else {
          updEl(elementId, { segments: translatedSegments });
        }
        dragStartRef.current = pos;
        return;
      }
    }

    if (tool === TOOL_MODES.BOX_SELECT && marqueeStartRef.current && !dragTargetRef.current) {
      const rect = {
        x: marqueeStartRef.current.x,
        y: marqueeStartRef.current.y,
        width:  pos.x - marqueeStartRef.current.x,
        height: pos.y - marqueeStartRef.current.y,
      };
      setMarqueeRect(rect);
      const newIds = getElementsInRect(rect, els);
      setLiveMarqueeIds(newIds);
      liveMarqueeIdsRef.current = newIds;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pointer up (stable reference) ---
  const handlePointerUp = useCallback(() => {
    const { activeTool: tool } = useUIStore.getState();
    const { pushHistory: ph, setMarqueeIds: setMqIds } = useDataStore.getState();

    if (isDraggingRef.current && dragTargetRef.current) ph();

    if (tool === TOOL_MODES.BOX_SELECT && marqueeStartRef.current && !dragTargetRef.current) {
      setMqIds(isDraggingRef.current ? liveMarqueeIdsRef.current : []);
    }

    setMarqueeRect(null);
    setGuidingPlayerId(null);
    marqueeStartRef.current = null;
    dragStartRef.current    = null;
    dragStartPos.current    = null;
    isDraggingRef.current   = false;
    dragTargetRef.current   = null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized handlers object — reference-stable; Konva re-binds only on initial mount
  const handlers = useMemo(() => ({
    onMouseDown:   () => handlePointerDown(),
    onMouseMove:   () => handlePointerMove(),
    onMouseUp:     () => handlePointerUp(),
    onContextMenu: (e) => {
      e.evt.preventDefault();
      const { activeTool: at, drawingPath: dp } = useUIStore.getState();
      if ((at === TOOL_MODES.ADD_LINE_STRAIGHT || at === TOOL_MODES.ADD_LINE_CURVE) && dp) {
        useUIStore.getState().finishDrawing();
      }
    },
    onTouchStart: (e) => { e.evt.preventDefault(); handlePointerDown(); },
    onTouchMove:  (e) => { e.evt.preventDefault(); handlePointerMove(); },
    onTouchEnd:   (e) => { e.evt.preventDefault(); handlePointerUp(); },
  }), [handlePointerDown, handlePointerMove, handlePointerUp]);

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
    handlers,
  };
}
