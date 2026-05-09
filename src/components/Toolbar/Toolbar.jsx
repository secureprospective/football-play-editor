import './Toolbar.css';
import useEditorStore from '../../store/useEditorStore';
import { flipPlayHorizontal, flipPlayVertical } from '../../utils/flipUtils';

export default function Toolbar() {
  const {
    undo, redo, canUndo, canRedo,
    clearElements,
    elements, updateElement,
    exportPlay, importPlay,
    drawingPath, finishDrawing, cancelDrawing,
    scrimmageVisible, toggleScrimmage,
  } = useEditorStore();

  function handleFlipH() {
    const flipped = flipPlayHorizontal(elements);
    flipped.forEach(el => updateElement(el.id, el));
  }

  function handleFlipV() {
    const flipped = flipPlayVertical(elements);
    flipped.forEach(el => updateElement(el.id, el));
  }

  function handleExport() {
    const json = exportPlay();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'play.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type  = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importPlay(ev.target.result);
        if (!result.success) alert('Failed to load play: ' + result.error);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="toolbar">
      <span className="toolbar-title">Football Play Editor</span>
      <div className="toolbar-actions">

        {drawingPath ? (
          <>
            <span className="toolbar-drawing-hint">Drawing route — click to add points</span>
            <button onClick={finishDrawing} className="btn-success" title="Finish route (Enter)">✓ Finish Route</button>
            <button onClick={cancelDrawing} className="btn-danger" title="Cancel route (Escape)">✕ Cancel</button>
          </>
        ) : (
          <>
            <button onClick={undo} disabled={!canUndo()} title="Undo">↩ Undo</button>
            <button onClick={redo} disabled={!canRedo()} title="Redo">↪ Redo</button>
            <div className="toolbar-divider" />
            <button onClick={handleFlipH} title="Flip Horizontal">⇄ Flip H</button>
            <button onClick={handleFlipV} title="Flip Vertical">⇅ Flip V</button>
            <div className="toolbar-divider" />
            <button
              onClick={toggleScrimmage}
              className={scrimmageVisible ? 'btn-active' : ''}
              title="Show/Hide line of scrimmage"
            >
              {scrimmageVisible ? '— Hide LOS' : '— Show LOS'}
            </button>
            <div className="toolbar-divider" />
            <button onClick={handleExport} title="Export play as JSON">⬇ Export</button>
            <button onClick={handleImport} title="Import play from JSON">⬆ Import</button>
            <div className="toolbar-divider" />
            <button onClick={clearElements} className="btn-danger" title="Clear all elements">✕ Clear</button>
          </>
        )}

      </div>
    </div>
  );
}
