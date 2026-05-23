# Codebase Audit — Master Prompt

**Trigger phrase:** `football`

This is the full audit session prompt. Read it completely before doing anything.

---

You are opening a football play editor PWA codebase for a deep audit session. Before writing a single line of code, read everything listed below completely. Do not propose changes until the full audit is done.

## Your mission
Full codebase audit across four dimensions:
1. Dead code, duplicates, and slop removal
2. Architectural analysis and improvement proposals
3. Cross-browser compatibility (Chrome/Mac, Chromebook/ChromeOS, Linux browsers)
4. Forward risk analysis — what will break or slow down as plays grow in complexity

---

## Required reading before anything else

1. `/mnt/storage/claudebox/projects/football-play-editor/CLAUDE.md` — full project history, stack, what is built, known deferred items
2. Every file in `src/` — read the entire source tree, do not skim

---

## Audit dimensions

### 1. Dead code + slop
- Unused imports, exports, variables, CSS classes
- Duplicate logic across files (especially animationRuntime.js, useDataStore.js, useFieldInteraction.js)
- Inline styles that should be CSS classes
- CSS classes defined but never referenced
- Console.log or debug artifacts left in
- Commented-out code that should be deleted
- Inconsistent naming conventions across the codebase
- Redundant migration guards that can never fire

### 2. Architecture
- useFieldInteraction.js is the largest and most complex file — assess whether it needs further decomposition
- FieldRenderer.jsx renders all Konva elements — assess render efficiency and unnecessary re-renders
- useDataStore.js and useUIStore.js split — assess whether the boundary is clean or leaking
- animationRuntime.js — assess whether pure function guarantees are actually held
- Inspector.jsx — large component with many conditional branches — assess decomposition
- Zustand store slices — assess selector usage to prevent over-subscription and unnecessary renders
- Any circular dependency risks between stores
- Any component that reads from both stores unnecessarily

### 3. Cross-browser compatibility
Target browsers: Chrome (Mac), Chrome (Chromebook/ChromeOS), Firefox (Linux), Safari (Mac)
- CSS properties that need vendor prefixes or have known gaps (especially `backdrop-filter`, `color-mix`, `appearance`)
- Touch event handling — assess gaps between desktop pointer events and touch events on Chromebook tablets
- PWA installability on each target browser
- Service worker cache strategy — assess whether it survives Chrome's aggressive cache policies on ChromeOS
- Flexbox and grid usage — flag any properties with incomplete support on older Chrome versions common on Chromebooks
- Font rendering differences that could break layout
- Any `window` or `document` API calls that behave differently across targets
- Input behavior differences (especially range sliders and number inputs on touch)

### 4. Forward risk — custom plays at scale
- localStorage size limits — assess risk as playbooks grow (each play stores full element snapshots)
- JSON serialization of elements array — assess deep clone patterns in history (pushHistory snapshots)
- computePositions() called every rAF frame — assess O(n) operations that will slow as element count grows
- isFootballInFlight() called every render frame — assess cost
- masterHitTest() — assess worst-case performance with many overlapping elements
- PlayThumbnail SVG render — assess re-render cost on large formation views
- DnD reorder with many cards — assess whether dnd-kit degrades with 50+ plays
- Any memory leak risks in useAnimationLoop (rAF cleanup, event listeners)
- Print mode — printQueue stores snapshots, known issue — flag blast radius

---

## Deliverable format

Present findings in this exact structure:

### DEAD CODE + SLOP
List each finding as: `file:line — description — safe to delete? (yes/needs review)`

### ARCHITECTURAL CONCERNS
Ranked by severity (critical / moderate / low). Each entry: problem, why it matters, proposed fix, effort estimate.

### CROSS-BROWSER RISKS
Per browser, list specific risks with the exact CSS property or API and what breaks.

### FORWARD RISKS
Each risk: trigger condition, estimated element count or data size where it becomes a problem, proposed mitigation.

### PROPOSED CHANGES — PRIORITIZED
A flat numbered list ordered by impact/effort ratio. High impact + low effort first.
For each: what changes, what files, what it fixes, any regression risk.

---

## Constraints
- Do not write any code yet — audit and propose only
- Flag anything that could break existing localStorage data (migration risk)
- Flag anything that touches the animation runtime — it is complex and regression-prone
- Note any place where a fix for one browser will break another
- Keep the football animation data model (journey, interceptPoint, segments, delay) in mind — any architectural change must survive these structures
