import { create } from 'zustand';

// Deliberately isolated from useEditorStore — animation playback state must
// never enter the undo/redo history stack.

// Pure function: sum of all segment durations across all paths in a play.
// Pre-snap segments are timed holds — their duration counts toward total.
export function getDuration(elements) {
  if (!elements?.length) return 0;
  return elements
    .filter(el => el.type === 'path' && el.segments?.length)
    .reduce((total, path) =>
      total + path.segments.reduce((sum, seg) => sum + (seg.duration ?? 0), 0),
    0);
}

const useAnimationStore = create((set) => ({
  isPlaying:        false,
  currentTime:      0,
  playbackSpeed:    1.0,
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
