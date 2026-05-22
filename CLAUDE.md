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
- Breadcrumb navigation — real buttons, active play name capped at 160px with ellipsis (stays single-row)
- Inline add, rename, duplicate, arm/confirm delete on all nav screens
- No prompt() or confirm() dialogs anywhere
- Touch event wiring on FieldCanvas (onTouchStart/Move/End)
- 44px minimum touch targets on primary controls; card action buttons are 32px (secondary controls)
- Single-row toolbar: nav left (Back, breadcrumb, Present), actions right (scrollable)
- Present Mode button lives in nav context, immediately after breadcrumb
- Card actions consistent across all levels: Playbook (Rename, Delete), Formation (Rename, Duplicate, Delete), Play (Rename, Duplicate, Delete)
- Duplicate Formation — empty copy with one blank play, no elements carried over
- Drag to reorder cards at all three levels — persists to localStorage via array position
- Drag handle (⠿) on each card — explicit touch target, no accidental drag on tap
- dnd-kit (PointerSensor + TouchSensor) with 8px activation distance / 200ms touch delay
- Four-theme system (Sun-Cyan, Sun-Orange, Paper-Overcast, Paper-Newsprint) — CSS variables + colorIndex palette model, persisted in localStorage. Dot picker moved to bottom of left toolbox, pinned with margin-top: auto, 35px gap for touch targets. THEME_COLORS extracted to src/constants/themeColors.js — shared by FieldCanvas and PlayThumbnail.
- Present Mode text overlay — large bold editable caption, defaults to "Formation - Play" from breadcrumb names, resets on each open, EDIT button top-right
- PWA — installable on Chrome, service worker via vite-plugin-pwa, cache-first assets, network-first navigation, manifest with 192px + 512px icons
- Play thumbnails — static SVG mini field render on play cards; players (circle/square) and routes (straight/curve/motion) scaled from 1920×1080 field space; ▶ placeholder for empty plays; fully theme-aware (field background, player fill, route color all resolve from active theme)
- Formation thumbnails — formation cards show first play's players + LOS (no routes) via PlayThumbnail playersOnly prop; ▶ placeholder for empty formations; fully theme-aware
- Card polish — floating shadow (--color-shadow per theme), 16px border radius, embossed action buttons, inline delete confirm (card-delete-float overlay) on all three nav layers (Playbook, Formation, Play)
- Shift-key 45° angle constraint during player drag and route drawing
- Whole-path drag — drag a route to translate all its segments together
- Field grid with NFL yard lines and hash marks (FieldGrid component)
- Previous/Next play in Present Mode — buttons step through plays in active formation; key={activePlayId} resets caption on each change
- Inspector touch improvements — text/select inputs 44px min-height, checkbox rows 44px, range slider 28px, seg-presnap-btn 36px
- Drawing tool fixes — curve preview renders correctly during draw; branch/extend path is undoable; dashed line style applied to rendered lines; Inspector palette derives from shared THEME_COLORS; auto-switch to SELECT after placing player or finishing route; new elements default to colorIndex 0
- Curve control point — draggable middle handle on every curve segment; default position is perpendicular midpoint; drag reshapes curve in real time; Shift constrains to 45° angles from segment midpoint; accent dot + dashed arm line shows handle when selected
- Curve hit testing — samples 20 points along actual arc path (pass-through bezier formula) so clicking anywhere on the curve body selects it
- Curve arrowhead — uses analytical tangent at t=1 (p2 - ctrl) for correct exit angle regardless of bend amount
- Audit cleanup — dead code removed (unused CSS, fieldConfig constants, Toolbar.css class conflict); curve math extracted to src/utils/curveUtils.js (defaultCurveCP + bezierCtrl) used by FieldCanvas, hitTesting, PlayThumbnail; FieldGrid uses THEME_COLORS instead of its own table; App.jsx redundant theme class removed; direct useEditorStore.setState() calls replaced with setActivePathId store action; snapIncrement references FIELD_CONFIG.SNAP_HALF_YARD; net -102 lines
- Performance — Konva code-split via React.lazy (FieldCanvas); card views load 260KB instead of 590KB; Konva chunk (317KB) loads only when field editor opens and caches permanently; vendor-konva and vendor-react in stable named chunks for cache efficiency; PlayThumbnail wrapped with React.memo to prevent re-renders during DnD and rename interactions
- Marquee box-select tool (⬚) — drag to draw selection rect; all-or-nothing rule (all element points must be inside); live node highlighting as rect captures elements; group drag with Shift-45° constraint; one-step undo; inspector shows count + hint; updateElements() store action for atomic batch updates
- AppHeader component — unified header bar on Playbook, Formation, and Play layers; reuses tb-btn/tb-crumb CSS classes from Toolbar.css; back button + breadcrumb crumbs + add button
- Breadcrumb buttons styled to match toolbar buttons — bordered (1px border-mid), panel-alt background, 36px height, 5px radius; active crumb uses accent border/color
- Present Mode breadcrumbs — floating absolute-positioned crumb buttons only (no header bar), 50% opacity; clicking exits present and navigates to that layer

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
- FieldCanvas split (render / interaction separation)
- Animation runtime engine
- Separate animation Zustand store

### Phase 3 — Editor animation UI
- Scrub bar with event markers
- Event editor
- Animation wiring: all element types including football attachment + text/highlight visibility

### Phase 4 — Present Mode animation integration

### Phase 5 — Polish + performance tuning (cheap Windows tablets)

---

- Print Mode: COMPLETE (branch: session/print-mode)
  - Print toggle on Playbook layer — amber glow border on entire screen when active
  - Coach navigates freely through app; tapping a play card in PlayView toggles it into/out of print queue (no editor navigation in print mode)
  - Selected play cards show amber outline + queue position badge
  - PrintStaging on Playbook layer: drag to reorder queue, Text/Plays format toggle, Youth/Adult size toggle, Print PDF + Clear buttons, scale warning
  - PrintSheet: 4 identical wristband cards per page (2×2), each card 4.75"×2.75"
  - Plays format: each card is a 4×2 grid of 8 play slots; number header (15%) + PlayThumbnail diagram (85%); queue of 20 chunks into groups of 8 across multiple pages; play numbers = global queue position
  - Text format: 4 identical call-sheet cards; black header bar; 2-column layout (plays 1–10 left, 11–20 right); zebra striping; always 1 page
  - Page layout: landscape letter, 0.5in margins, 0.5in col-gap + 2in row-gap for easy cutting
  - PlayThumbnail: bgColor prop added for white print background (backward compatible)
  - ⚑ KNOWN ISSUE: printQueue stores element snapshots at queue-add time. If coach edits a play after queuing it, the print output shows the old version. Fix: store only IDs and resolve live from store at render time. Deferred — not blocking.

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

## Product Roadmap

### TFM Playbook Lite (this repo, main branch)
Version 1.0 is complete. Bug fixes and minor QoL improvements only.
Do not add features that compromise performance on limited hardware.

### TFM Playbook (full — next major version)
**The next phase is mobile phone support.** This is the primary roadmap item.
When mobile work begins, it branches from the v1.0.0 tag and becomes a new major version.
The full version will eventually include animation (Phase 2–5 in the animation roadmap below).

Do not start mobile work or animation until Christopher explicitly opens that session.

---

## What is next (immediate)
Phase 1 complete. Animation pre-planning questions answered. Ready for Phase 2.

Phase 2: Animation foundation (TFM Playbook full — deferred)
- FieldCanvas split (render / interaction separation)
- Separate animation Zustand store (never touches undo/redo stack)
- Animation runtime engine

Deferred (not blocking animation arc):
- Card refactor — useCardInteraction hook + CardShell
- Route branching (option route)

## Animation Phase — Pre-planning Notes
*Resolve these before the animation planning session starts.*

### Questions — ANSWERED
1. **Playback style: Simultaneous.** All players move at once from the snap. No sequenced unfolding.

2. **Where animation lives: Field editor + Present Mode.**
   - Field editor: full animation controls (play, scrub, timing)
   - Present Mode: play and replay only. A toggle to disable animation entirely so the app doesn't load animation data when the coach doesn't need it — keeps memory slim on cheap tablets.

3. **Timing model: Option B — Choreographed per-segment timing.**
   Uses the `duration` field already on every route segment (built in Phase 1). Each segment plays at its own speed — short routes are faster, deep routes take longer, pre-snap motion has its own pace. This matches real football timing (QB drop on count 3, crosser hits window at count 4, etc.).
   
   ⚑ FLAG — Christopher's note: "We might need to test it for variations in the controls like stops and starts or something unforeseen. Things might become clearer when we get there." Do not over-engineer timing controls before seeing how choreographed playback feels in practice. Build the basic per-segment duration first, then let real testing reveal what's missing.

### Code changes required before animation can start

**1. Player-route linkage — critical, data model change**
The `elements` array is flat. Players and routes have no data relationship. There is no `routeId` on a player or `playerId` on a path. Animation cannot work without knowing "player X follows route Y." Requires a design decision (one player owns one route? routes can be unowned?) and a data migration similar to the segment migration already in the store. Do this in its own session before animation.

**2. FieldCanvas.jsx split — important, do before animation**
677 lines mixing interaction events, drawing logic, rendering, and Konva state. Animation requires driving the render layer from a timeline, not React events. Plan a refactor session to separate rendering from interaction before the animation build starts.

**3. Animation state must be a separate store — architecture decision**
History (undo/redo) in useEditorStore snapshots full play element state. Animation playback state (isPlaying, currentTime, frame) must never touch this stack. Wire animation as a separate lightweight Zustand store. Plan this boundary explicitly during the architecture session.

**4. Konva code splitting — bundle size**
The chunk size warning is from Konva. Animation will add Konva tween/animation APIs and grow the bundle further. Address with dynamic import() code splitting before or during the animation phase.

### Recommended session order before animation build
1. QoL / UI polish (current focus)
2. Player-route linkage (data model session)
3. FieldCanvas refactor (render/interaction split)
4. Animation architecture planning
5. Animation build

---

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
