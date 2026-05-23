import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import './Toolbar.css';
import useDataStore from '../../store/useDataStore';
import useUIStore from '../../store/useUIStore';
import { VIEW_MODES } from '../../constants/toolModes';
import { THEME_LOGO } from '../../constants/themeColors';
import { flipPlayHorizontal, flipPlayVertical } from '../../utils/flipUtils';
import { triggerHaptic } from '../../utils/haptics';

export default function Toolbar() {
  // Actions — stable refs, never trigger re-renders
  const { undo, redo, clearElements, updateElement, exportPlaybook, importPlaybook, navigateTo, goBack } = useDataStore(useShallow(s => ({
    undo: s.undo, redo: s.redo, clearElements: s.clearElements,
    updateElement: s.updateElement, exportPlaybook: s.exportPlaybook,
    importPlaybook: s.importPlaybook, navigateTo: s.navigateTo, goBack: s.goBack,
  })));
  // Derived state — re-renders only when these specific values change
  const canUndo   = useDataStore(s => s.canUndo());
  const canRedo   = useDataStore(s => s.canRedo());
  const play      = useDataStore(s => s.getActivePlay());
  const formation = useDataStore(s => s.getActiveFormation());
  const playbook  = useDataStore(s => s.getActivePlaybook());

  const { drawingPath, finishDrawing, cancelDrawing, scrimmageVisible, toggleScrimmage,
          presentMode, togglePresentMode, snapEnabled, setSnapEnabled, theme } = useUIStore(useShallow(s => ({
    drawingPath: s.drawingPath, finishDrawing: s.finishDrawing, cancelDrawing: s.cancelDrawing,
    scrimmageVisible: s.scrimmageVisible, toggleScrimmage: s.toggleScrimmage,
    presentMode: s.presentMode, togglePresentMode: s.togglePresentMode,
    snapEnabled: s.snapEnabled, setSnapEnabled: s.setSnapEnabled,
    theme: s.theme,
  })));

  const logo = THEME_LOGO[theme] || THEME_LOGO['theme-sun-cyan'];

  const [confirmClear, setConfirmClear] = useState(false);

  const elements = play?.elements || [];

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
        <button className="tb-btn tb-back" onPointerDown={triggerHaptic} onClick={goBack}>← Plays</button>
        <div className="tb-divider-v" />
        <nav className="toolbar-breadcrumb">
          <button
            className="tb-crumb"
            onPointerDown={triggerHaptic}
            onClick={() => navigateTo(VIEW_MODES.FORMATION)}
            title="Go to formations"
          >{playbook?.name}</button>
          <span className="tb-crumb-sep">›</span>
          <button
            className="tb-crumb"
            onPointerDown={triggerHaptic}
            onClick={() => navigateTo(VIEW_MODES.PLAY)}
            title="Go to plays"
          >{formation?.name}</button>
          <span className="tb-crumb-sep">›</span>
          <span className="tb-crumb tb-crumb-active">{play?.name}</span>
        </nav>
        <div className="tb-divider-v" />
        <button
          className={`tb-btn tb-present ${presentMode ? 'btn-present-active' : ''}`}
          onPointerDown={triggerHaptic}
          onClick={togglePresentMode}
          title="Present Mode"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:4,flexShrink:0}}>
            <path d="m17 2-5 5-5-5" />
            <rect width="20" height="15" x="2" y="7" rx="2" />
          </svg>
          Present
        </button>
      </div>

      {/* Brand — links to TFM website */}
      <a
        className="toolbar-brand"
        href="https://techfreedomministries.org/"
        target="_blank"
        rel="noopener noreferrer"
        title="Tech Freedom Ministries"
      >
        <img src={logo} alt="TFM" className="app-brand-logo" />
        <span className="app-brand-title">TFM Playbook</span>
      </a>

      {/* Right — actions (scrollable) or drawing state */}
      {drawingPath ? (
        <div className="toolbar-drawing">
          <span className="toolbar-drawing-hint">Tap to add points · Shift to constrain</span>
          <button className="tb-btn btn-success" onClick={finishDrawing}>✓ Done</button>
          <button className="tb-btn btn-danger"  onClick={cancelDrawing}>✕ Cancel</button>
        </div>
      ) : (
        <div className="toolbar-actions">
          <button className="tb-btn" onPointerDown={triggerHaptic} onClick={undo} disabled={!canUndo} title="Undo">↩</button>
          <button className="tb-btn" onPointerDown={triggerHaptic} onClick={redo} disabled={!canRedo} title="Redo">↪</button>
          <div className="tb-divider-v" />
          <button className="tb-btn" onPointerDown={triggerHaptic} onClick={handleFlipH} title="Flip Horizontal">⇄ Flip H</button>
          <button className="tb-btn" onPointerDown={triggerHaptic} onClick={handleFlipV} title="Flip Vertical">⇅ Flip V</button>
          <div className="tb-divider-v" />
          <button
            className={`tb-btn ${snapEnabled ? 'btn-active' : ''}`}
            onPointerDown={triggerHaptic}
            onClick={() => setSnapEnabled(!snapEnabled)}
            title="Snap to grid"
          >Snap</button>
          <button
            className={`tb-btn ${scrimmageVisible ? 'btn-los-active' : ''}`}
            onPointerDown={triggerHaptic}
            onClick={toggleScrimmage}
            title="LOS"
          >LOS</button>
          <div className="tb-divider-v" />
          <button className="tb-btn" onPointerDown={triggerHaptic} onClick={handleExport} title="Export playbook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle'}}>
              <path d="M9 8.25H7.5C6.25736 8.25 5.25 9.25736 5.25 10.5V19.5C5.25 20.7426 6.25736 21.75 7.5 21.75H16.5C17.7426 21.75 18.75 20.7426 18.75 19.5V10.5C18.75 9.25736 17.7426 8.25 16.5 8.25H15M15 5.25L12 2.25M12 2.25L9 5.25M12 2.25L12 15" />
            </svg>
            {' '}Export
          </button>
          <button className="tb-btn" onPointerDown={triggerHaptic} onClick={handleImport} title="Import playbook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle'}}>
              <path d="M9 8.25H7.5C6.25736 8.25 5.25 9.25736 5.25 10.5V19.5C5.25 20.7426 6.25736 21.75 7.5 21.75H16.5C17.7426 21.75 18.75 20.7426 18.75 19.5V10.5C18.75 9.25736 17.7426 8.25 16.5 8.25H15M9 12L12 15M12 15L15 12M12 15L12 2.25" />
            </svg>
            {' '}Import
          </button>
          <div className="tb-divider-v" />
          {confirmClear ? (
            <>
              <span className="tb-confirm-label">Clear play?</span>
              <button className="tb-btn btn-danger" onPointerDown={triggerHaptic} onClick={() => { clearElements(); cancelDrawing(); setConfirmClear(false); }}>Ok</button>
              <button className="tb-btn" onPointerDown={triggerHaptic} onClick={() => setConfirmClear(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn-clear-guard" onClick={() => setConfirmClear(true)} title="Clear play">✕ Clear</button>
          )}
        </div>
      )}

    </div>
  );
}
