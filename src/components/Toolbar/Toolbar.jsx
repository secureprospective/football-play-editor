import './Toolbar.css';
import useEditorStore from '../../store/useEditorStore';
import { VIEW_MODES } from '../../constants/toolModes';
import { flipPlayHorizontal, flipPlayVertical } from '../../utils/flipUtils';

const THEMES = [
  { id: 'theme-sun-cyan',       dot: '#00e5ff', title: 'Sun — Cyan'    },
  { id: 'theme-sun-orange',     dot: '#ff6a00', title: 'Sun — Orange'  },
  { id: 'theme-paper-overcast', dot: '#059669', title: 'Paper — Overcast' },
  { id: 'theme-paper-newsprint',dot: '#dc2626', title: 'Paper — Newsprint' },
];

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
    snapEnabled, setSnapEnabled,
    navigateTo, goBack,
    theme, setTheme,
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
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = '.json';
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

      {/* Left — back + breadcrumb + present */}
      <div className="toolbar-nav">
        <button className="tb-btn tb-back" onClick={goBack}>← Plays</button>
        <div className="tb-divider-v" />
        <nav className="toolbar-breadcrumb">
          <button
            className="tb-crumb"
            onClick={() => navigateTo(VIEW_MODES.FORMATION)}
            title="Go to formations"
          >{playbook?.name}</button>
          <span className="tb-crumb-sep">›</span>
          <button
            className="tb-crumb"
            onClick={() => navigateTo(VIEW_MODES.PLAY)}
            title="Go to plays"
          >{formation?.name}</button>
          <span className="tb-crumb-sep">›</span>
          <span className="tb-crumb tb-crumb-active">{play?.name}</span>
        </nav>
        <div className="tb-divider-v" />
        <button
          className={`tb-btn tb-present ${presentMode ? 'btn-present-active' : ''}`}
          onClick={togglePresentMode}
          title="Present Mode"
        >📺 Present</button>
      </div>

      {/* Right — actions (scrollable) or drawing state */}
      {drawingPath ? (
        <div className="toolbar-drawing">
          <span className="toolbar-drawing-hint">Tap to add points · Shift to constrain</span>
          <button className="tb-btn btn-success" onClick={finishDrawing}>✓ Done</button>
          <button className="tb-btn btn-danger"  onClick={cancelDrawing}>✕ Cancel</button>
        </div>
      ) : (
        <div className="toolbar-actions">
          <button className="tb-btn" onClick={undo} disabled={!canUndo()} title="Undo">↩</button>
          <button className="tb-btn" onClick={redo} disabled={!canRedo()} title="Redo">↪</button>
          <div className="tb-divider-v" />
          <button className="tb-btn" onClick={handleFlipH} title="Flip Horizontal">⇄ Flip H</button>
          <button className="tb-btn" onClick={handleFlipV} title="Flip Vertical">⇅ Flip V</button>
          <div className="tb-divider-v" />
          <button
            className={`tb-btn ${snapEnabled ? 'btn-active' : ''}`}
            onClick={() => setSnapEnabled(!snapEnabled)}
            title="Snap to grid"
          >Snap</button>
          <button
            className={`tb-btn ${scrimmageVisible ? 'btn-active' : ''}`}
            onClick={toggleScrimmage}
            title="LOS"
          >LOS</button>
          <div className="tb-divider-v" />
          <button className="tb-btn" onClick={handleExport} title="Export playbook">⬇ Export</button>
          <button className="tb-btn" onClick={handleImport} title="Import playbook">⬆ Import</button>
          <div className="tb-divider-v" />
          {THEMES.map(t => (
            <button
              key={t.id}
              className="tb-theme-dot"
              onClick={() => setTheme(t.id)}
              title={t.title}
              style={{ '--dot': t.dot }}
              aria-pressed={theme === t.id}
            />
          ))}
          <div className="tb-divider-v" />
          <button className="tb-btn btn-danger" onClick={clearElements} title="Clear play">✕ Clear</button>
        </div>
      )}

    </div>
  );
}
