import './Toolbar.css';
import useEditorStore from '../../store/useEditorStore';
import { flipPlayHorizontal, flipPlayVertical } from '../../utils/flipUtils';
import { VIEW_MODES } from '../../constants/toolModes';

export default function Toolbar() {
  const {
    undo, redo, canUndo, canRedo,
    clearElements,
    getActivePlay, getActiveFormation, getActivePlaybook,
    updateElement,
    exportPlaybook, importPlaybook,
    drawingPath, finishDrawing, cancelDrawing,
    scrimmageVisible, toggleScrimmage,
    goBack, navigateTo,
    presentMode, togglePresentMode,
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
        if (!result.success) alert('Failed to load playbook: ' + result.error);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="toolbar">
      <button className="toolbar-back-btn" onClick={goBack} title="Back to plays">← Plays</button>
      <div className="toolbar-breadcrumb">
        <span>{playbook?.name}</span>
        <span className="crumb-sep">›</span>
        <span>{formation?.name}</span>
        <span className="crumb-sep">›</span>
        <span className="crumb-active">{play?.name}</span>
      </div>
      <div className="toolbar-actions">
        {drawingPath ? (
          <>
            <span className="toolbar-drawing-hint">Drawing — click to add points</span>
            <button onClick={finishDrawing} className="btn-success">✓ Finish</button>
            <button onClick={cancelDrawing} className="btn-danger">✕ Cancel</button>
          </>
        ) : (
          <>
            <button onClick={undo} disabled={!canUndo()} title="Undo">↩</button>
            <button onClick={redo} disabled={!canRedo()} title="Redo">↪</button>
            <div className="toolbar-divider" />
            <button onClick={handleFlipH} title="Flip Horizontal">⇄</button>
            <button onClick={handleFlipV} title="Flip Vertical">⇅</button>
            <div className="toolbar-divider" />
            <button onClick={toggleScrimmage} className={scrimmageVisible ? 'btn-active' : ''} title="Line of Scrimmage">LOS</button>
            <div className="toolbar-divider" />
            <button onClick={handleExport} title="Export playbook">⬇</button>
            <button onClick={handleImport} title="Import playbook">⬆</button>
            <div className="toolbar-divider" />
            <div className="toolbar-divider" />
            <button onClick={togglePresentMode} className="btn-present" title="Present Mode (full screen field)">📺</button>
            <button onClick={clearElements} className="btn-danger" title="Clear play">✕</button>
          </>
        )}
      </div>
    </div>
  );
}
