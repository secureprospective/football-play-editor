# Audit Cleanup & Hardening — Implementation Plan

**Trigger phrase:** `football`
**Intended executor:** Sonnet (in Claude Code, VSCode + ClaudeBox loop)
**Author:** Opus (audit + plan produced 2026-05-23)
**Source audit:** `docs/AUDIT_PROMPT.md` (the audit was completed; this plan executes the 15 proposals from it)

This plan executes the cleanup and hardening proposals from the full codebase audit. Christopher directs and verifies. Every phase has a build gate, a smoke gate, and a screenshot gate where visual regression is possible. Nothing ships without a clean build and Christopher's confirmation.

---

## Pre-flight — Read these first (Sonnet, mandatory)

| File | Why |
|---|---|
| `CLAUDE.md` (repo root) | Ground truth for project state |
| `docs/AUDIT_PROMPT.md` | Context for what this plan executes against |
| `/mnt/storage/claudebox/Christopher_in_Context.md` | Who Christopher is, how to communicate, what breaks collaboration |
| `/mnt/storage/claudebox/VSCode_workflow.md` | Branch rules, build-before-commit, Troubleshooting Gate Stage 1 (screenshot bridge to Claude.ai) |

**Hard rules from these docs that govern this plan:**

1. Branch before every session — never work on `main`.
2. `npm run build` must pass clean before every commit.
3. Never use `--no-verify`.
4. Christopher confirms the plan before any file is touched. Christopher confirms each commit. Christopher confirms visual state before merge.
5. When a problem is visual and cannot be diagnosed from file contents → **trigger Troubleshooting Gate Stage 1** (output the screenshot template, stop, wait for Christopher to return Claude.ai output).
6. Direct communication: problem → risk → fix. No preambles, no summary bows, no praise.
7. Do not guess. If uncertain, say so and ask before acting.

---

## Session start protocol (every phase begins with this)

```bash
cd /mnt/storage/claudebox/projects/football-play-editor
git checkout main && git pull
git status
git checkout -b session/<phase-slug>
npm run build
```

Confirms clean tree, clean build, on the right branch before any edit.

**Gate 0:** Report current branch, working tree status, and build result. Wait for Christopher's "go" before touching files.

---

## Phase map

| Phase | Branch | Risk | Sonnet difficulty | Christopher visual check needed? |
|---|---|---|---|---|
| A — Mechanical cleanup | `session/audit-cleanup-a-deadcode` | None | Easy | No (build only) |
| B — Visible bug fixes | `session/audit-cleanup-b-bugs` | Low | Easy | **Yes** (Stage 1 gate built in) |
| C — Slider history fix | `session/audit-cleanup-c-slider-history` | Medium | Medium | **Yes** (slider feel) |
| D — Selector sweep | `session/audit-cleanup-d-selectors` | Medium | Medium-Hard | **Yes** (per-area smoke test) |
| E — Animation runtime hoist | `session/audit-cleanup-e-animation-hoist` | Medium-High | Hard | **Yes** (Stage 1 gate built in) |
| F — Storage safety net | `session/audit-cleanup-f-storage-warn` | Low | Easy | No (text-only UI) |
| Deferred | — | High | — | Not in this plan |

Run A → B → C → D → E → F in order. Do not skip ahead. Each phase merges to `main` only after Christopher's visual confirmation, then Cloudflare auto-deploys.

---

## PHASE A — Mechanical cleanup (zero risk)

**Goal:** Delete dead code, unused destructures, stale assets. No behavior changes anywhere.

**Branch:** `session/audit-cleanup-a-deadcode`

### A1 — Delete dead CSS

| Location | Delete |
|---|---|
| `src/components/Stage/FieldCanvas.css:13-35` | `.arc-drawing-banner` + `.arc-drawing-banner kbd` (arc-drawing UI was removed in Phase 6) |

### A2 — Delete unused destructures

| File:line | Remove from destructure |
|---|---|
| `src/App.jsx:22` | `togglePresentMode` |
| `src/views/FormationView.jsx:88` | `goBack` |
| `src/views/PlayView.jsx:97` | `goBack` |
| `src/components/Stage/useFieldInteraction.js:68-72` | `addElement`, `updateElement`, `updateElements`, `clearSelection`, `pushHistory`, `setMarqueeIds` |
| `src/components/Stage/useFieldInteraction.js:77-79` | `snapEnabled`, `snapIncrement`, `setDrawingPath`, `setActivePathId` |

**Keep:** `setSelectedId` (used at line 128), `clearMarquee` (line 160), `finishDrawing` (line 156), `cancelDrawing` (line 159), `selectedId` (used in cursor logic and useEffect), `marqueeIds` (used in cursor logic), `activeTool` (used in useEffect and isBoxSelect), `presentMode` (used in cursorStyle and return), `drawingPath` (returned to render), `scrimmageVisible` (returned to render), `getActivePlay` (called to derive `elements`).

**Verification after A2:**

```bash
git diff --stat
grep -n 'togglePresentMode' src/App.jsx
grep -n 'goBack' src/views/FormationView.jsx src/views/PlayView.jsx
grep -n 'addElement\b\|updateElements\b\|setMarqueeIds\b' src/components/Stage/useFieldInteraction.js
```

Expect: removed names appear 0 times in their files outside `getState()` calls.

### A3 — Drop `export` from `migrateFootball`

`src/store/useDataStore.js:66` — change `export function migrateFootball` to `function migrateFootball`. Only `migrateElements` (same module) uses it.

Verify:

```bash
grep -rn 'migrateFootball' src/
```

Expect: 2 hits, both inside `useDataStore.js`. No other importer.

### A4 — Delete unused assets

```bash
rm src/assets/field_texture.png src/assets/hero.png src/assets/react.svg src/assets/vite.svg
grep -rn 'field_texture\|hero\.png\|react\.svg\|vite\.svg' src/ index.html public/
```

Expect: no hits.

### A5 — Extract repeated inline styles to CSS

In `src/views/Views.css`, add:

```css
.card-delete-label {
  font-size: 13px;
  color: var(--color-danger);
  font-weight: 600;
  flex: 1;
}
.inline-input-row-card {
  border-top: 1px solid var(--color-border);
  border-bottom: none;
  padding: 8px;
}
```

The same inline styles repeat in `PlaybookView.jsx:58, 75`, `FormationView.jsx:47, 61`, `PlayView.jsx:55, 69`.

Then replace inline `style={...}` with `className="card-delete-label"` and `className="inline-input-row inline-input-row-card"` at those 6 sites.

### Phase A verification gate

```bash
npm run build
```

Build must pass clean. Bundle size should drop slightly.

**Christopher's check:** open file diff in VSCode. Confirm only deletions and the one CSS class addition. No logic changed. Confirm "go to commit".

**Commit message:**

```
chore(audit): mechanical cleanup — dead CSS, unused destructures, stale assets

- Remove arc-drawing-banner CSS (UI removed in Phase 6)
- Remove unused destructured store values across 5 files
- Drop export from migrateFootball (internal use only)
- Delete unused src/assets/*
- Extract repeated inline styles to Views.css classes
```

**Sonnet difficulty:** Easy. Every change is mechanical and grep-verifiable. No judgment calls.

---

## PHASE B — Visible bug fixes

**Goal:** Fix the three user-visible defects from the audit. Each one needs Christopher's visual confirmation.

**Branch:** `session/audit-cleanup-b-bugs`

### B1 — Fix missing `--color-surface`

Three lines in `src/components/PrintMode/PrintMode.css` reference a CSS variable that is never defined in any theme:

| Line | Selector | Fix |
|---|---|---|
| 73 | `.print-toggle-btn` | `background: var(--color-surface);` → `background: var(--color-panel);` |
| 100 | `.print-action-btn` | same |
| 134 | `.print-queue-tile` | same |

Use `--color-panel` rather than `--color-panel-alt` — matches the existing `.anim-btn` and `.tb-btn` panel-tone convention.

### B2 — Add `-webkit-backdrop-filter` for Safari < 18

`src/components/PresentMode/PresentOverlay.css` — two places:

| Line | Add line directly above the existing `backdrop-filter` |
|---|---|
| 18 (inside `.present-overlay-inner`) | `-webkit-backdrop-filter: blur(4px);` |
| 182 (inside `.present-scrub-row`) | `-webkit-backdrop-filter: blur(4px);` |

### B3 — Fix `printQueue` stale snapshot

**Problem:** `printQueue` stores `elements` snapshots at queue-add time. If a coach edits a play after queueing, the print shows the old version.

**Fix:** Store only IDs in the queue. Resolve elements live at render time.

**Files:** `src/store/useUIStore.js`, `src/views/PlayView.jsx`, `src/components/PrintMode/PrintSheet.jsx`, `src/components/PrintMode/PrintStaging.jsx`.

**Step B3.1 — Shrink the queue item shape in `useUIStore.js`:**

`togglePrintQueueItem` currently accepts the full item. Keep the function signature but only store `{ playId, formationId, playbookId, name }`. Drop `elements` and `formationName` from what gets pushed onto `printQueue`.

**Step B3.2 — Update the call site in `PlayView.jsx:145`:**

Remove `elements: pl.elements` and `formationName: formation?.name || ''` from the payload (keeping the function call shape intact for the toggle).

**Step B3.3 — Resolve live in `PrintSheet.jsx`:**

Add a helper at the top of the module:

```jsx
function resolvePlay(item, playbooks) {
  const pb = playbooks.find(p => p.id === item.playbookId);
  const fm = pb?.formations.find(f => f.id === item.formationId);
  const pl = fm?.plays.find(p => p.id === item.playId);
  return pl ? { ...item, elements: pl.elements, name: pl.name } : null;
}
```

Keeps the rest of `PrintSheet` working with `item.elements` and `item.name` unchanged.

In `PrintSheet()` (around line 105), pull `playbooks` from the data store and map `printQueue` through `resolvePlay`, filtering out nulls (deleted plays):

```jsx
const playbooks = useDataStore(s => s.playbooks);
const resolved = printQueue.map(it => resolvePlay(it, playbooks)).filter(Boolean);
```

Pass `resolved` to `DiagramSheet` / `TextSheet` instead of `printQueue`.

**Step B3.4 — Same resolution in `PrintStaging.jsx`** (it uses `item.elements` at line 53).

### Phase B verification gates

**Build:**

```bash
npm run build
```

**B1 visual check — Stage 1 gate trigger:**

```
TROUBLESHOOTING GATE — SCREENSHOT NEEDED
Take a screenshot of: Playbook view with Print Mode toggled ON, showing the print staging area (Text/Plays toggle, Youth/Adult toggle, Clear, Print PDF buttons).
Compare against pre-fix state — buttons should now have a visible panel-colored background instead of being invisible/transparent.

If buttons still look broken, take it to Claude.ai with this prompt:
"Print staging buttons have no background. Theme variable was --color-surface (undefined). I changed to --color-panel. Here's the current rendered state vs. expected dark-panel background. Diagnose."
```

**B2 visual check:** Skip unless Christopher has Safari < 18 access. On Chrome/Firefox the unprefixed property works — the prefix is a fallback. No visual change in tested browsers.

**B3 verification (the important one — Stage 1 gate):**

Manual test sequence Christopher runs:

1. Toggle Print Mode on.
2. Add a play to the print queue.
3. Open that play (exit Print Mode → navigate in → edit, e.g., move a player).
4. Return to Playbook view, re-enable Print Mode.
5. Confirm the queue tile thumbnail shows the **updated** play state.
6. Click "Print PDF" — confirm the printed cards reflect the **updated** play.

If step 5 or 6 still shows the old state:

```
TROUBLESHOOTING GATE — SCREENSHOT NEEDED
Take a screenshot of: the print queue tile after editing the queued play.
Take it to Claude.ai with this prompt:
"Print queue tile is still showing pre-edit play after my live-resolve refactor. Stores: useDataStore (playbooks), useUIStore (printQueue with playId/formationId/playbookId only). Selector likely stale. Diagnose."
```

**Commits (B1+B2 together, B3 separate):**

```
fix(print): use --color-panel instead of undefined --color-surface

PrintMode.css referenced --color-surface which is not defined in any
theme. Print-staging buttons rendered with no background. Use
--color-panel which matches the existing toolbar/anim-bar panel tone.
```

```
fix(present): add -webkit-backdrop-filter for Safari < 18

PresentOverlay scrub row and bottom bar relied on backdrop-filter
without the -webkit- prefix. Safari < 18 dropped the blur silently;
text legibility still worked because of the 0.55 alpha background,
but the intended frosted effect was missing.
```

```
fix(print): resolve play elements live to fix stale snapshot

printQueue stored {elements} at queue-add time, so edits to a queued
play didn't appear in the print output. Now stores only IDs and
resolves elements from useDataStore at render time. Deleted plays
drop out of the queue silently.
```

**Sonnet difficulty:** Easy on B1/B2. Medium on B3 — the resolver pattern is standard React/Zustand but requires touching 4 files together.

---

## PHASE C — Slider history bloat fix

**Goal:** Stop the duration slider from generating ~50 history entries and 50 localStorage writes per drag.

**Branch:** `session/audit-cleanup-c-slider-history`

### C1 — Add a non-history-pushing variant of `updateSegment`

`src/store/useDataStore.js` — add a new action next to `updateSegment` (around line 387):

```javascript
updateSegmentLive: (pathId, segmentId, changes) => {
  const { activePlaybookId, activeFormationId, activePlayId, getActivePlay } = get();
  const play = getActivePlay();
  if (!play) return;
  get().updatePlay(activePlaybookId, activeFormationId, activePlayId, {
    elements: play.elements.map(el => {
      if (el.id !== pathId) return el;
      return { ...el, segments: el.segments.map(seg => seg.id === segmentId ? { ...seg, ...changes } : seg) };
    }),
  });
},
```

Identical to `updateSegment` minus `pushHistory()`. The slider drags through `updateSegmentLive`; pointer-up commits with one explicit `pushHistory()`.

### C2 — Wire the duration slider to use it with pointer-up commit

In `src/components/Inspector/Inspector.jsx` around line 596-619 (the segment duration range row), pull `updateSegmentLive` and `pushHistory` from the store, then:

- `onChange` on the range input → call `updateSegmentLive(selected.id, seg.id, { duration: ... })`
- `onPointerUp` and `onTouchEnd` on the range input → call `pushHistory()`
- For the number input next to it: `onChange` → `updateSegmentLive`; `onBlur` → `pushHistory()`
- The `onWheel` handler at line 610 stays the same logically but switch the action call to `updateSegmentLive` followed by an immediate `pushHistory()` (wheel is discrete clicks, not a drag).

**Decision point for Sonnet:** if the slider feels laggy after C2 because of the per-tick re-render of the whole Inspector, the right next step is the selector sweep in Phase D, not more tuning here. Do not over-tune. Commit what works and move on.

### Phase C verification gate

**Build:**

```bash
npm run build
```

**Functional test Christopher runs:**

1. Open any play with at least one route.
2. Click the route to select it.
3. Drag the duration slider on segment 1 from 0.1 to 3.0 and back.
4. Press Undo once. Verify it goes back **one step** (not 50).
5. Confirm the value persists after a page reload.

**Stage 1 gate trigger** if undo behaves wrong after C2:

```
TROUBLESHOOTING GATE — SCREENSHOT NEEDED
Take a screenshot of: Inspector showing the segment with current duration value, and the undo button state.
Take it to Claude.ai with this prompt:
"After refactoring duration slider to draft+commit pattern, undo is [eating multiple steps / not reverting / reverting too far]. Here's the state. Tell me what to fix."
```

**Commit:**

```
perf(inspector): stop duration slider from spamming history + localStorage

Slider was calling updateSegment on every onChange, which pushHistory'd
and persisted to localStorage 50+ times per drag. Now drafts through
updateSegmentLive during the drag and commits a single history entry
on pointer/touch up. Same pattern as the existing delay-input draft.
```

**Sonnet difficulty:** Medium. The pattern is proven (delay input already uses it). Risk is forgetting one of the three input variants (range, number, wheel) and producing inconsistent history.

---

## PHASE D — Selector sweep

**Goal:** Replace whole-store subscriptions with selectors so editing one thing doesn't re-render the whole app.

**Branch:** `session/audit-cleanup-d-selectors`

### Decision before starting

This phase has the most files touched. Split into sub-commits, one per surface, so any regression is bisectable.

### D1 — Add `useShallow` pattern

Zustand v5 exports `useShallow` from `zustand/shallow`. Pattern for grabbing multiple values:

```javascript
import { useShallow } from 'zustand/shallow';

const { a, b, c } = useDataStore(useShallow(s => ({
  a: s.a, b: s.b, c: s.c,
})));
```

Actions (functions) have stable references and can be grabbed via `useDataStore.getState()` outside render, or kept inside `useShallow` — both work. Prefer `useShallow` for symmetry.

### D2 — Convert files in this order (commit per file)

| Order | File | Currently subscribes to |
|---|---|---|
| 1 | `src/App.jsx` | `viewMode`, `activePlayId`, `presentMode`, `theme` |
| 2 | `src/components/AppHeader/AppHeader.jsx` | `goBack`, `theme` |
| 3 | `src/components/Toolbar/Toolbar.jsx` | ~15 actions + a few state values |
| 4 | `src/components/AnimationBar/AnimationBar.jsx` | animation state + `getActivePlay`, `activePlayId` |
| 5 | `src/components/PresentMode/PresentOverlay.jsx` | several from each store |
| 6 | `src/components/Inspector/Inspector.jsx` | many from `useDataStore`; selector list needs care |
| 7 | `src/views/PlaybookView.jsx`, `FormationView.jsx`, `PlayView.jsx` | playbook tree + actions |
| 8 | `src/components/Stage/useFieldInteraction.js` | the hook still subscribes broadly even after Phase A cleanup |

### D3 — Per-file recipe

For each file:

1. Identify which destructured values are state (re-render when changed) vs. actions (stable references).
2. Wrap state reads in `useShallow`.
3. Leave action reads either inside the same `useShallow` block or move to a one-time `useDataStore.getState()` call.
4. **Do not change what the component does.** No behavior changes in this phase.

### Phase D verification gate (after each file)

```bash
npm run build
```

Build must pass after every file. Do not batch.

**After each file commits, Christopher runs a smoke test for that surface:**

| File | Smoke test |
|---|---|
| App.jsx | Navigate Playbook → Formation → Play → Field, present mode toggle, theme switch |
| AppHeader | Back button works on each view |
| Toolbar | Undo/Redo, Flip H/V, Snap toggle, LOS toggle, Export, Import, Clear (arm + confirm + cancel), Present toggle |
| AnimationBar | Anim toggle, play/pause/reset, scrub, speed select, play change resets time |
| PresentOverlay | Prev/next play, play/pause/replay cycle, scrub, speed, anim toggle, panel hide/show, Edit exit, crumb exit |
| Inspector | Each element type (player, path, football, text, highlight) shows its inspector, edits persist, color buttons work, segment list shows |
| Views (3) | Add, rename, duplicate, delete (arm + confirm + cancel), drag reorder, print mode toggle (Playbook), print card select (Play) |
| useFieldInteraction | Every drawing tool, drag (player/route/group), marquee, intercept node drag, keyboard delete, undo/redo |

**Stage 1 gate triggers in this phase** — fire when:

- A button stops responding after a selector change.
- An inspector field doesn't update when the underlying element changes.
- The active play change doesn't reset something it used to.

Template:

```
TROUBLESHOOTING GATE — SCREENSHOT NEEDED
Take a screenshot of: the component that's behaving wrong, with the relevant store value visible if possible (devtools console).
Take it to Claude.ai with this prompt:
"After converting <FILE> from useStore() to useShallow selectors, <SPECIFIC BEHAVIOR> stopped working. Component reads <STATE LIST> from <STORE NAME>. What did I miss in the selector?"
```

**Commits — one per file, message pattern:**

```
perf(<area>): convert to useShallow selectors to scope re-renders

<area> was subscribing to the full store, re-rendering on every
action elsewhere in the app. Switched to useShallow on the values
actually read. No behavior change.
```

**Sonnet difficulty:** Medium-Hard. The recipe is mechanical but missing one stale dependency produces silent UI bugs. Strong commit-per-file discipline keeps blast radius bounded.

**Escalation rule:** If Sonnet trips on more than two files in this phase (build fails or smoke test catches a regression that Sonnet can't immediately explain), stop and ask Christopher to escalate to Opus for the remaining files. Do not push through with shaky changes.

---

## PHASE E — Animation runtime hoist

**Goal:** Stop computing `snapTime` three times per animation frame.

**Branch:** `session/audit-cleanup-e-animation-hoist`

### E1 — Make `isFootballInFlight` accept an optional pre-computed snapTime

`src/utils/animationRuntime.js` line 207:

```javascript
export function isFootballInFlight(football, elements, currentTime, snapTime = null) {
  if (currentTime <= 0) return false;
  const journey = football.journey;
  if (!journey?.snapToPlayer) return false;
  const st = snapTime ?? getSnapTime(elements);
  if (currentTime > st && currentTime < st + SNAP_REAL_SECS) return true;
  // ...rest unchanged, replacing snapTime references with st
}
```

Backward-compatible: callers that don't supply `snapTime` still work.

### E2 — Compute once per frame in `useAnimationLoop`

In `src/components/Stage/useAnimationLoop.js` — the rAF tick at line 37 already computes positions. Compute `snapTime` once next to it and stash it.

Add `snapTimeRef`. Update it in both the rAF tick and the scrub effect. Return both from the hook.

Pattern:

```javascript
const positionsRef = useRef(new Map());
const snapTimeRef  = useRef(0);

function updateFrame(elements, time, speed) {
  snapTimeRef.current  = getSnapTime(elements);
  positionsRef.current = computePositions(elements, time, speed);
  forceRender(n => n + 1);
}
```

Replace the two existing `updatePositions(computePositions(...))` calls with `updateFrame(elements, time, playbackSpeed)`.

Return `{ positionsRef, snapTimeRef }` from the hook.

### E3 — Wire through `useFieldInteraction` → `FieldCanvas` → `FieldRenderer`

`useFieldInteraction.js` already returns `positions`. Add `snapTime` next to it.

`FieldCanvas.jsx` already passes `positions` to `FieldRenderer`. Pass `snapTime` too.

`FieldRenderer.jsx` line 189 — pass `snapTime` to `isFootballInFlight`:

```jsx
const isFlashing = currentTime > 0 && isFootballInFlight(el, elements, currentTime, snapTime);
```

### E4 — `computePositions` already efficient

Inside `computePositions` (line 235), it already calls `getSnapTime(elements)` once on line 246 and uses that local — keep as-is. The savings come from `isFootballInFlight` not redoing the walk every render.

### Phase E verification gate

**Build:**

```bash
npm run build
```

**Animation regression suite Christopher runs — this is the gate:**

1. Open a play with a football, a snap target, and a handoff event.
2. Hit play. Confirm:
   - Football sits at LOS through pre-snap.
   - Snaps to recipient at snap time.
   - Handoff fires at the right time, ball follows new carrier.
   - In-flight ring appears during snap and during handoff pulse.
3. Add a pass event. Place an intercept node on the field. Hit play. Confirm:
   - Ball travels in straight line from thrower to intercept node.
   - In-flight ring shows during flight only.
4. Add a toss event. Confirm same with slightly slower flight.
5. Scrub timeline manually. Confirm ring appears/disappears at the right times.

**If any of these break, immediately trigger Stage 1:**

```
TROUBLESHOOTING GATE — SCREENSHOT NEEDED
Take a screenshot of: the field at the moment behavior is wrong, with the scrub bar visible showing currentTime.
Take it to Claude.ai with this prompt:
"After hoisting snapTime out of isFootballInFlight, [SPECIFIC BEHAVIOR] is wrong. snapTime is now passed as a prop from useAnimationLoop → useFieldInteraction → FieldCanvas → FieldRenderer → isFootballInFlight. Diagnose where the value is becoming stale or wrong."
```

**Commit:**

```
perf(animation): hoist snapTime out of per-frame recompute

isFootballInFlight was calling getSnapTime() every render, on top of
computePositions doing it once per rAF tick — so a play frame walked
elements 3x for the same value. snapTime now computed once in
useAnimationLoop and passed through to FieldRenderer.
```

**Sonnet difficulty:** Hard. Animation runtime is the most regression-prone surface in the codebase (CLAUDE.md flags it explicitly). The change is small but threads through four files.

**Escalation rule:** If the animation regression suite catches any miss that Sonnet cannot fix in one attempt, escalate to Opus for this phase. Do not push a half-working animation runtime — it's the marquee feature.

---

## PHASE F — Storage safety net

**Goal:** Surface the silent localStorage `QuotaExceededError` failure mode.

**Branch:** `session/audit-cleanup-f-storage-warn`

### F1 — Detect quota error in `saveToStorage`

`src/store/useDataStore.js:119` — `saveToStorage` currently swallows all errors. Extend it to publish the error state.

Add to the store state:

```javascript
storageError: null,  // null | 'quota' | 'unknown'
```

In `saveToStorage`:

```javascript
function saveToStorage(playbooks, setState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playbooks));
    setState({ storageError: null });
  } catch (e) {
    const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22;
    setState({ storageError: isQuota ? 'quota' : 'unknown' });
  }
}
```

Then update `_persist` to pass `set` through.

### F2 — Surface in `PlaybookView`

At the top of `PlaybookView.jsx` (above the card grid), render a banner when `storageError` is non-null:

```jsx
const storageError = useDataStore(s => s.storageError);
// ...
{storageError === 'quota' && (
  <div className="storage-warning">
    Storage full — recent edits were not saved. Export your playbook
    and remove unused playbooks to free space.
  </div>
)}
{storageError === 'unknown' && (
  <div className="storage-warning">
    Storage save failed. Export your playbook to avoid losing work.
  </div>
)}
```

Add the CSS class to `Views.css` — yellow background, danger border, top of view.

### Phase F verification gate

**Build:**

```bash
npm run build
```

**Functional test Christopher runs (optional — only if interested in confirming the path):**

1. In devtools, run `localStorage.clear()`, then set a 4.9 MB string to force near-full state.
2. Add a play. Confirm the banner appears.
3. Delete the test entry from localStorage, refresh. Confirm banner disappears.

This is awkward to test in practice. Acceptable to commit on build-clean alone since the failure mode is rare and the worst case if the detection is wrong is just a stray banner.

**Commit:**

```
feat(storage): surface localStorage quota errors instead of swallowing

saveToStorage previously caught all errors silently. QuotaExceededError
now sets storageError in the store; PlaybookView renders a warning
banner so coaches know to export and prune before losing work.
```

**Sonnet difficulty:** Easy.

---

## Cross-phase rules (Sonnet must follow)

1. **One phase per session.** Do not chain phases. Each phase needs Christopher's verification gate before the next starts.
2. **One sub-commit per logical change.** Phase D commits per file. Phase B commits per bug. Phase A can be one commit but split if any sub-step needs to be reverted.
3. **Never commit on a failing build.** If `npm run build` fails, fix or revert. Do not commit "WIP" or "partial".
4. **Never bypass hooks.** No `--no-verify` for any reason in this plan.
5. **Branch naming exactly as listed above.** Makes the cleanup trail easy to find in `git log` later.
6. **Christopher confirms before commit.** Show the diff (`git diff --stat` minimum, full `git diff` for the small phases) and wait for "commit it".
7. **Christopher confirms before merge to main.** Cloudflare auto-deploys on push to main. Visual confirmation on live site happens after merge but before declaring the phase done.
8. **Update `CLAUDE.md`** at the end of each phase under the appropriate section — flip resolved items off the "Known deferred items" list, add any newly discovered items.
9. **Update `README.md` per the phase mapping below — in the same commit as the code change, not separately.** Testers read the README to know what shipped. The phase tracker and visible-fixes tables in the README are the source of truth for what is live on `tfm-playbook.pages.dev`.

### README update mapping (every phase)

After the phase code lands and build passes, edit `README.md` as follows:

| Phase | README changes required in this phase's commit |
|---|---|
| A | Phase tracker: flip Phase A row from `⏳ Not started` to `✅ Shipped`. Update "last updated" date at top of phase tracker to today. No other change (invisible to users). |
| B | Phase tracker: flip Phase B row to `✅ Shipped`. Visible fixes table: flip all three Phase B rows from `⏳ Coming` to `✅ Shipped`. Update "last updated" date. |
| C | Phase tracker: flip Phase C row to `✅ Shipped`. Visible fixes table: flip the Phase C slider row to `✅ Shipped`. Update "last updated" date. |
| D | Phase tracker: flip Phase D row to `✅ Shipped`. Update "last updated" date. No visible-fixes row to flip. |
| E | Phase tracker: flip Phase E row to `✅ Shipped`. Update "last updated" date. No visible-fixes row to flip. |
| F | Phase tracker: flip Phase F row to `✅ Shipped`. Visible fixes table: flip the Phase F storage row to `✅ Shipped`. Update "last updated" date. |

### Partial-session handling

If time or token budget runs out mid-phase, the README must still match what is live. Two rules:

- **Do not flip a row to `✅ Shipped` unless that change is committed AND merged to `main`.** A merged-but-unshipped-to-Cloudflare row is fine — Cloudflare deploys auto on push to `main`.
- **If a phase ships only partially**, leave the phase tracker row as `⏳ Not started` and add a `📍 In progress — <what landed>` note next to it. Flip to `✅ Shipped` only when the whole phase is done. Example: if Phase B ships B1 and B2 but not B3, the phase tracker row reads `📍 In progress — print buttons + Safari blur done, print queue snapshot still pending` and only the B1/B2 rows in the visible-fixes table flip.

### When two phases land in one session

If a session has budget for two phases (e.g., A + B together because A is mechanical), commit them as **separate commits on the same branch**. The README update for each phase goes in that phase's commit. Do not batch README updates across phases.

---

## Troubleshooting Gate trigger points (consolidated)

Sonnet must fire Stage 1 (screenshot to Claude.ai) at these specific moments:

| Phase | Trigger condition | Template provided in |
|---|---|---|
| B1 | Print staging buttons still appear with no background after fix | Phase B1 |
| B3 | Print queue tile shows old play state after edit | Phase B3 |
| C | Undo behaves wrong after slider draft refactor | Phase C |
| D | Component stops responding after selector conversion | Phase D |
| E | Any animation regression in the smoke suite | Phase E |

For any other unexpected visual issue Sonnet cannot diagnose from file contents alone:

```
TROUBLESHOOTING GATE — SCREENSHOT NEEDED
Take a screenshot of: <specific element>
Take it to Claude.ai with this prompt:
"<problem statement>. Stack: React 19 + Vite + Konva + Zustand. Files involved: <list>. Diagnose."
Bring the output back here.
```

---

## Escalation rules (when to stop Sonnet and ask Christopher to switch to Opus)

| Trigger | Reason | Action |
|---|---|---|
| Build fails twice in the same phase, fixes don't stick | Likely deeper architectural mismatch | Stop, summarize what was attempted, hand off |
| Smoke test catches a regression that Sonnet can't explain on first inspection | Risk of compounding errors | Stop, hand off |
| Phase E animation regression of any kind | Animation runtime is explicitly flagged as regression-prone | Stop immediately, hand off |
| Sonnet finds itself wanting to refactor outside the phase scope | Scope drift is the most common Sonnet failure mode | Stop, list the proposed scope expansion, ask Christopher |

Escalation is not a failure. It's the structured response to the limit of what Sonnet should attempt in a single shot. Same model as the Troubleshooting Gate — keep the session moving instead of spinning.

---

## What's deliberately NOT in this plan

These came out of the audit but are deferred:

| Item | Why deferred |
|---|---|
| `Inspector.jsx` decompose into per-type files | High effort, low immediate impact. Refactor when next inspector feature lands. |
| `useFieldInteraction.js` decompose into sub-hooks | High effort, very high regression risk. Defer until the file actively blocks a feature. |
| Move `finishDrawing` from `useUIStore` to `useDataStore` | Cosmetic until a circular dep actually materializes. |
| `FieldRenderer.jsx` per-element memoization | Element counts don't justify it yet. Revisit if rAF performance becomes visible. |
| Migrate to IndexedDB | Coupled to the storage warning in Phase F. If F's banner fires for real users, do this next. |
| Shared button CSS extraction | Current cross-component imports work. Touch it only when refactoring buttons for another reason. |
| Bundle Cinzel font locally | Cosmetic on first offline PWA load. Defer. |

---

## Plan-level verification gate (Christopher confirms before Phase A starts)

- [ ] Phase order is correct.
- [ ] Branch names are acceptable.
- [ ] Stage 1 gate template format matches your workflow.
- [ ] Escalation rules match your confidence in Sonnet vs. Opus split.
- [ ] Christopher_in_Context and VSCode_workflow are loaded by Sonnet at session start.
