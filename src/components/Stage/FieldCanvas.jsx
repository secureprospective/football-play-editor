import { Stage } from 'react-konva';
import './FieldCanvas.css';
import { useFieldInteraction } from './useFieldInteraction';
import FieldRenderer from './FieldRenderer';
import FieldGrid from './FieldGrid';
import useAnimationStore from '../../store/useAnimationStore';
import useUIStore from '../../store/useUIStore';

export default function FieldCanvas() {
  const {
    stageRef, containerRef,
    stageSize, scaleX, scaleY, theme,
    cursorStyle, isBoxSelect,
    mousePos, shiftHeld, hoveredId, guidingPlayerId, placingHighlight,
    marqueeRect, liveMarqueeIds,
    elements, positions, colors, selectedId, marqueeIds,
    drawingPath, presentMode, scrimmageVisible,
    handlers,
  } = useFieldInteraction();

  const currentTime = useAnimationStore(s => s.currentTime);
  const arcDrawingForEventId = useUIStore(s => s.arcDrawingForEventId);

  return (
    <div className="field-canvas-container" ref={containerRef} style={{ cursor: cursorStyle }}>
      {arcDrawingForEventId && (
        <div className="arc-drawing-banner">
          Drawing arc — press <kbd>Enter</kbd> when done, <kbd>Esc</kbd> to cancel
        </div>
      )}
      <Stage
        key={theme}
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scaleX}
        scaleY={scaleY}
        pixelRatio={1}
        {...handlers}
      >
        <FieldGrid />
        <FieldRenderer
          elements={elements}
          colors={colors}
          selectedId={selectedId}
          marqueeIds={marqueeIds}
          liveMarqueeIds={liveMarqueeIds}
          drawingPath={drawingPath}
          mousePos={mousePos}
          presentMode={presentMode}
          scrimmageVisible={scrimmageVisible}
          shiftHeld={shiftHeld}
          hoveredId={hoveredId}
          guidingPlayerId={guidingPlayerId}
          placingHighlight={placingHighlight}
          marqueeRect={marqueeRect}
          isBoxSelect={isBoxSelect}
          positions={positions}
          currentTime={currentTime}
        />
      </Stage>
    </div>
  );
}
