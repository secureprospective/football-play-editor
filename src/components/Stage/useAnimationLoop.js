import { useRef, useEffect, useState } from 'react';
import useAnimationStore, { getDuration } from '../../store/useAnimationStore';
import useEditorStore from '../../store/useEditorStore';
import { computePositions } from '../../utils/animationRuntime';

export function useAnimationLoop() {
  const positionsRef = useRef(new Map());
  const [, forceRender] = useState(0);
  const rafRef    = useRef(null);
  const lastTsRef = useRef(null);

  const isPlaying   = useAnimationStore(s => s.isPlaying);
  const currentTime = useAnimationStore(s => s.currentTime);

  function updatePositions(newMap) {
    positionsRef.current = newMap;
    forceRender(n => n + 1);
  }

  // rAF loop — runs while isPlaying is true
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      lastTsRef.current = null;
      return;
    }

    function tick(timestamp) {
      if (lastTsRef.current === null) lastTsRef.current = timestamp;
      const dt = (timestamp - lastTsRef.current) / 1000;
      lastTsRef.current = timestamp;

      const { currentTime: ct, playbackSpeed, seek, pause } = useAnimationStore.getState();
      const elements = useEditorStore.getState().getActivePlay()?.elements || [];
      const duration  = getDuration(elements);
      const nextTime  = ct + dt * playbackSpeed;

      if (nextTime >= duration) {
        seek(duration);
        pause(); // isPlaying → false; scrub effect will compute final-frame positions
        return;
      }

      seek(nextTime);
      updatePositions(computePositions(elements, nextTime));
      rafRef.current = requestAnimationFrame(tick);
    }

    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [isPlaying]);

  // Scrub — recompute positions whenever currentTime changes while not playing
  useEffect(() => {
    if (!isPlaying) {
      const elements = useEditorStore.getState().getActivePlay()?.elements || [];
      updatePositions(computePositions(elements, currentTime));
    }
  }, [currentTime, isPlaying]);

  return positionsRef;
}
