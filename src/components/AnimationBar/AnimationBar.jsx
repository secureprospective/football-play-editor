import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import useAnimationStore, { getDuration } from '../../store/useAnimationStore';
import useDataStore from '../../store/useDataStore';
import { SPEEDS } from '../../constants/animationConfig';
import { triggerHaptic } from '../../utils/haptics';
import './AnimationBar.css';

export default function AnimationBar() {
  const { isPlaying, currentTime, playbackSpeed, animationEnabled,
          play, pause, reset, seek, setSpeed, toggleAnimation } = useAnimationStore(useShallow(s => ({
    isPlaying: s.isPlaying, currentTime: s.currentTime, playbackSpeed: s.playbackSpeed,
    animationEnabled: s.animationEnabled, play: s.play, pause: s.pause, reset: s.reset,
    seek: s.seek, setSpeed: s.setSpeed, toggleAnimation: s.toggleAnimation,
  })));

  const activePlayId = useDataStore(s => s.activePlayId);
  const elements     = useDataStore(s => s.getActivePlay()?.elements || []);
  const duration     = getDuration(elements);

  useEffect(() => { reset(); }, [activePlayId]);

  const disabled = !animationEnabled;
  const noRoutes = duration === 0;

  return (
    <div className={`anim-bar${disabled ? ' anim-bar-disabled' : ''}`}>
      <button
        className={`anim-toggle${animationEnabled ? ' active' : ''}`}
        onPointerDown={triggerHaptic}
        onClick={toggleAnimation}
        title={animationEnabled ? 'Disable animation' : 'Enable animation'}
      >
        Anim
      </button>

      <button
        className="anim-btn"
        onPointerDown={triggerHaptic}
        onClick={reset}
        disabled={disabled}
        title="Reset to start"
      >
        ◀◀
      </button>

      <button
        className="anim-btn anim-play"
        onPointerDown={triggerHaptic}
        onClick={isPlaying ? pause : play}
        disabled={disabled || noRoutes}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <input
        type="range"
        className="anim-scrub"
        min={0}
        max={noRoutes ? 1 : duration}
        step={0.01}
        value={currentTime}
        disabled={disabled || noRoutes}
        onChange={e => seek(parseFloat(e.target.value))}
      />

      <span className="anim-time">
        {currentTime.toFixed(1)}s&nbsp;/&nbsp;{duration.toFixed(1)}s
      </span>

      <select
        className="anim-speed"
        value={playbackSpeed}
        disabled={disabled}
        onChange={e => setSpeed(parseFloat(e.target.value))}
      >
        {SPEEDS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
