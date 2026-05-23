// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import useDataStore from '../../store/useDataStore';
import useUIStore from '../../store/useUIStore';
import useAnimationStore, { getDuration } from '../../store/useAnimationStore';
import { VIEW_MODES } from '../../constants/toolModes';
import { THEME_LOGO } from '../../constants/themeColors';
import { SPEEDS } from '../../constants/animationConfig';
import './PresentOverlay.css';

const IconFilm = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.375 19.5H20.625M3.375 19.5C2.75368 19.5 2.25 18.9963 2.25 18.375M3.375 19.5H4.875C5.49632 19.5 6 18.9963 6 18.375M2.25 18.375V5.625M2.25 18.375V16.875C2.25 16.2537 2.75368 15.75 3.375 15.75M21.75 18.375V5.625M21.75 18.375C21.75 18.9963 21.2463 19.5 20.625 19.5M21.75 18.375V16.875C21.75 16.2537 21.2463 15.75 20.625 15.75M20.625 19.5H19.125C18.5037 19.5 18 18.9963 18 18.375M20.625 4.5H3.375M20.625 4.5C21.2463 4.5 21.75 5.00368 21.75 5.625M20.625 4.5H19.125C18.5037 4.5 18 5.00368 18 5.625M21.75 5.625V7.125C21.75 7.74632 21.2463 8.25 20.625 8.25M3.375 4.5C2.75368 4.5 2.25 5.00368 2.25 5.625M3.375 4.5H4.875C5.49632 4.5 6 5.00368 6 5.625M2.25 5.625V7.125C2.25 7.74632 2.75368 8.25 3.375 8.25M3.375 8.25H4.875M3.375 8.25C2.75368 8.25 2.25 8.75368 2.25 9.375V10.875C2.25 11.4963 2.75368 12 3.375 12M4.875 8.25C5.49632 8.25 6 7.74632 6 7.125V5.625M4.875 8.25C5.49632 8.25 6 8.75368 6 9.375V10.875M6 5.625V10.875M6 5.625C6 5.00368 6.50368 4.5 7.125 4.5H16.875C17.4963 4.5 18 5.00368 18 5.625M19.125 8.25H20.625M19.125 8.25C18.5037 8.25 18 7.74632 18 7.125V5.625M19.125 8.25C18.5037 8.25 18 8.75368 18 9.375V10.875M20.625 8.25C21.2463 8.25 21.75 8.75368 21.75 9.375V10.875C21.75 11.4963 21.2463 12 20.625 12M18 5.625V10.875M7.125 12H16.875M7.125 12C6.50368 12 6 11.4963 6 10.875M7.125 12C6.50368 12 6 12.5037 6 13.125M6 10.875C6 11.4963 5.49632 12 4.875 12M18 10.875C18 11.4963 17.4963 12 16.875 12M18 10.875C18 11.4963 18.5037 12 19.125 12M16.875 12C17.4963 12 18 12.5037 18 13.125M6 18.375V13.125M6 18.375C6 18.9963 6.50368 19.5 7.125 19.5H16.875C17.4963 19.5 18 18.9963 18 18.375M6 18.375V16.875C6 16.2537 5.49632 15.75 4.875 15.75M18 18.375V13.125M18 18.375V16.875C18 16.2537 18.5037 15.75 19.125 15.75M18 13.125V14.625C18 15.2463 18.5037 15.75 19.125 15.75M18 13.125C18 12.5037 18.5037 12 19.125 12M6 13.125V14.625C6 15.2463 5.49632 15.75 4.875 15.75M6 13.125C6 12.5037 5.49632 12 4.875 12M3.375 12H4.875M3.375 12C2.75368 12 2.25 12.5037 2.25 13.125V14.625C2.25 15.2463 2.75368 15.75 3.375 15.75M19.125 12H20.625M20.625 12C21.2463 12 21.75 12.5037 21.75 13.125V14.625C21.75 15.2463 21.2463 15.75 20.625 15.75M3.375 15.75H4.875M19.125 15.75H20.625" />
  </svg>
);

export default function PresentOverlay() {
  const { navigateTo } = useDataStore(useShallow(s => ({ navigateTo: s.navigateTo })));
  const activePlayId = useDataStore(s => s.activePlayId);
  const activePlay   = useDataStore(s => s.getActivePlay());
  const formation    = useDataStore(s => s.getActiveFormation());
  const playbook     = useDataStore(s => s.getActivePlaybook());

  const { togglePresentMode, theme } = useUIStore(useShallow(s => ({ togglePresentMode: s.togglePresentMode, theme: s.theme })));

  const { isPlaying, currentTime, animationEnabled, playbackSpeed,
          play: startPlay, pause, reset, toggleAnimation, setSpeed } = useAnimationStore(useShallow(s => ({
    isPlaying: s.isPlaying, currentTime: s.currentTime, animationEnabled: s.animationEnabled,
    playbackSpeed: s.playbackSpeed, play: s.play, pause: s.pause, reset: s.reset,
    toggleAnimation: s.toggleAnimation, setSpeed: s.setSpeed,
  })));

  const logo   = THEME_LOGO[theme] || THEME_LOGO['theme-sun-cyan'];
  const plays  = formation?.plays || [];
  const currentIndex = plays.findIndex(pl => pl.id === activePlayId);

  const elements = activePlay?.elements || [];
  const duration = getDuration(elements);

  const defaultText = formation && activePlay
    ? `${formation.name} - ${activePlay.name}`
    : '';

  const [text, setText] = useState(defaultText);
  const [panelHidden, setPanelHidden] = useState(false);

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

      {/* Panel toggle strip — always visible, arrow flips with state */}
      <button
        className="present-panel-toggle"
        onClick={() => setPanelHidden(h => !h)}
        aria-label={panelHidden ? 'Show controls' : 'Hide controls'}
      >
        {panelHidden ? '▲  Show' : '▼  Hide'}
      </button>

      {/* Collapsible panel: scrub bar + bottom bar */}
      <div className={`present-panel${panelHidden ? ' present-panel--hidden' : ''}`}>

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
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                className="present-anim-toggle"
                onClick={toggleAnimation}
                title="Disable animation"
              >
                <IconFilm />
              </button>
            </>
          ) : (
            <button
              className="present-anim-toggle present-anim-off"
              onClick={toggleAnimation}
              title="Enable animation"
            >
              <IconFilm />
            </button>
          )}
        </div>
      </div>
      </div>{/* end present-panel */}

      <button className="present-exit-btn" onClick={togglePresentMode}>
        EDIT
      </button>

      <div className="present-brand">
        <img src={logo} alt="TFM" className="app-brand-logo" />
        <span className="app-brand-title">TFM Playbook</span>
      </div>
    </div>
  );
}
