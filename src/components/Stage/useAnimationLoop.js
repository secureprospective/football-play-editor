// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
import { useRef, useEffect, useState } from 'react';
import useAnimationStore, { getDuration } from '../../store/useAnimationStore';
import useDataStore from '../../store/useDataStore';
import { computePositions, getSnapTime } from '../../utils/animationRuntime';

export function useAnimationLoop() {
  const positionsRef = useRef(new Map());
  const snapTimeRef  = useRef(0);
  const [, forceRender] = useState(0);
  const rafRef    = useRef(null);
  const lastTsRef = useRef(null);

  const isPlaying   = useAnimationStore(s => s.isPlaying);
  const currentTime = useAnimationStore(s => s.currentTime);

  // Pause when page goes to background — stops burning CPU/GPU on cheap tablets
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) useAnimationStore.getState().pause();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  function updateFrame(elements, time, speed) {
    snapTimeRef.current  = getSnapTime(elements);
    positionsRef.current = computePositions(elements, time, speed);
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
      const elements = useDataStore.getState().getActivePlay()?.elements || [];
      const duration  = getDuration(elements);
      const nextTime  = ct + dt * playbackSpeed;

      if (nextTime >= duration) {
        seek(duration);
        pause(); // isPlaying → false; scrub effect will compute final-frame positions
        return;
      }

      seek(nextTime);
      updateFrame(elements, nextTime, playbackSpeed);
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
      const elements = useDataStore.getState().getActivePlay()?.elements || [];
      const { playbackSpeed } = useAnimationStore.getState();
      updateFrame(elements, currentTime, playbackSpeed);
    }
  }, [currentTime, isPlaying]);

  return { positionsRef, snapTimeRef };
}
