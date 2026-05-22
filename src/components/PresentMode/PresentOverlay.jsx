import { useState } from 'react';
import useEditorStore from '../../store/useEditorStore';
import { VIEW_MODES } from '../../constants/toolModes';
import { THEME_LOGO } from '../../constants/themeColors';
import './PresentOverlay.css';

export default function PresentOverlay() {
  const {
    getActivePlay, getActiveFormation, getActivePlaybook,
    togglePresentMode, activePlayId, navigateTo,
    theme,
  } = useEditorStore();

  const logo = THEME_LOGO[theme] || THEME_LOGO['theme-sun-cyan'];

  const play      = getActivePlay();
  const formation = getActiveFormation();
  const playbook  = getActivePlaybook();
  const plays     = formation?.plays || [];
  const currentIndex = plays.findIndex(pl => pl.id === activePlayId);

  const defaultText = formation && play
    ? `${formation.name} - ${play.name}`
    : '';

  const [text, setText] = useState(defaultText);

  if (!play) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < plays.length - 1;

  function goPrev() {
    if (!hasPrev) return;
    navigateTo(VIEW_MODES.FIELD, { playId: plays[currentIndex - 1].id });
  }

  function goNext() {
    if (!hasNext) return;
    navigateTo(VIEW_MODES.FIELD, { playId: plays[currentIndex + 1].id });
  }

  function exitAndNavigate(viewMode, ids) {
    togglePresentMode();
    navigateTo(viewMode, ids);
  }

  return (
    <div className="present-overlay">

      {/* Floating breadcrumb — no bar, 50% opacity */}
      <div className="present-crumbs">
        <button
          className="present-crumb-btn"
          onClick={() => exitAndNavigate(VIEW_MODES.PLAYBOOK)}
        >{playbook?.name}</button>
        <span className="present-crumb-sep">›</span>
        <button
          className="present-crumb-btn"
          onClick={() => exitAndNavigate(VIEW_MODES.FORMATION)}
        >{formation?.name}</button>
        <span className="present-crumb-sep">›</span>
        <button
          className="present-crumb-btn"
          onClick={() => exitAndNavigate(VIEW_MODES.PLAY)}
        >{play?.name}</button>
      </div>

      {/* Caption + prev/next */}
      <div className="present-overlay-inner">
        <button
          className="present-nav-btn"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Previous play"
        >‹</button>
        <input
          className="present-input"
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button
          className="present-nav-btn"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next play"
        >›</button>
      </div>

      <button className="present-exit-btn" onClick={togglePresentMode}>
        EDIT
      </button>

      <div className="present-brand">
        <img src={logo} alt="TFM" className="app-brand-logo" />
        <span className="app-brand-title">TFM Playbook Lite</span>
      </div>
    </div>
  );
}
