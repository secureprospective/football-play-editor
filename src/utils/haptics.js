/**
 * triggerHaptic — 12ms mechanical click pulse.
 * Short enough to feel like a discrete click, not a buzz.
 * Bridges glass screens and gives physical confirmation that a control registered.
 *
 * Wire to onPointerDown on:
 *   - Toolbelt tool buttons
 *   - Top bar action buttons + breadcrumb tabs
 *   - AppHeader nav/add buttons
 *   - Transport buttons (rewind, play)
 *   - Shape selector segments in inspector
 *
 * Do NOT wire to:
 *   - Clear guard button (no haptic encourages caution)
 *   - Timeline thumb drag (continuous haptic during drag is disorienting)
 *   - Color swatches (selection, not action)
 */
export const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(12);
  }
};
