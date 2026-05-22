import { useState, useEffect } from 'react';
import useEditorStore from '../../store/useEditorStore';
import useAnimationStore, { getDuration } from '../../store/useAnimationStore';
import { VIEW_MODES } from '../../constants/toolModes';
import { THEME_LOGO } from '../../constants/themeColors';
import './PresentOverlay.css';

export default function PresentOverlay() {
  const {
    getActivePlay, getActiveFormation, getActivePlaybook,
    togglePresentMode, activePlayId, navigateTo,
    theme,
  } = useEditorStore();

  const {
    isPlaying, currentTime, animationEnabled, playbackSpeed,
    play: startPlay, pause, reset, toggleAnimation, setSpeed,
  } = useAnimationStore();

  const SPEEDS = [0.25, 0.5, 1, 2];

  const logo      = THEME_LOGO[theme] || THEME_LOGO['theme-sun-cyan'];
  const activePlay     = getActivePlay();
  const formation = getActiveFormation();
  const playbook  = getActivePlaybook();
  const plays     = formation?.plays || [];
  const currentIndex = plays.findIndex(pl => pl.id === activePlayId);

  const elements = activePlay?.elements || [];
  const duration = getDuration(elements);

  const defaultText = formation && activePlay
    ? `${formation.name} - ${activePlay.name}`
    : '';

  const [text, setText] = useState(defaultText);

  // Reset animation when navigating to a different play
  useEffect(() => { reset(); }, [activePlayId]);

  if (!activePlay) return null;

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

  function handlePlayAction() {
    if (isPlaying) {
      pause();
    } else if (currentTime > 0) {
      reset();
      startPlay();
    } else {
      startPlay();
    }
  }

  const playLabel = isPlaying ? '⏸' : currentTime > 0 ? '↺' : '▶';
  const playTitle = isPlaying ? 'Pause' : currentTime > 0 ? 'Replay' : 'Play';

  return (
    <div className="present-overlay">

      {/* Floating breadcrumb */}
      <div className="present-crumbs">
        <button className="present-crumb-btn" onClick={() => exitAndNavigate(VIEW_MODES.PLAYBOOK)}>
          {playbook?.name}
        </button>
        <span className="present-crumb-sep">›</span>
        <button className="present-crumb-btn" onClick={() => exitAndNavigate(VIEW_MODES.FORMATION)}>
          {formation?.name}
        </button>
        <span className="present-crumb-sep">›</span>
        <button className="present-crumb-btn" onClick={() => exitAndNavigate(VIEW_MODES.PLAY)}>
          {activePlay?.name}
        </button>
      </div>

      {/* Full-width scrub bar */}
      {animationEnabled && (
        <div className="present-scrub-row">
          <input
            type="range"
            className="present-scrub"
            min={0}
            max={duration > 0 ? duration : 1}
            step={0.01}
            value={currentTime}
            disabled={duration === 0}
            onChange={e => useAnimationStore.getState().seek(parseFloat(e.target.value))}
          />
        </div>
      )}

      {/* Bottom bar: [‹] caption [›]  [play] [speed] [anim] */}
      <div className="present-overlay-inner">
        <button className="present-nav-btn" onClick={goPrev} disabled={!hasPrev} aria-label="Previous play">‹</button>
        <input
          className="present-input"
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="present-nav-btn" onClick={goNext} disabled={!hasNext} aria-label="Next play">›</button>

        <div className="present-anim-controls">
          {animationEnabled ? (
            <>
              <button
                className="present-play-btn"
                onClick={handlePlayAction}
                disabled={duration === 0}
                title={playTitle}
              >
                {playLabel}
              </button>
              <select
                className="present-speed-select"
                value={playbackSpeed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
              >
                {SPEEDS.map(s => (
                  <option key={s} value={s}>{s}x</option>
                ))}
              </select>
              <button
                className="present-anim-toggle"
                onClick={toggleAnimation}
                title="Disable animation"
              >
                Anim
              </button>
            </>
          ) : (
            <button
              className="present-anim-toggle present-anim-off"
              onClick={toggleAnimation}
              title="Enable animation"
            >
              Anim OFF
            </button>
          )}
        </div>
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
