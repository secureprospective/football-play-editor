# Football Animation — Session Handoff Prompt

Use this prompt to start the football animation build session.

---

## Trigger Phrase

"football"

---

## Handoff Prompt

We are building football animation for the TFM Playbook football play editor. Read CLAUDE.md fully before touching any file, then read `docs/FOOTBALL_ANIMATION_PLAN.md` for the full design context.

**Project:** /mnt/storage/claudebox/projects/football-play-editor  
**Stack:** React, Vite, Konva (react-konva), Zustand, Cloudflare Pages  
**Branch protocol:** No work on main. Create `session/football-animation` before any edits.

**The plan (already decided — do not re-discuss the approach):**

We are implementing Options A + B from the planning doc:

**Option A — Visibility on football elements**
- Add visibility controls to football elements in the Inspector (currently only text/highlight have this)
- Include football elements in the visibility filter in FieldRenderer (currently always rendered)
- This lets coaches place multiple footballs, each with a timed visibility window, to represent handoffs and possession changes

**Option B — Football gets a drawable route**
- Add `routeId` field support on football elements (data model)
- Add `linkFootballToRoute` / `unlinkFootballFromRoute` in `useEditorStore.js` (mirrors the existing player link functions)
- Add football route dropdown in Inspector (mirrors the player route dropdown)
- Update `computePositions` in `src/utils/animationRuntime.js` — if a football has a `routeId`, compute its position from that route (same as player); if it has only `attachedToElementId`, use the existing offset-from-player logic

**Session start checklist:**
1. Read CLAUDE.md
2. Read docs/FOOTBALL_ANIMATION_PLAN.md
3. Read src/utils/animationRuntime.js (understand current football position logic)
4. Read src/components/Inspector/Inspector.jsx (understand current football inspector section)
5. Read src/components/Stage/FieldRenderer.jsx (understand current football rendering and visibility filter)
6. Read src/store/useEditorStore.js — find `linkPlayerToRoute` as the reference for the football link functions
7. Present a session plan to Christopher and wait for explicit confirmation before writing any code

**Do not implement until Christopher confirms the plan.**
