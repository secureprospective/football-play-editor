# Football Session — Master Handoff Prompt

**Trigger phrase:** `football`

This single prompt covers **both** the architecture refactor (Phase 1 of the session) and the football animation build (Phase 2 of the session). They are sequenced into one session because the football data store actions depend on the post-refactor `useDataStore`. Do not skip the refactor.

Memory will have been cleared before this session starts. Everything you need is in the documents listed below — read them in order before doing anything.

---

## Required Reading (in order, before any work)

1. **`/mnt/storage/claudebox/Christopher_in_Context.md`**
   Who Christopher is. How he thinks. How he wants Claude to communicate. This is the most important file. Read it before you write your first response.

2. **`/mnt/storage/claudebox/VSCode_workflow.md`**
   How we build software together in this environment. Branch rules, build verification, commit discipline, troubleshooting gates. This governs the session.

3. **`CLAUDE.md`** (project root)
   Project-specific ground truth: stack, deployment, build state, animation roadmap progress, known deferred items.

4. **`docs/ARCHITECTURE_REFACTOR_PLAN.md`**
   The refactor that comes first. Phases, verification checklists, rollback strategies, contingency decision tree. Read it completely.

5. **`docs/FOOTBALL_ANIMATION_PLAN.md`**
   The football animation design. Journey model, runtime logic, coach UX, build sequence. Read it completely.

Do not skim. Christopher expects you to know what's in these documents before proposing a session plan.

---

## Session Structure

### Phase 1 — Architecture Refactor (~4-6 hours)

Execute per `docs/ARCHITECTURE_REFACTOR_PLAN.md`. Three sub-phases:

- **1A — Handler re-binding fix** (~1-2h, low risk)
- **1B — Store split into useDataStore + useUIStore** (~3-4h, medium risk, REQUIRED before football)
- **1C — Pure helper extraction** (~1-1.5h, low risk, optional)

Phase 4 from the refactor doc (drawing extraction) is **dropped** — football design supersedes the need.

### Phase 2 — Football Animation Build (~6-10 hours)

Execute per `docs/FOOTBALL_ANIMATION_PLAN.md`. Nine steps:

1. Data model + `migrateFootball`
2. Store actions (5 new actions in elementOpsSlice)
3. Runtime logic — `footballPositionAtTime` + `getSnapTime` in animationRuntime.js
4. Inspector — read-only journey view
5. Inspector — event editing (handoffs)
6. Pass/toss + arc drawing (uses `arcDrawingForEventId` in UI store drawing slice)
7. Pre-snap visual verification (ball on LOS until snap)
8. Deletion cleanup (stale arcPathId, snapToPlayer, toPlayer references)
9. End-to-end verification with three sample plays

Each step is its own commit.

---

## Pre-Session Protocol

Run all of this before writing your first code change:

1. Read all five documents listed above
2. Confirm primary working directory: `/mnt/storage/claudebox/projects/football-play-editor`
3. Confirm clean working tree: `git status`
4. Confirm on main and up to date with origin
5. Create branch: `git checkout -b session/football-architecture-and-build`
6. Baseline build: `npm run build` — must pass with no errors
7. Run the baseline functional checklist from `ARCHITECTURE_REFACTOR_PLAN.md` §Pre-Session Checklist
8. **Stop here.** Present a session plan to Christopher that:
   - Confirms you've read all required documents
   - Lists which sub-phases you intend to attempt in this session based on time available
   - Identifies any pre-existing issues found during baseline verification
   - Waits for **explicit confirmation** before writing any code

Christopher's pattern is plan-then-build. He will reject premature implementation. Do not skip the confirmation step.

---

## Per-Step Protocol

After each sub-phase or step:

1. Run the relevant functional checklist (in `ARCHITECTURE_REFACTOR_PLAN.md` for refactor; build per-step verification for football)
2. Run `npm run build` — must pass
3. Commit the work as a single focused commit
4. Report progress to Christopher before moving to the next step

If verification fails:
- Stop. Don't push forward on broken code.
- Use the contingency decision tree in `ARCHITECTURE_REFACTOR_PLAN.md` §Contingency Decision Tree
- If you can't identify the root cause within 15 minutes, roll back the current step and reassess

---

## Success Criteria for the Session

- **Minimum acceptable:** Phase 1A (handler fix) complete and merged
- **Target:** Phase 1A + 1B (refactor) complete; Phase 2 steps 1-3 (data + runtime) complete
- **Full:** Phase 1 entirely complete + Phase 2 entirely complete (full football animation working end-to-end)

Christopher prefers a smaller scope done well over a larger scope done badly. If you have to choose, deliver fewer phases at higher quality.

---

## Session-End Protocol

When stopping (whether the session is complete or paused mid-work):

1. Run the full functional checklist one final time
2. `npm run build` — must pass clean
3. Update `CLAUDE.md` with what landed this session and what's deferred
4. Update `docs/FOOTBALL_ANIMATION_PLAN.md` if any design decisions changed during build
5. Commit any documentation updates
6. Merge `session/football-architecture-and-build` to main (only if Christopher confirms)
7. Push to origin
8. Wait for Cloudflare Pages deployment, spot-check live site
9. Hand back to Christopher with a concise summary of what's live, what's deferred, and what to test

---

## What This Session Is NOT

- Not a redesign session. The football journey model is locked. Do not propose alternatives.
- Not a refactor of `useFieldInteraction` beyond what's in the refactor plan. The 600-line hook is acceptable for now; extraction is deferred.
- Not a Phase 4 drawing-state extraction. That phase is dropped.
- Not a chance to introduce TypeScript, Tailwind, or other framework changes. Stack is locked.

---

## Final Note

The journey design in `FOOTBALL_ANIMATION_PLAN.md` **replaces** earlier "A+B" proposals (multiple footballs, visibility timing on footballs). If you find any reference to those in older docs or comments, treat them as superseded. The journey model is the single source of truth for ball movement.

When ready, begin by reading the required documents in order, then present your session plan to Christopher.
