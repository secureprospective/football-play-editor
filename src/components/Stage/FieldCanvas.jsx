import { Stage } from 'react-konva';
import './FieldCanvas.css';
import { useFieldInteraction } from './useFieldInteraction';
import { useAnimationLoop } from './useAnimationLoop';
import FieldRenderer from './FieldRenderer';
import FieldGrid from './FieldGrid';

export default function FieldCanvas() {
  const {
    stageRef, containerRef,
    stageSize, scaleX, scaleY, theme,
    cursorStyle, isBoxSelect,
    mousePos, shiftHeld, hoveredId, guidingPlayerId, placingHighlight,
    marqueeRect, liveMarqueeIds,
    elements, colors, selectedId, marqueeIds,
    drawingPath, presentMode, scrimmageVisible,
    handlers,
  } = useFieldInteraction();

  const positions = useAnimationLoop();

  return (
    <div className="field-canvas-container" ref={containerRef} style={{ cursor: cursorStyle }}>
      <Stage
        key={theme}
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scaleX}
        scaleY={scaleY}
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
        />
      </Stage>
    </div>
  );
}
