import './Toolbar.css';
import useEditorStore from '../../store/useEditorStore';
import { flipPlayHorizontal, flipPlayVertical } from '../../utils/flipUtils';

export default function Toolbar() {
  const {
    undo, redo, canUndo, canRedo,
    clearElements,
    getActivePlay, getActiveFormation, getActivePlaybook,
    updateElement,
    exportPlaybook, importPlaybook,
    drawingPath, finishDrawing, cancelDrawing,
    scrimmageVisible, toggleScrimmage,
    presentMode, togglePresentMode,
    goBack,
  } = useEditorStore();

  const play      = getActivePlay();
  const formation = getActiveFormation();
  const playbook  = getActivePlaybook();
  const elements  = play?.elements || [];

  function handleFlipH() {
    const flipped = flipPlayHorizontal(elements);
    flipped.forEach(el => updateElement(el.id, el));
  }

  function handleFlipV() {
    const flipped = flipPlayVertical(elements);
    flipped.forEach(el => updateElement(el.id, el));
  }

  function handleExport() {
    const json = exportPlaybook();
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = (playbook?.name || 'playbook') + '.json';
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
        const result = importPlaybook(ev.target.result);
        if (!result.success) alert('Failed to load: ' + result.error);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="toolbar">

      {/* Left — navigation */}
      <div className="toolbar-left">
        <button className="tb-btn" onClick={goBack} title="Back to plays">← Plays</button>
        <div className="toolbar-breadcrumb">
          <span className="crumb">{playbook?.name}</span>
          <span className="crumb-sep">›</span>
          <span className="crumb">{formation?.name}</span>
          <span className="crumb-sep">›</span>
          <span className="crumb crumb-active">{play?.name}</span>
        </div>
      </div>

      {/* Center — drawing state hint */}
      {drawingPath && (
        <div className="toolbar-center">
          <span className="toolbar-drawing-hint">Click to add points</span>
          <button className="tb-btn btn-success" onClick={finishDrawing} title="Finish (Enter)">✓ Done</button>
          <button className="tb-btn btn-danger"  onClick={cancelDrawing} title="Cancel (Esc)">✕</button>
        </div>
      )}

      {/* Right — actions */}
      <div className="toolbar-right">
        <button className="tb-btn" onClick={undo} disabled={!canUndo()} title="Undo">↩</button>
        <button className="tb-btn" onClick={redo} disabled={!canRedo()} title="Redo">↪</button>
        <div className="tb-divider" />
        <button className="tb-btn" onClick={handleFlipH} title="Flip Horizontal">⇄</button>
        <button className="tb-btn" onClick={handleFlipV} title="Flip Vertical">⇅</button>
        <div className="tb-divider" />
        <button
          className={`tb-btn ${scrimmageVisible ? 'btn-active' : ''}`}
          onClick={toggleScrimmage}
          title="Line of Scrimmage"
        >LOS</button>
        <div className="tb-divider" />
        <button className="tb-btn" onClick={handleExport} title="Export playbook">⬇</button>
        <button className="tb-btn" onClick={handleImport} title="Import playbook">⬆</button>
        <div className="tb-divider" />
        <button className="tb-btn btn-danger" onClick={clearElements} title="Clear play">✕</button>
        <div className="tb-divider" />
        <button
          className={`tb-btn btn-present ${presentMode ? 'btn-present-active' : ''}`}
          onClick={togglePresentMode}
          title="Present Mode"
        >📺</button>
      </div>

    </div>
  );
}
