# CLAUDE.md — Football Play Editor

## What this is
A football play editor PWA. Coaches draw plays, manage playbooks, and present them on the sideline. Animation is the long-term end goal.

## Stack
React, Vite, Konva, Zustand, Cloudflare Pages
Local: /mnt/storage/claudebox/projects/football-play-editor

## Repo / Deploy
GitHub: https://github.com/secureprospective/football-play-editor
Live: https://football-play-editor.pages.dev
Deploy: automatic on push to main

## Working rules
- Branch before every session: git checkout -b session-name
- Why below every code block
- Verify each phase before moving to the next
- Build check before every commit
- Never chain phases without a checkpoint

## What is built
- Playbook → Formation → Play → Field editor navigation
- localStorage persistence
- Export / Import playbook JSON
- Player shapes: circle and square
- Route drawing — segment-based data model
  - Straight route tool (╱) and Curved route tool (⌒) as separate tools
  - Each click adds a segment typed by the active tool
  - Mixed straight/curve segments in a single route supported
  - Multi-segment routes render correctly via Konva flatMap
  - Triangle arrowhead at route end, direction-correct for curves
  - Tension-based bezier curves (Konva tension prop)
  - Node handles visible on selection, draggable
- Pre-snap motion — segment-level property
  - Toggle per segment in inspector
  - Renders as zigzag line
  - Carries animation intent for future phase
- Data migration — old flat-points paths auto-convert to segment model on load and import
- Undo / Redo, Flip H/V, Snap toggle, LOS toggle
- Present Mode
- Breadcrumb navigation — real buttons, active play name uncapped
- Inline add, rename, duplicate, arm/confirm delete on all nav screens
- No prompt() or confirm() dialogs anywhere
- Touch event wiring on FieldCanvas (onTouchStart/Move/End)
- 44px minimum touch targets throughout
- Single-row toolbar: nav left (Back, breadcrumb, Present), actions right (scrollable)
- Present Mode button lives in nav context, immediately after breadcrumb
- Card actions consistent across all levels: Playbook (Rename, Delete), Formation (Rename, Duplicate, Delete), Play (Rename, Duplicate, Delete)
- Duplicate Formation — empty copy with one blank play, no elements carried over
- Drag to reorder cards at all three levels — persists to localStorage via array position
- Drag handle (⠿) on each card — explicit touch target, no accidental drag on tap
- dnd-kit (PointerSensor + TouchSensor) with 8px activation distance / 200ms touch delay
- Four-theme system (Sun-Cyan, Sun-Orange, Paper-Overcast, Paper-Newsprint) — CSS variables + colorIndex palette model, persisted in localStorage. Dot picker moved to bottom of left toolbox, pinned with margin-top: auto, 35px gap for touch targets.
- PWA — installable on Chrome, service worker via vite-plugin-pwa, cache-first assets, network-first navigation, manifest with 192px + 512px icons

## What is next
1. Play thumbnails — mini field render on play cards (own session)
2. Previous/Next play in Present Mode
3. Inspector touch friendliness — input heights, label padding, color/checkbox hit areas
4. Route branching (option route) — deferred, advanced feature, own session
5. Animation — future phase, major session

## Known deferred items
- Route branching — click on existing route to fork; deferred indefinitely
- Duplicate play is Play view only — Formation and Playbook views have no duplicate concept by design
- Chunk size warning on build — Konva bundle, address when animation phase requires code splitting
- Drawing preview (route ghost line) only appears during touch contact — no hover state on touch, browser limitation
- Right-click to finish route not available on touch — Done button covers this
- Dashed Line toggle in inspector is wired but not honored per-segment — deferred
- Curve control point drag (interactive Bézier) — curves use auto-tension, manual control point deferred

## Known issues — deferred
- getPointerPosition TypeError: stageRef.current is null during Konva Stage remount on theme switch (key={theme} forces remount). Fires on mousemove during the transition. No user-visible crash. Fix: null guard in getScaledPos. Deferred — not reproducible in normal use.
