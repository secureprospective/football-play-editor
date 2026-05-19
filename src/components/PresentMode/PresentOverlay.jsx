import { useState } from 'react';
import useEditorStore from '../../store/useEditorStore';
import { VIEW_MODES } from '../../constants/toolModes';
import './PresentOverlay.css';

export default function PresentOverlay() {
  const {
    getActivePlay, getActiveFormation, togglePresentMode,
    activePlayId, navigateTo,
  } = useEditorStore();

  const play      = getActivePlay();
  const formation = getActiveFormation();
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

  return (
    <div className="present-overlay">
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
    </div>
  );
}
