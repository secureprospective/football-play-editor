# Architecture Refactor — Session Handoff Prompt

Use this prompt to start the architecture refactor session.

---

## Trigger Phrase

"refactor"

---

## Handoff Prompt

We are doing an architecture refactor on the TFM Playbook football play editor. This refactor happens BEFORE the football animation feature. Read CLAUDE.md fully before touching any file, then read `docs/ARCHITECTURE_REFACTOR_PLAN.md` for the complete session plan including step-by-step phases, verification checklists, rollback strategies, and contingencies.

**Project:** /mnt/storage/claudebox/projects/football-play-editor
**Stack:** React, Vite, Konva (react-konva), Zustand, Cloudflare Pages
**Branch protocol:** No work on main. Create `session/architecture-refactor` before any edits.

**The plan (already decided — do not re-discuss the approach):**

Three phases, in priority order:

1. **Phase 1 — Handler re-binding fix** (HIGHEST priority, ~1-2 hours)
   - Mechanical refactor of `src/components/Stage/useFieldInteraction.js`
   - Switch handler internals to `useEditorStore.getState()` / `useUIStore.getState()`
   - Wrap each handler in `useCallback` with empty deps
   - Memoize the `handlers` object with `useMemo`
   - This is the perf bug — fixes Konva re-binding pointer handlers every render

2. **Phase 2 — Store split** (MUST happen before football animation, ~3-4 hours)
   - Split `useEditorStore` into `useDataStore` (undoable + persistent) and `useUIStore` (transient UI)
   - Use Zustand slices within each store, file layout per plan doc
   - UI store does not persist except for theme (handled per Plan §Phase 2 Option A)
   - Update every component subscription via find/replace
   - Contingency fallback: if too risky, keep one store with slices (Plan §Phase 2 final contingency)

3. **Phase 3 — Pure helper extraction** (LOW priority, ~1-1.5 hours)
   - Move pure functions (no React) out of `useFieldInteraction` into `src/utils/fieldHelpers.js`
   - `getPathTailPoint`, `getElementsInRect`, `resolveDragDelta`, `resolveRoutePoint`, `resolvePreviewPos`

Phase 4 (drawing state machine extraction) is deferred to a future session — only attempt if Phases 1-3 land with time to spare.

**Pre-session protocol:**
1. Read CLAUDE.md
2. Read docs/ARCHITECTURE_REFACTOR_PLAN.md completely
3. Confirm clean working tree
4. Branch: `git checkout -b session/architecture-refactor`
5. Baseline build: `npm run build` — must pass
6. Run the baseline functional checklist (Plan §Pre-Session Checklist) before any code changes

**Per-phase protocol:**
- Run the functional checklist in the Plan after each phase
- Commit each phase as its own commit
- Stop and reassess if any verification check fails — do not push forward on a broken refactor
- Use the contingency decision tree (Plan §Contingency Decision Tree) when something goes off the rails

**Success criteria:**
- Minimum: Phase 1 complete
- Target: Phase 1 + Phase 2 complete
- Stretch: Phase 1 + Phase 2 + Phase 3 complete

**Session-end protocol:**
- Final functional checklist on dev server
- Build clean
- Update CLAUDE.md with phase completions
- Update docs/FOOTBALL_ANIMATION_PROMPT.md if store paths changed
- Merge to main, push, verify Cloudflare deployment

**Do not implement until Christopher confirms the plan.**
Present a session summary of which phases you intend to attempt today (based on time available) and wait for explicit confirmation before writing any code.
