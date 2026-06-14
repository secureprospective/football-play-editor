# TFM Playbook — Phase History

Archived build record for the full (`main`) app. This is the detailed, session-by-session
completion log that used to live in `CLAUDE.md`. Moved here 2026-06-14 to keep `CLAUDE.md`
focused on current state. Nothing here is active work — see `CLAUDE.md` for what's current.

---

## Animation Roadmap

### Phase 1 — New element types + per-segment route speed (static only, no animation wiring)

- Session 1 — Football element: COMPLETE (branch: session/football-element)
  - type: 'football' with position {x,y} and attachedToElementId: null
  - ADD_FOOTBALL tool, drag, select, marquee, delete
  - renderFootball: brown ellipse (rx=20, ry=12), attached-position stub (PLAYER_RADIUS offset, default right)
  - Z-order: Layer 1 football, Layer 2 players (player draws over attached ball)
  - Thumbnails: play + formation thumbnails render football
  - Inspector: position read-only, attachment placeholder
  - MAX 1 per play enforced at placement
  - FLAG: hit-test priority (football after players) needs testing once attachment is set — possible Phase 3 pivot
- Session 2 — Text element: COMPLETE (branch: session/text-element)
  - type: 'text' with position {x,y}, content: string, visibility stub {startTime,endTime,fade}
  - ADD_TEXT tool (T button in toolbox): click field → places element with default content 'Text'
  - Select element → right panel (inspector) Content textarea → edit live, field updates immediately
  - Inspector textarea has stopPropagation on keydown (prevents canvas delete handler from firing while typing)
  - Drag, select, group-drag, marquee-select, delete all work
  - Konva Text in Layer 2 after players (text on top); empty-content guard prevents Konva canvas corruption
  - getScaledPos() null-guards getPointerPosition() — fixes pre-existing TypeError after theme change
  - Thumbnails: intentionally excluded (illegible at scale — Phase 3 if requested)
  - NOTE: inline canvas editing deferred; inspector-based editing is the working pattern for Phase 1
- Session 3 — Highlight element: COMPLETE (branch: session/highlight-element)
  - type: 'highlight' with center {x,y}, radius, color, opacity, visibility stub
  - ADD_HIGHLIGHT tool (◯): click 1 sets center, move to preview, click 2 confirms radius; Escape cancels
  - Drag, select, group-drag, marquee-select, delete all work
  - Z-order: rendered first in Layer 1 — structurally under scrimmage, paths, football, players, text
  - Inspector: native color picker (not theme-bound), opacity slider (%), visibility placeholder
  - Thumbnails: SVG circle before routes in both play and formation thumbnails
  - Default: yellow (#ffff00), 30% opacity; hitTest priority 6 (last — matches visual z-order)
- Session 4 — Per-segment route duration: COMPLETE (branch: session/route-speed)
  - duration: float (seconds) added to every route segment
  - Migration: migratePath backfills 0.5s on existing segments (guard: never overwrites)
  - New segments default to 0.5s; importPlaybook migrates on load
  - Inspector: duration slider (0.1–3.0s) per segment row, below Pre-snap button
  - Static only — Phase 3 wires to animation runtime

### Phase 2 — Animation foundation
- Session 1 — Player-route linkage (data model): COMPLETE
  - routeId: string | null on every player element (default null)
  - playerId: string | null on every path element (default null)
  - migratePath() backfills playerId on existing paths
  - loadFromStorage() and importPlaybook() backfill routeId on existing players
  - deleteElement() clears stale cross-references on deletion
  - Inspector: read-only "Route: None" on player, "Player: None" on path (Phase 3 wires UI)
- Session 2 — FieldCanvas split (render / interaction separation): COMPLETE
  - useFieldInteraction.js: all pointer/keyboard/drag/marquee/drawing state + handlers
  - FieldRenderer.jsx: pure render, all Konva layer JSX, no store calls
  - FieldCanvas.jsx: thin shell (~40 lines), composes hook + renderer via props
  - Animation drives FieldRenderer from a timeline by passing computed positions as props
- Session 3 — Animation store: COMPLETE
  - src/store/useAnimationStore.js — fully isolated from useEditorStore
  - State: isPlaying, currentTime, playbackSpeed, animationEnabled
  - Actions: play, pause, reset, seek (lower-bound clamp), setSpeed, toggleAnimation
  - getDuration(elements) exported as pure function — not stored state
  - animationEnabled: false is a no-op on play() and seek()
- Session 4 — Animation runtime engine: COMPLETE
  - src/utils/animationRuntime.js — pure function, no store calls, no UI wiring
  - computePositions(elements, currentTime) → Map<elementId, {x, y}>
  - All players interpolate simultaneously from time 0
  - Linear and quadratic bezier interpolation (reuses bezierCtrl from curveUtils)
  - Pre-snap segments hold at p1 for their full duration
  - Zero-duration segments treated as instantaneous (no divide-by-zero)
  - Football follows carrying player's computed position at x + PLAYER_RADIUS
  - Players with no routeId absent from Map (stay at stored position)
  - 14 edge cases verified: empty, no routeId, t=0, past end, midpoint,
    pre-snap, zero-duration, multi-segment, bezier endpoints, football follow

### Phase 2 — Animation foundation: COMPLETE (all 4 sessions)

### Phase 3 — Editor animation UI

- Session 1 — Player-route linking UI: COMPLETE
  - Route dropdown on player inspector: lists unlinked paths as "Route N", onChange calls linkPlayerToRoute/unlinkPlayerFromRoute
  - On link: entire route translates so first node snaps to player center (one undo step)
  - Linked drag: dragging player carries route (total-delta, no drift); dragging route carries player (incremental delta)
  - Fixed pre-existing bug: whole-path drag now correctly translates curve control points
  - Path inspector: read-only "Player N" display + Unlink button
  - Store: linkPlayerToRoute + unlinkPlayerFromRoute actions (both call pushHistory)
- Session 2 — Scrub bar + playback controls: COMPLETE
  - AnimationBar component below the field canvas (56px grid row: toolbox · scrubbar · inspector)
  - Controls: Anim toggle, ◀◀ reset, ▶/⏸ play-pause, scrub slider, time display, speed selector (0.25x–2x)
  - Wired entirely to useAnimationStore; resets on active play change
  - Disabled state when animationEnabled=false; play+scrub disabled when no linked routes
- Session 3 — rAF playback loop + animated positions: COMPLETE
  - useAnimationLoop hook: rAF loop ticks currentTime, reads fresh store state each frame (no stale closures)
  - positionsRef (stable ref, not state) returned from hook — eliminates stale closure in hit testing
  - Scrub effect: positions recompute on currentTime change when not playing (scrub preview works)
  - FieldCanvas passes positions Map to FieldRenderer
  - FieldRenderer: player shape, label, and football use computed positions; elements absent from Map stay at stored position
  - hitTesting.js: hitTestPlayer/hitTestFootball/masterHitTest accept positions Map — hit testing uses animated coordinates
  - On drag start: animated position committed to stored position, Map cleared — no jump, stored truth stays in sync
  - useAnimationLoop lives inside useFieldInteraction (not FieldCanvas) so positions are accessible at hit-test time

- Session 4 — Text and highlight visibility timing: COMPLETE
  - VisibilityControls component: Timed checkbox, Show at / Hide at sliders
  - FieldRenderer filters text and highlight by isVisible(el.visibility, currentTime)
  - Elements always visible at t=0 (static editor view); filter only applies when t > 0
  - FieldCanvas reads currentTime from useAnimationStore and passes to FieldRenderer

### Phase 3 — COMPLETE (all 4 sessions)

### Phase 4 — Present Mode animation integration: COMPLETE
- Full-width scrub bar with 32px touch thumb (hides when Anim disabled)
- Control row: [‹] caption [›] · [▶/⏸/↺] [speed select 56px] [Anim toggle]
- Single play button cycles play → pause → replay
- Anim toggle disables animation entirely for cheap tablets
- Resets animation on play navigation (useEffect on activePlayId)
- FieldRenderer visibility filter applies in Present Mode at t=0 (no editor override)

### Phase 5 — Polish + performance tuning (cheap Windows tablets)

- Session 1 — Performance baseline: COMPLETE
  - pixelRatio={1} on Konva Stage — caps canvas buffer at ~8MB vs ~33MB on HiDPI devices
  - visibilitychange listener in useAnimationLoop — pauses rAF when page goes to background (saves CPU/battery on tablets)
- Session 2 — Pre-snap animation fix: COMPLETE
  - Removed hard-coded hold in animationRuntime.js — pre-snap segments now interpolate like any other segment
  - Pre-snap flag is a visual/rendering concept (dashed line) only; it no longer freezes the player during playback

### Phase 6 — Football animation + UI polish: COMPLETE

- Architecture refactor: COMPLETE
  - useEditorStore split into useDataStore (elements, history, selection) + useUIStore (tool, drawing, theme, present/print)
  - useFieldInteraction stabilized via getState() — no stale closures in pointer handlers

- Per-segment delay field: COMPLETE
  - delay: float (seconds) on every route segment (default 0, migration via ?? 0)
  - Inspector: compact text input in segment row header (specificity fix: `.inspector-body input.seg-delay-input[type="text"]`)
  - Animation runtime: delay window holds player at segment start before interpolation begins

- Football journey model: COMPLETE
  - journey: { snapToPlayer, events[] } on football element
  - Events: handoff (instant), toss (10% slower than snap), pass (same as snap)
  - Flight constants: SNAP_REAL_SECS=0.13915s, TOSS=SNAP×1.1, PASS=SNAP (exported from animationRuntime.js)
  - Snap: linear flight from LOS to carrier at snapTime
  - Handoff: instant transfer at event.time
  - Pass/Toss: linear flight from thrower to interceptPoint (or receiver's catch position as default)
  - Arc drawing removed entirely — replaced by draggable ◇ intercept node
  - interceptPoint: {x,y} | null stored on pass/toss events; null = receiver's animated position at catch time
  - Per-event flight duration slider (0.05–0.80s) in inspector; null = use constant default
  - ⚑ FLAG: flight duration slider layout marked for possible future refinement

- Football tool toggle: COMPLETE
  - Clicking football tool when football exists toggles selection (no canvas click needed)
  - Football selected → renders in Layer 2 (above players); unselected → Layer 1 (below players)
  - Uses activeTool useEffect in useFieldInteraction — fires on button press, not canvas interaction

- Intercept node (◇): COMPLETE
  - Yellow dashed diamond renders for each pass/toss event when football is selected
  - Draggable with snap-to-grid; hit radius 16px; history pushed once on drag end (not per-move)
  - Inspector shows "Target ✓" / "Drag ◇ on field to set target"
  - getInterceptPoint() exported from animationRuntime — used by both FieldRenderer and useFieldInteraction

- In-flight ring: COMPLETE
  - Yellow selection ring on football during: snap flight (SNAP_REAL_SECS window), handoff (0.1s pulse), pass/toss (per event.duration ?? constant)
  - isFootballInFlight() pure function exported from animationRuntime; called in renderFootball()
  - Works identically in editor and Present Mode

- Journey Events inspector: COMPLETE
  - Column-header table layout (At · Type · To) — matches Segment section pattern
  - Flat borderless rows; arc sub-row replaced with target hint + flight duration slider
  - CSS specificity pattern: `.inspector-body select.journey-type-select` to beat global 44px rule

- Present Mode hide/show panel: COMPLETE
  - Thin 28px strip always anchored at bottom with ▼ Hide / ▲ Show label
  - Tapping slides scrub bar + control bar off screen (max-height + opacity CSS transition)
  - Resets to visible each time Present Mode opens (local useState, not persisted)

- Rebrand: COMPLETE
  - "Lite" removed from AppHeader, PresentOverlay, Toolbar, index.html, vite.config.js
  - App is now "TFM Playbook" throughout

---

## Print Mode: COMPLETE (branch: session/print-mode)
- Print toggle on Playbook layer — amber glow border on entire screen when active
- Coach navigates freely through app; tapping a play card in PlayView toggles it into/out of print queue (no editor navigation in print mode)
- Selected play cards show amber outline + queue position badge
- PrintStaging on Playbook layer: drag to reorder queue, Text/Plays format toggle, Youth/Adult size toggle, Print PDF + Clear buttons, scale warning
- PrintSheet: 4 identical wristband cards per page (2×2), each card 4.75"×2.75"
- Plays format: each card is a 4×2 grid of 8 play slots; number header (15%) + PlayThumbnail diagram (85%); queue of 20 chunks into groups of 8 across multiple pages; play numbers = global queue position
- Text format: 4 identical call-sheet cards; black header bar; 2-column layout (plays 1–10 left, 11–20 right); zebra striping; always 1 page
- Page layout: landscape letter, 0.5in margins, 0.5in col-gap + 2in row-gap for easy cutting
- PlayThumbnail: bgColor prop added for white print background (backward compatible)
- ⚑ KNOWN ISSUE (still open, tracked in CLAUDE.md): printQueue stores element snapshots at queue-add time. If coach edits a play after queuing it, the print output shows the old version. Fix: store only IDs and resolve live from store at render time. Deferred — not blocking.

---

## Version History

### v1.0.0 — TFM Playbook Lite (tagged on main)
This is the 1.0 release. It is intentionally scoped for **coaches on limited/old hardware**
(Windows 10 tablets, low-RAM laptops, cheap Chromebooks). Performance, bundle size, and
offline reliability are the binding constraints for this version.

**What 1.0 includes:** Full play editor (draw, routes, players, segments, per-segment color),
playbook/formation/play navigation, Present Mode, Print Mode (wristband cards), PWA install,
four-theme system, TFM branding (logo + Cinzel title).

**Known deferred issues (not blocking 1.0):**
- printQueue stale snapshot — store IDs not snapshots; fix in next session
- Konva chunk size warning — address when animation phase begins
- Animation Phase 2 — full feature set deferred to TFM Playbook (full)

---

## Audit cleanup (Phases A–F, all shipped to main 2026-05-23)
- Phase A — Dead CSS, unused destructures, stale assets
- Phase B — Print button backgrounds, live print queue, Safari blur fix
- Phase C — Duration slider draft+commit (1 undo step); undo now preserves selection
- Phase D — useShallow selector sweep across 8 files
- Phase E — snapTime hoisted out of per-frame recompute
- Phase F — localStorage quota error surfaced as banner

## Pre-snap sequencing (shipped 2026-05-23)
- preSnap field changed from boolean to sequence number (1, 2, 3...) on each segment
- All pre-snap segments across the play run in strict global sequence order (NFL rule: 1 player at a time)
- Ball snaps 0.1s after the last pre-snap segment completes
- buildPreSnapSchedule(elements) assigns startTime/endTime per segment; computed once per frame
- playerPositionAtTime updated: pre-snap phase uses schedule, post-snap phase accumulates from snapTime
- Inspector button shows sequence number ("Pre-snap 1"); removing shifts others down via setSegmentPreSnap store action
- Migration: preSnap:true → sequential number on load/import

## UI Overhaul (shipped 2026-05-23, session/ui-overhaul → main)
- Full rugged chrome redesign — 15 files, docs/UI_OVERHAUL_SPEC.md is the reference doc
- --s-* token layer, 3D bevel system, haptics, heroicons, brand link, present mode buttons
- Deferred: custom knurled scrubber thumb, rocker switch toggles (flagged in spec)
