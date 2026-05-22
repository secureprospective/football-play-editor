import { useRef, useEffect, useState } from 'react';
import useAnimationStore, { getDuration } from '../../store/useAnimationStore';
import useEditorStore from '../../store/useEditorStore';
import { computePositions } from '../../utils/animationRuntime';

export function useAnimationLoop() {
  const rafRef    = useRef(null);
  const lastTsRef = useRef(null);
  const [positions, setPositions] = useState(() => new Map());

  // Subscribe to isPlaying and currentTime so effects re-run on changes
  const isPlaying  = useAnimationStore(s => s.isPlaying);
  const currentTime = useAnimationStore(s => s.currentTime);

  // Start/stop rAF loop when isPlaying changes
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    function tick(timestamp) {
      if (lastTsRef.current === null) lastTsRef.current = timestamp;
      const dt = (timestamp - lastTsRef.current) / 1000;
      lastTsRef.current = timestamp;

      // Read fresh from store — avoids stale closure on currentTime/playbackSpeed
      const { currentTime: ct, playbackSpeed, seek, pause } = useAnimationStore.getState();
      const elements = useEditorStore.getState().getActivePlay()?.elements || [];
      const duration  = getDuration(elements);
      const nextTime  = ct + dt * playbackSpeed;

      if (nextTime >= duration) {
        seek(duration);
        setPositions(computePositions(elements, duration));
        pause();
        return;
      }

      seek(nextTime);
      setPositions(computePositions(elements, nextTime));
      rafRef.current = requestAnimationFrame(tick);
    }

    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying]);

  // Recompute positions when scrubbing (not playing)
  useEffect(() => {
    if (!isPlaying) {
      const elements = useEditorStore.getState().getActivePlay()?.elements || [];
      setPositions(computePositions(elements, currentTime));
    }
  }, [currentTime, isPlaying]);

  return positions;
}
