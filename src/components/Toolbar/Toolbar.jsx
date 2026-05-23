import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import './Toolbar.css';
import useDataStore from '../../store/useDataStore';
import useUIStore from '../../store/useUIStore';
import { VIEW_MODES } from '../../constants/toolModes';
import { THEME_LOGO } from '../../constants/themeColors';
import { flipPlayHorizontal, flipPlayVertical } from '../../utils/flipUtils';
import { triggerHaptic } from '../../utils/haptics';

/* ── Heroicons outline ── */
const IconUndo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.49012 11.9996L3.74025 15.75M3.74025 15.75L7.49012 19.5004M3.74025 15.75H20.2397V4.49902" />
  </svg>
);

const IconRedo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.4899 11.9996L20.2397 15.75M20.2397 15.75L16.4899 19.5004M20.2397 15.75H3.74023V4.49902" />
  </svg>
);

const IconFlipH = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.5 21L3 16.5M3 16.5L7.5 12M3 16.5H16.5M16.5 3L21 7.5M21 7.5L16.5 12M21 7.5L7.5 7.5" />
  </svg>
);

const IconFlipV = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7.5L7.5 3M7.5 3L12 7.5M7.5 3V16.5M21 16.5L16.5 21M16.5 21L12 16.5M16.5 21L16.5 7.5" />
  </svg>
);

const IconFilm = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.375 19.5H20.625M3.375 19.5C2.75368 19.5 2.25 18.9963 2.25 18.375M3.375 19.5H4.875C5.49632 19.5 6 18.9963 6 18.375M2.25 18.375V5.625M2.25 18.375V16.875C2.25 16.2537 2.75368 15.75 3.375 15.75M21.75 18.375V5.625M21.75 18.375C21.75 18.9963 21.2463 19.5 20.625 19.5M21.75 18.375V16.875C21.75 16.2537 21.2463 15.75 20.625 15.75M20.625 19.5H19.125C18.5037 19.5 18 18.9963 18 18.375M20.625 4.5H3.375M20.625 4.5C21.2463 4.5 21.75 5.00368 21.75 5.625M20.625 4.5H19.125C18.5037 4.5 18 5.00368 18 5.625M21.75 5.625V7.125C21.75 7.74632 21.2463 8.25 20.625 8.25M3.375 4.5C2.75368 4.5 2.25 5.00368 2.25 5.625M3.375 4.5H4.875C5.49632 4.5 6 5.00368 6 5.625M2.25 5.625V7.125C2.25 7.74632 2.75368 8.25 3.375 8.25M3.375 8.25H4.875M3.375 8.25C2.75368 8.25 2.25 8.75368 2.25 9.375V10.875C2.25 11.4963 2.75368 12 3.375 12M4.875 8.25C5.49632 8.25 6 7.74632 6 7.125V5.625M4.875 8.25C5.49632 8.25 6 8.75368 6 9.375V10.875M6 5.625V10.875M6 5.625C6 5.00368 6.50368 4.5 7.125 4.5H16.875C17.4963 4.5 18 5.00368 18 5.625M19.125 8.25H20.625M19.125 8.25C18.5037 8.25 18 7.74632 18 7.125V5.625M19.125 8.25C18.5037 8.25 18 8.75368 18 9.375V10.875M20.625 8.25C21.2463 8.25 21.75 8.75368 21.75 9.375V10.875C21.75 11.4963 21.2463 12 20.625 12M18 5.625V10.875M7.125 12H16.875M7.125 12C6.50368 12 6 11.4963 6 10.875M7.125 12C6.50368 12 6 12.5037 6 13.125M6 10.875C6 11.4963 5.49632 12 4.875 12M18 10.875C18 11.4963 17.4963 12 16.875 12M18 10.875C18 11.4963 18.5037 12 19.125 12M16.875 12C17.4963 12 18 12.5037 18 13.125M6 18.375V13.125M6 18.375C6 18.9963 6.50368 19.5 7.125 19.5H16.875C17.4963 19.5 18 18.9963 18 18.375M6 18.375V16.875C6 16.2537 5.49632 15.75 4.875 15.75M18 18.375V13.125M18 18.375V16.875C18 16.2537 18.5037 15.75 19.125 15.75M18 13.125V14.625C18 15.2463 18.5037 15.75 19.125 15.75M18 13.125C18 12.5037 18.5037 12 19.125 12M6 13.125V14.625C6 15.2463 5.49632 15.75 4.875 15.75M6 13.125C6 12.5037 5.49632 12 4.875 12M3.375 12H4.875M3.375 12C2.75368 12 2.25 12.5037 2.25 13.125V14.625C2.25 15.2463 2.75368 15.75 3.375 15.75M19.125 12H20.625M20.625 12C21.2463 12 21.75 12.5037 21.75 13.125V14.625C21.75 15.2463 21.2463 15.75 20.625 15.75M3.375 15.75H4.875M19.125 15.75H20.625" />
  </svg>
);

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
          <IconFilm />
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
          <button className="tb-btn btn-success" onPointerDown={triggerHaptic} onClick={finishDrawing}>✓ Done</button>
          <button className="tb-btn btn-danger"  onPointerDown={triggerHaptic} onClick={cancelDrawing}>✕ Cancel</button>
        </div>
      ) : (
        <>
          <div className="toolbar-actions">
            <button className="tb-btn" onPointerDown={triggerHaptic} onClick={undo} disabled={!canUndo} title="Undo"><IconUndo /></button>
            <button className="tb-btn" onPointerDown={triggerHaptic} onClick={redo} disabled={!canRedo} title="Redo"><IconRedo /></button>
            <div className="tb-divider-v" />
            <button className="tb-btn" onPointerDown={triggerHaptic} onClick={handleFlipH} title="Flip Horizontal"><IconFlipH /> Flip H</button>
            <button className="tb-btn" onPointerDown={triggerHaptic} onClick={handleFlipV} title="Flip Vertical"><IconFlipV /> Flip V</button>
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
          </div>

          {/* Clear — pinned to far right, outside the scroll zone */}
          <div className="toolbar-clear-zone">
            {confirmClear ? (
              <>
                <span className="tb-confirm-label">Clear?</span>
                <button className="tb-btn btn-danger" onPointerDown={triggerHaptic} onClick={() => { clearElements(); cancelDrawing(); setConfirmClear(false); }}>Ok</button>
                <button className="tb-btn" onPointerDown={triggerHaptic} onClick={() => setConfirmClear(false)}>No</button>
              </>
            ) : (
              <button className="btn-clear-guard" onClick={() => setConfirmClear(true)} title="Clear play">✕ Clear</button>
            )}
          </div>
        </>
      )}

    </div>
  );
}
