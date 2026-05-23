// TFM Playbook — Football Play Editor
// Copyright (C) 2024–2026 Christopher Campbell / Tech Freedom Ministries
// Licensed under the Business Source License 1.1
// See LICENSE file in the project root for full terms.
// Commercial use prohibited without written permission from the Licensor.
import { create } from 'zustand';
import { DEFAULT_PLAYBACK_SPEED, ANIMATION_END_BUFFER } from '../constants/animationConfig';

// Deliberately isolated from useEditorStore — animation playback state must
// never enter the undo/redo history stack.

// Pure function: longest single route duration + end buffer.
// All players animate simultaneously — play ends when the last route finishes.
export function getDuration(elements) {
  if (!elements?.length) return 0;
  const paths = elements.filter(el => el.type === 'path' && el.segments?.length);
  if (!paths.length) return 0;
  const maxRoute = Math.max(...paths.map(path =>
    path.segments.reduce((sum, seg) => sum + (seg.delay ?? 0) + (seg.duration ?? 0.5), 0)
  ));
  return maxRoute + ANIMATION_END_BUFFER;
}

const useAnimationStore = create((set) => ({
  isPlaying:        false,
  currentTime:      0,
  playbackSpeed:    DEFAULT_PLAYBACK_SPEED,
  animationEnabled: true,

  play: () => set(state =>
    state.animationEnabled ? { isPlaying: true } : {}
  ),

  pause: () => set({ isPlaying: false }),

  reset: () => set({ isPlaying: false, currentTime: 0 }),

  // Caller is responsible for upper-bound clamping against getDuration(elements).
  seek: (t) => set(state =>
    state.animationEnabled ? { currentTime: Math.max(0, t) } : {}
  ),

  setSpeed: (n) => set({ playbackSpeed: n }),

  toggleAnimation: () => set(state =>
    state.animationEnabled
      ? { animationEnabled: false, isPlaying: false, currentTime: 0 }
      : { animationEnabled: true }
  ),
}));

export default useAnimationStore;
