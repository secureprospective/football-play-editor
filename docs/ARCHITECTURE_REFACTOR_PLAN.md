# Architecture Refactor — Full Session Plan

## Goal

Fix three architectural issues before adding football animation:
1. **Event handler re-binding** (perf bug on cheap tablets)
2. **`useEditorStore` doing too much** (665 lines, mixes data + UI + history + persistence)
3. **`useFieldInteraction` doing too much** (600+ lines, pure helpers inlined)

Sequence is **dependent**: handlers can land before the store split or after, but the store split must happen before football animation (which adds new data-store actions).

## Outcome Definition

A successful session ends with:
- Konva pointer handlers are reference-stable across renders (no per-frame re-binding)
- Two stores: `useDataStore` (undoable + persistent) and `useUIStore` (transient UI state)
- Undo/redo continues to work exactly as before — same edge cases, same history depth
- Pure helpers extracted to `src/utils/fieldHelpers.js`
- All seven app pages still build, render, animate, and pass through Present Mode without regression
- Net code change is reduction or break-even — not a growth

---

## Pre-Session Checklist

1. Read CLAUDE.md fully
2. Confirm clean working tree: `git status`
3. Confirm on main and up to date: `git log -1` should be the latest cleanup commit
4. Create branch: `git checkout -b session/architecture-refactor`
5. Run baseline build: `npm run build` — must pass with no errors
6. Start dev server in background: `npm run dev` — keep running for visual verification at each checkpoint
7. Take a "before" inventory:
   - Note current bundle sizes (gzip)
   - Confirm Present Mode animation plays smoothly at 1x speed
   - Confirm undo/redo still works on element add/delete/move
   - Confirm theme switching works
   - Confirm export/import roundtrip preserves a play

If any baseline check fails, **stop**. Don't start the refactor with a broken starting point.

---

## Phase 1 — Handler Re-Binding Fix

**Estimated time:** 1-2 hours
**Risk level:** LOW (mechanical refactor, easy to verify, easy to roll back)
**File touched:** `src/components/Stage/useFieldInteraction.js`

### What we're changing

Inside event handlers, replace closure reads of frequently-changing state with `useEditorStore.getState()` and `useUIStore.getState()` calls. Wrap each handler in `useCallback` with empty deps so it's reference-stable. Memoize the returned `handlers` object once.

### Step-by-step

1. **Identify every value the handlers read from the hook's closure.**
   Grep `useFieldInteraction.js` for variables used inside `handlePointerDown`, `handlePointerMove`, `handlePointerUp`, `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`. Make a list. Separate into:
   - **Read-from-store** (e.g., `selectedId`, `activeTool`, `snapEnabled`) → switch to `getState()`
   - **Refs** (e.g., `positionsRef`, `dragStartRef`) → already stable, no change
   - **Local state setters** (e.g., `setHoveredId`, `setMarqueeRect`) → already stable from useState
   - **Stable callbacks** (props or imports) → already stable

2. **Replace closure reads with `getState()` calls inside each handler.**
   Top of each handler:
   ```js
   const { selectedId, activeTool, snapEnabled, ... } = useEditorStore.getState();
   ```
   Caveat: only do this for values used inside that specific handler. Don't pull the entire store into every handler.

3. **Wrap each handler in `useCallback` with empty deps `[]`.**
   This makes the function reference truly stable.

4. **Memoize the `handlers` object** with `useMemo`:
   ```js
   const handlers = useMemo(() => ({
     onPointerDown: handlePointerDown,
     onPointerMove: handlePointerMove,
     // ...
   }), [handlePointerDown, handlePointerMove, ...]);
   ```
   Since all the deps are now stable, this object is created exactly once.

5. **Return `handlers` from the hook** unchanged at the call site in FieldCanvas.

### Verification

Run through this checklist with the dev server open. Each step must pass before moving to the next:

- [ ] App builds cleanly: `npm run build`
- [ ] Click to add a player — works
- [ ] Click to add a football — works
- [ ] Click to add text — works
- [ ] Two-click highlight placement — works
- [ ] Draw a straight route — multi-segment, Enter to finish
- [ ] Draw a curved route — multi-segment, Enter to finish
- [ ] Mixed straight + curve route — works
- [ ] Drag player — moves smoothly
- [ ] Drag linked player + route together — both move
- [ ] Drag route — segments translate, linked player follows
- [ ] Marquee box-select — draws rect, selects elements inside, group-drag works
- [ ] Delete with Delete key — removes selected element
- [ ] Escape during drawing — cancels route
- [ ] Shift-key 45° constraint — works during drag and during route drawing
- [ ] Play animation in editor — players move, scrub bar works
- [ ] Enter Present Mode — animation plays
- [ ] Theme switch — all four themes update colors and re-render
- [ ] Undo/redo — Cmd-Z and Cmd-Shift-Z still work on all element operations

### Rollback strategy

If anything breaks and the cause isn't obvious within 15 minutes:
- `git checkout src/components/Stage/useFieldInteraction.js`
- Move to Phase 2 instead — Phase 1 can be revisited as its own focused session

### Commit checkpoint

Commit Phase 1 as a single commit before starting Phase 2:
```
refactor(stage): stabilize Konva pointer handlers via getState()
```

---

## Phase 2 — Store Split

**Estimated time:** 3-4 hours
**Risk level:** MEDIUM (touches many files, mechanical but tedious)
**Files touched:** `src/store/*`, every component that calls `useEditorStore`

### What we're changing

Split `useEditorStore` into two stores:
- **`useDataStore`** — playbooks, formations, plays, elements, history, persistence, export/import
- **`useUIStore`** — activeTool, selectedId, marqueeIds, drawingPath, placingHighlight, snapEnabled, presentMode, printMode, theme

Within each store, organize as Zustand slices (separate functions composed via spread in `create()`).

### Step-by-step

1. **Create the file layout first, then move state piece by piece:**
   ```
   src/store/
     useDataStore.js           — composes slices, exports default store + genId
     useUIStore.js             — composes slices, exports default store
     slices/
       data/
         dataCrudSlice.js      — playbooks/formations/plays CRUD
         elementOpsSlice.js    — add/update/delete/link element actions
         historySlice.js       — pushHistory, undo, redo
         persistenceSlice.js   — load, save, migrate
         exportImportSlice.js  — export/import JSON
       ui/
         toolSlice.js          — activeTool
         selectionSlice.js     — selectedId, marqueeIds
         drawingSlice.js       — drawingPath, placingHighlight
         modeSlice.js          — presentMode, printMode, snapEnabled
         themeSlice.js         — theme
   ```

2. **Build `useUIStore` first** — it's smaller and has no dependencies on other state.
   - Move each UI state field and its setters into the appropriate slice
   - Compose in `useUIStore.js`:
     ```js
     const useUIStore = create((set, get) => ({
       ...toolSlice(set, get),
       ...selectionSlice(set, get),
       ...drawingSlice(set, get),
       ...modeSlice(set, get),
       ...themeSlice(set, get),
     }));
     ```
   - Find/replace every `useEditorStore(s => s.activeTool)` → `useUIStore(s => s.activeTool)` (and same for every UI field)
   - Build check after this step — must pass before moving on

3. **Build `useDataStore` second:**
   - Move data CRUD, element ops, history, persistence, export/import into slices
   - Compose in `useDataStore.js`
   - Update every remaining `useEditorStore(s => ...)` call to `useDataStore(s => ...)`
   - Build check after this step

4. **Delete `useEditorStore.js`** once nothing imports from it.

5. **Update `genId` export location** — move to `useDataStore.js` or to `src/utils/ids.js`. Update all imports.

6. **Verify persistence still works:**
   - The `subscribe` + `localStorage.setItem` logic moves to `persistenceSlice.js` in the data store
   - The UI store does NOT persist (theme is an exception — see contingency below)

### Verification

Same functional checklist as Phase 1, PLUS:

- [ ] Refresh the page — playbook data persists
- [ ] Refresh the page — UI state resets (selectedId, activeTool reset is fine, expected)
- [ ] **Theme persists across refresh** — see contingency if this fails
- [ ] Undo stack starts clean after refresh (no UI state contaminating undo history)
- [ ] Export playbook JSON, clear localStorage, import — full roundtrip works

### Contingency — theme persistence

Theme is technically UI state but users expect it to persist across refreshes. Two options:

**Option A (recommended):** Keep theme in `useUIStore`, add a small `subscribe` listener in `useUIStore.js` that persists *only* `theme` to localStorage under its own key. Theme survives refresh, but selection/tool/modes still reset.

**Option B (alternative):** Move theme into `useDataStore` as part of the playbook record. Per-playbook themes. Bigger feature change — defer unless Christopher wants it.

Default to Option A unless Christopher says otherwise.

### Contingency — undo/redo regression

If undo/redo breaks after split (most likely cause: history snapshot capturing wrong tree):

1. Inspect `historySlice.js` — confirm it snapshots `useDataStore.getState().playbooks` (or equivalent), not the full store
2. Confirm `pushHistory` is called in element op actions, not in UI actions
3. If still broken after 30 minutes — checkpoint with a partial commit, revisit history in a focused follow-up session

### Contingency — too many files touched

If the find/replace becomes overwhelming:

1. Stop. Don't continue blindly.
2. Take the alternate approach: **keep one store, use slices internally.**
   - Single `useEditorStore.js` that composes slices from `src/store/slices/*`
   - Same code organization, no API surface change for components
   - Loses the UI/data separation, but gains code maintainability
   - Acceptable fallback if the full split is too risky mid-session

### Commit checkpoint

Commit Phase 2 as one or two commits depending on natural boundaries:
```
refactor(store): split into useDataStore + useUIStore
```

Or split as:
```
refactor(store): introduce useUIStore for transient UI state
refactor(store): extract useDataStore from useEditorStore
```

---

## Phase 3 — Pure Helper Extraction

**Estimated time:** 1-1.5 hours
**Risk level:** LOW (mechanical, easy to verify)
**Files touched:** `src/components/Stage/useFieldInteraction.js`, new `src/utils/fieldHelpers.js`

### What we're changing

Extract pure (no-React) functions from `useFieldInteraction.js` into a new utility module. The hook stays focused on state, effects, and handlers.

### Functions to move to `src/utils/fieldHelpers.js`

- `getPathTailPoint(path)`
- `getElementsInRect(rect, elements)`
- `resolveDragDelta(fromPos, toPos, shiftHeld)` — adapt signature to accept shiftHeld as arg
- `resolveRoutePoint(rawPos, fromPoint, shiftHeld, snapIncrement, snapEnabled)` — same
- `resolvePreviewPos(rawPos, fromPoint, shiftHeld)` — same

### Step-by-step

1. Create `src/utils/fieldHelpers.js`
2. Move each function, ensuring all dependencies are passed as args (not closed over)
3. Import them in `useFieldInteraction.js`
4. Delete the inline versions
5. Build check
6. Run the full functional checklist again

### Verification

Same functional checklist as Phase 1.

### Commit checkpoint

```
refactor(stage): extract pure field helpers to utils
```

---

## Phase 4 — Drawing State Machine (OPTIONAL — only if time remains)

**Estimated time:** 2-3 hours
**Risk level:** MEDIUM (state machine extraction has gotchas)

This is the next step IF Phase 1, 2, and 3 are all clean and Christopher has time. Otherwise defer to a follow-up session.

### What we'd do

Extract route drawing into its own hook `useDrawingState.js`:
- Owns `drawingPath` state and the click sequence state machine
- Exposes `startDrawing()`, `addPoint(pos)`, `finishDrawing()`, `cancelDrawing()`
- Called from `useFieldInteraction` which only orchestrates

### Why this is the riskiest part

Drawing state has a lot of edge cases:
- Mid-route undo
- Branching from an existing path
- Curve vs straight tool switch mid-route
- First node snap to player center on link

If extracted carelessly, edge cases regress. Defer if any other phase ran long.

---

## Test Protocols

### Functional checklist (run after each phase)

This is the regression suite. Run it manually. Every box must check:

1. **Adds work:** player, football, text, highlight, route (straight, curve, mixed)
2. **Drags work:** player, route, linked pair, marquee group
3. **Drawing works:** click sequence, Enter to finish, Escape to cancel, branching from existing path
4. **Selections work:** click to select, marquee box-select, multi-select drag
5. **Keyboard works:** Delete, Escape, Shift constraint, Enter to finish route
6. **Undo/redo works:** every action above is undoable, redo restores
7. **Animation works:** scrub bar moves players, Play/Pause/Reset cycle in editor and Present Mode
8. **Visibility works:** text and highlight visibility timing applies in animation
9. **Persistence works:** refresh preserves playbook, undo stack clears
10. **Export/import works:** JSON roundtrip preserves a play
11. **Themes work:** all four themes switch, persist across refresh

If any box fails, stop and fix before moving on. Don't ship a broken refactor.

### Performance verification (after Phase 1)

This is the perf bug we're actually fixing. Verify it:

1. Open Chrome DevTools → Performance tab
2. Start recording
3. Click Play in Present Mode, let the animation run 5 seconds
4. Stop recording
5. Look at the flame chart for `useFieldInteraction` re-renders or Konva re-binding work
6. Expected after Phase 1: handler functions appear stable across the timeline, no per-frame setup

If you can't see a measurable difference, the fix may have missed a closure variable. Re-audit which state is read inside handlers.

---

## Contingency Decision Tree

**At any point, if a phase is going off the rails:**

```
Are tests passing?
├── YES — commit checkpoint, continue
└── NO — Can you identify the root cause in 15 minutes?
         ├── YES — fix and re-verify
         └── NO — Roll back this phase, commit completed phases, end session
```

**Specific contingencies covered above:**

- Phase 1 breaks pointer events → revert one file, move to Phase 2
- Phase 2 store split overwhelms → fall back to slices within one store
- Phase 2 theme stops persisting → Option A (single-key persist) or Option B (per-playbook)
- Phase 2 undo regresses → partial commit, focused follow-up session
- Phase 3 not started → fine, it's the lowest-priority phase
- Phase 4 not started → expected, only if everything else lands

---

## Success Criteria

**Minimum acceptable:** Phase 1 complete and merged.
**Target:** Phase 1 + Phase 2 complete and merged.
**Stretch:** Phase 1 + Phase 2 + Phase 3 complete and merged.

The football animation prompt at `docs/FOOTBALL_ANIMATION_PROMPT.md` should be re-checked after Phase 2 to update file paths it references.

---

## Session-End Protocol

1. Run full functional checklist one final time on the deployed dev server
2. `npm run build` — must pass clean
3. Update CLAUDE.md with phase completions
4. Update `docs/FOOTBALL_ANIMATION_PROMPT.md` if store paths changed
5. Commit any docs updates
6. Merge `session/architecture-refactor` to main
7. Push to origin
8. Cloudflare Pages auto-deploys
9. Spot-check live site once deployment completes

Update memory:
- Note that the store is split (so future sessions know the architecture)
- Note any deferred work (e.g., "Phase 4 drawing extraction deferred")
