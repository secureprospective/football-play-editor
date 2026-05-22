# Football Play Editor — Phase 2 of the Animation Roadmap

You are working on the Football Play Editor PWA. I am Christopher Campbell.
I direct, you execute. Always plan before writing code and wait for my
confirmation. Never use --no-verify. Never work on main directly.

## Step 0 — Read these files before doing anything else

1. /mnt/storage/claudebox/projects/football-play-editor/CLAUDE.md
2. /root/.claude/projects/-mnt-storage-claudebox-techfreedomministries/memory/MEMORY.md
3. /root/.claude/projects/-mnt-storage-claudebox-techfreedomministries/memory/user_christopher.md
4. /root/.claude/projects/-mnt-storage-claudebox-techfreedomministries/memory/reference_football_editor.md
5. /root/.claude/projects/-mnt-storage-claudebox-techfreedomministries/memory/feedback_plan_then_build.md

After reading: confirm Phase 1 is complete, report current state, then
present the Session 1 plan. Wait for my confirmation before writing code.

---

## Version context

TFM Playbook Lite (v1.0.0) is complete and tagged on main. That version
targets limited hardware and is feature-frozen. Phase 2 begins TFM Playbook
(full) — the full-featured version built on the same codebase. All Phase 2
work branches from v1.0.0. The existing editor must work identically after
every session.

---

## Roadmap context

Five-phase animation buildout:

- Phase 1 (complete): Football, Text, Highlight elements + per-segment route
  duration. Static data only, no animation wiring.
- Phase 2 (this): Animation foundation — player-route linkage, FieldCanvas
  split, animation store, animation runtime engine.
- Phase 3: Editor animation UI — scrub bar, event editor, wiring all element
  types.
- Phase 4: Present Mode animation — play and replay only. A toggle to disable
  animation entirely so the app does not load animation data when the coach
  does not need it. Keeps memory slim on cheap tablets.
- Phase 5: Polish + performance tuning on cheap Windows tablets.

The build target: a temporal editor where coaches scrub through time, a
shared animation runtime that drives both editor and Present Mode, and
three runtime contexts (card views = light, editor = heavy, Present = medium)
informing code-splitting.

---

## Design north star (applies to every session)

Teaching tool for kids. Every UX decision weighs: does this help the coach
teach? Maximum input — visual motion plus written reinforcement at the right
moment.

Two deployment contexts — do not conflate:
- Editing context: desktop/laptop, mouse + physical keyboard primary. Touch
  is a fallback. No on-screen keyboard handling needed.
- Playback context: cheap Windows handhelds, touch-first, sideline use,
  performance-critical. 44px touch targets, code-splitting, and the
  "build big, back off" principle exist to serve this context.

---

## Three animation design decisions — ANSWERED AND LOCKED

These are locked. Do not re-ask Christopher. Do not re-open them. Apply
them in every session without discussion.

1. **Playback model:** Simultaneous. All players move at once from the snap.
   No sequenced unfolding.

2. **Where animation lives:** Field editor + Present Mode.
   - Field editor: full animation controls (play, scrub, timing).
   - Present Mode: play and replay only. A toggle to disable animation
     entirely so the app does not load animation data when the coach does
     not need it — keeps memory slim on cheap tablets.

3. **Timing model:** Choreographed per-segment timing. Uses the duration field
   already on every route segment (built in Phase 1 Session 4). Each segment
   plays at its own speed — short routes are faster, deep routes take longer,
   pre-snap motion has its own pace. This matches real football timing.

⚑ FLAG — do not over-engineer timing controls before testing.
Christopher's note: "We might need to test for variations in the controls
like stops and starts or something unforeseen. Things might become clearer
when we get there." Build basic per-segment duration playback first. Let
real use reveal what additional controls are needed before adding them.

---

## Carry forward from Phase 1 — technical lessons

These are hard-won. Apply them in every session without being asked.

1. Never overlay HTML inputs on the Konva canvas for text entry. Use the
   inspector panel instead.
2. Empty or null props on Konva components corrupt the canvas layer. Always
   guard: `elements.filter(el => el.type === 'text' && el.content)` before
   mapping to Konva nodes.
3. autoFocus is unreliable in webview contexts. Use useRef + useEffect with
   explicit .focus() calls instead.
4. Every inspector input needs `onKeyDown={e => e.stopPropagation()}`. The
   canvas keyboard handler listens on window and will intercept
   Delete/Backspace from inspector inputs.
5. Always null-check getPointerPosition(): `const pos =
   stageRef.current?.getPointerPosition(); if (!pos) return;`. Returns null
   after theme change (Stage remount).
6. New element types always need: render guard, hitTest function,
   masterHitTest priority entry, groupStartRef entry, groupMove case,
   individual drag case, getElementsInRect case, and a default value that
   is immediately visible.
7. Layout in the 220px inspector panel: use flex-direction: column for
   multi-control rows — don't try to fit label + button + slider in one
   horizontal row.
8. The visibility stub pattern `({ startTime: null, endTime: null,
   fade: false })` worked cleanly in Phase 1. Apply the same pattern to
   any Phase 2 data stubs.

---

## Phase 2 mission

Phase 2 builds the architectural foundation that Phase 3 wires to the UI.
Nothing visible to coaches changes during Phase 2 — no scrub bar, no
playback controls, no moving players. Phase 2 delivers:

- The data model for player-route relationships
- A split FieldCanvas that separates render from interaction
- A separate animation Zustand store (isolated from undo/redo), with an
  animationEnabled flag for Present Mode's memory-slim toggle
- A pure animation runtime function that computes element positions at any
  given time

Each session is an independently deployable increment. The existing editor
must work identically after every session.

---

## Phase 2 sessions

### Session 1 — Player-route linkage (data model)

Goal: Create the data relationship animation requires. No linking UI yet —
just the data fields, migration, and a read-only inspector display. Phase 3
adds the interactive linking UI.

Design (one-to-one bidirectional optional reference):
- Each player gets `routeId: string | null` (default null)
- Each path gets `playerId: string | null` (default null)
- One player owns at most one route. Routes can be unowned (pre-snap motion
  routes may have no target player).

Data migration:
- Extend migratePath() to backfill `playerId: null` on existing paths
- In loadFromStorage(), backfill `routeId: null` on existing player elements
- Guard: only write if the field is undefined, never overwrite existing values

Inspector:
- Player inspector: read-only row "Route: None (wired in Phase 3)"
- Path inspector: read-only row "Player: None (wired in Phase 3)"
- No linking controls — Phase 3 only

Deletion guard: when an element is deleted, clear any routeId/playerId
references pointing to it. Add this to deleteElement() in the store.

Risk / focus testing:
- Data migration must not corrupt existing plays
- Stale reference guard on delete (player deleted → clear routeId on its
  route; route deleted → clear playerId on its player)

---

### Session 2 — FieldCanvas split (refactor)

Goal: Split FieldCanvas.jsx into focused modules. No new features — pure
refactor. Required before the animation runtime can drive the render layer
from a timeline.

This is the highest-risk session in Phase 2. Plan carefully, verify after
each extraction, and run `npm run build` after every change.

Target structure:

```
src/components/Stage/
  FieldCanvas.jsx        — thin shell: composes hook + renderer
  useFieldInteraction.js — custom hook: all pointer/keyboard events,
                           drag state, drawing state, marquee state,
                           placingHighlight state, hit testing calls
  FieldRenderer.jsx      — pure render: all Konva layer JSX,
                           renderPath, renderFootball, renderHighlight,
                           renderHighlightPreview, renderNodeHandles,
                           renderDrawingPreview, renderAllNodes,
                           renderScrimmage
```

Rules for the split:
- useFieldInteraction returns all state and handlers FieldCanvas needs to
  pass to FieldRenderer and the Stage event props
- FieldRenderer receives elements, colors, selectedId, marqueeIds,
  liveMarqueeIds, drawingPath, mousePos, presentMode, etc. as props
- No Zustand store calls inside FieldRenderer — pure render driven entirely
  by props
- All existing behavior preserved exactly — coaches must not notice anything
  changed

Why: animation will drive FieldRenderer from a timeline (currentTime →
computed positions → render). Only possible when render is decoupled from
interaction events.

Risk / focus testing:
- Every existing interaction must work after the split
- Stale closures in useFieldInteraction are the #1 risk — verify drag,
  marquee, drawing, and keyboard shortcuts
- Run the full interaction test: place player, draw route, drag, undo, redo,
  box-select, delete, change theme, switch present mode

---

### Session 3 — Animation store

Goal: Create the animation Zustand store. No rendering yet — just the store
shape, computed timeline, and verified isolation from editor store.

File: `src/store/useAnimationStore.js`

State:
```
isPlaying:        bool    (false)
currentTime:      number  (0.0, seconds)
playbackSpeed:    number  (1.0)
animationEnabled: bool    (true) — when false, Present Mode skips loading
                                   animation data entirely; keeps memory
                                   slim on cheap tablets
```

Actions:
```
play()            — set isPlaying: true
pause()           — set isPlaying: false
reset()           — set isPlaying: false, currentTime: 0
seek(t)           — set currentTime: t (clamped to 0..duration)
setSpeed(n)       — set playbackSpeed: n
toggleAnimation() — toggle animationEnabled; pause and reset if disabling
```

Computed (derived, not stored):
```
getDuration(elements) — sum of all segment durations across all paths in
                        the play. Returns 0 if no paths. Pure function,
                        not stored state.
```

Hard constraints:
- useAnimationStore NEVER imports useEditorStore
- useEditorStore NEVER imports useAnimationStore
- Animation playback state (isPlaying, currentTime) NEVER enters the
  undo/redo history stack
- The store resets (reset()) when the active play changes

Risk / focus testing:
- Import isolation — verify with grep that no cross-store imports exist
- getDuration with no paths (return 0, no crash)
- getDuration with pre-snap segments (include their duration — pre-snap is
  a timed hold, not skipped)
- animationEnabled: false should be a no-op on all playback actions

---

### Session 4 — Animation runtime engine

Goal: Implement the pure function that computes interpolated element
positions at any given time. No UI wiring — Phase 3 connects this to the
scrub bar. Phase 2 delivers a tested, standalone function.

File: `src/utils/animationRuntime.js`

Function signature:
```
computePositions(elements, currentTime)
→ Map<elementId, { x, y }>
```

Logic:
- All players interpolate simultaneously from time 0 — no sequencing.
- For each player with routeId set:
  - Find the path with id === routeId
  - Walk path segments using cumulative duration to find which segment
    currentTime falls in
  - Interpolate position along that segment (linear for straight, bezier
    for curve — reuse bezierCtrl from curveUtils.js)
  - Return interpolated { x, y } for that player
- For football with attachedToElementId set:
  - Position follows the carrying player's computed position
- For text and highlight: return undefined (visibility is Phase 3)
- For players with no routeId: return undefined (stays at stored position)

Edge cases to handle:
- currentTime = 0: return each player's route start point
- currentTime >= total duration: return each player's route end point
- Path with no segments: return undefined
- Pre-snap segments: player holds at segment start for the pre-snap
  duration, then travels
- Segment duration of 0: guard against divide-by-zero

⚑ FLAG — after basic playback is working, test for timing edge cases:
stops, direction changes, and multi-segment routes with uneven durations.
Do not add controls for these before seeing what real use reveals.
Christopher's note: "Things might become clearer when we get there."

Risk / focus testing:
- Multi-segment routes: cumulative time math must be correct
- Bezier interpolation at t=0 and t=1 must match exact start/end points
- Pre-snap segment handling (player holds position, not travels)
- Segment duration of 0 (guard divide-by-zero)
- Empty play: return empty Map, no crash

---

## Session workflow rules (per CLAUDE.md)

At the start of each session:
1. Confirm branch: `git branch`
2. Create session branch: `git checkout -b session/[description]`
3. Confirm clean working tree: `git status`
4. Run build: `npm run build`
5. Report results before proceeding
6. Present session plan, wait for confirmation, then write code

After each session:
- Clean build required before merge to main
- Update CLAUDE.md with what shipped + what's next
- Merge only after Christopher confirms behavior is correct

---

## What NOT to do in Phase 2

- Don't build the scrub bar or event editor UI — that is Phase 3
- Don't add playback controls to the field editor or Present Mode — Phase 4
- Don't make any elements move visually yet — Phase 2 is architecture only
- Don't wire useAnimationStore to FieldCanvas rendering — Phase 3
- Don't refactor the card views (useCardInteraction hook) — deferred
- Don't add route branching — deferred
- Don't touch Present Mode layout or controls — Phase 4
- Don't pre-optimize for performance — that is Phase 5
- Don't add timing variation controls (stops, starts, etc.) before testing
  basic playback — the flag exists for a reason

---

## After Phase 2 is complete

All three animation design decisions are already answered and locked —
do not re-ask Christopher in Phase 3.

Update CLAUDE.md with:
- Phase 2 sessions completed and what shipped
- The player-route linkage data model (fields, defaults, migration)
- The FieldCanvas split structure (file names, responsibilities)
- The animation store shape (state, actions, getDuration signature,
  animationEnabled flag)
- The animation runtime signature and edge case handling
- Pointer forward to Phase 3 (editor animation UI: scrub bar, event
  editor, wiring all element types)

Then provide the Phase 3 prompt.

---

## First action

Read the files in Step 0. Confirm Phase 1 is complete and all four sessions
shipped. Then present the Session 1 (player-route linkage) plan with
file-level specifics — migration strategy, store changes, inspector display.
Wait for confirmation before writing code.
