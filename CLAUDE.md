# CLAUDE.md — TFM Playbook (Football Play Editor)

> Docs routing: see `docs/INDEX.md`. Full build history: `docs/PHASE_HISTORY.md`.

## What this is
A football play editor PWA. Coaches draw plays, manage playbooks, and present them on the sideline. Animation is the long-term end goal.

## Stack
React, Vite, Konva, Zustand, Cloudflare Pages
Local: /mnt/storage/claudebox/projects/football-play-editor

## Repo / Deploy
GitHub: https://github.com/secureprospective/football-play-editor

Two Cloudflare Pages projects, one repo:
- TFM Playbook Lite → football-play-editor.pages.dev — deploys from `lite` branch (frozen at v1.0.0)
- TFM Playbook (full) → tfm-playbook.pages.dev — deploys from `main` (active Phase 2+ development)

Push to `lite` → Lite site auto-deploys. Push to `main` → Full site auto-deploys.

## Working rules
Standard session protocol — branch per session, why-comments, verify each phase, build check before every commit, no chaining phases without a checkpoint. Project-specific: bug fixes → `lite` branch, features → `main` (see Repo / Deploy).

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
- Card polish — 4px border radius (structural, not bubbly), bevel action buttons, inline delete confirm (card-delete-float overlay) on all three nav layers (Playbook, Formation, Play)
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
- Breadcrumb buttons — raised bevel (--s-btn-face, --s-btn-raised), 2px radius, 30px height; active crumb pressed/accent state with translateY(2px)
- Present Mode breadcrumbs — floating absolute-positioned crumb buttons only (no header bar), 50% opacity; clicking exits present and navigates to that layer
- Rugged tactical UI overhaul — injection-molded hardware aesthetic across every screen (see docs/UI_OVERHAUL_SPEC.md)
  - --s-* CSS token layer on all 4 themes (surfaces, bevels, wells, accent gradients, danger, rivets, play button, knurl)
  - 3D bevel system: raised/pressed binary on all buttons; translateY(2px) on active, 0.06s snap transition
  - Toolbox: panel-deep rail, rivet pseudo-elements (::before/::after), lens color swatches
  - Theme dots: 28px, 76px gap (2× tool button width) for touch accuracy
  - Clear button: guard-ring treatment, pinned to far right outside scroll zone
  - Toolbar icons: heroicons arrow-turn-down-left/right (undo/redo), arrows-right-left/up-down (flip)
  - Brand: logo + "TFM Playbook" is a raised bevel button linking to techfreedomministries.org
  - Present Mode: nav arrows + hide/show toggle use full bevel system and theme tokens
  - Haptics: triggerHaptic() (12ms pulse) in src/utils/haptics.js, wired to all primary controls
  - Monospace font (SF Mono / Consolas / Courier New) on all chrome labels, inputs, readouts
  - --s-font: shared CSS variable for mono stack
  - Deferred for future build: custom knurled timeline thumb, rocker switch toggles (native inputs kept)
- Anim toggle (AnimationBar): standard raised/pressed button — same family as reset and play; accent-border color when ON (not permanent accent block)
- Film icon (heroicons outline) on Anim toggle (AnimationBar, 22px) and Present Mode anim toggle — icon-only, no text
- Present Mode anim toggle: film icon in both ON and OFF states; .present-anim-off amber color signals OFF state
- Brand button: logo + "TFM Playbook" is a raised bevel `<a>` link to techfreedomministries.org in both Toolbar and AppHeader; high-contrast --color-text on Cinzel title

## Build history
Phases 1–6, Print Mode, and the v1.0.0 release are all complete. The full
session-by-session record is archived in `docs/PHASE_HISTORY.md`.

---

## Product Roadmap
- **Lite** (`lite` → football-play-editor.pages.dev): v1.0 frozen — bug fixes / QoL only, merge to `lite`; nothing that hurts low-end-hardware performance.
- **Full** (`main` → tfm-playbook.pages.dev): Phases 1–6 complete, active development; all session branches merge to `main`. Mobile phone support deferred until the football animation arc stabilizes.

---

## What is next (immediate)
Phases 1–6 + audit cleanup complete (shipped to main 2026-05-23; details in `docs/PHASE_HISTORY.md`).

**Active work areas:**
- Custom scrubber thumb (knurled, spec Section 4.4) — native range kept for first pass
- Rocker switch toggles in inspector (spec Section 4.3) — native checkboxes kept for first pass
- Flight duration slider layout refinement (⚑ flagged in Phase 6)
- Route branching (option route) — deferred indefinitely
- Card refactor — useCardInteraction hook + CardShell — deferred
- Migrate printQueue to IndexedDB if storage warning fires for real users (see Phase F)

---

## Known deferred items
- Route branching — click on existing route to fork; deferred indefinitely
- Duplicate play is Play view only — Formation and Playbook views have no duplicate concept by design
- Chunk size warning on build — Konva bundle, address when animation phase requires code splitting
- Drawing preview (route ghost line) only appears during touch contact — no hover state on touch, browser limitation
- Right-click to finish route not available on touch — Done button covers this
- Dashed Line toggle in inspector is wired but not honored per-segment — deferred
- Curve control point drag (interactive Bézier) — curves use auto-tension, manual control point deferred
- Custom knurled timeline thumb — native range input kept; custom div-based slider deferred (UI overhaul)
- Rocker switch toggles — native checkboxes kept; custom track+thumb component deferred (UI overhaul)
- printQueue stale snapshot — print output uses the element snapshot taken at queue-add time; edits made after queuing aren't reflected. Fix: store IDs and resolve live from store at render time. Not blocking.

---

## License
Business Source License 1.1 — shipped 2026-05-23.

- `LICENSE` — root legal document; full BSL 1.1 terms, nonprofit/coach/educational carve-out, Change Date 2030-01-01 → GPL v2+
- Copyright header on all 33 `.js` / `.jsx` source files in `src/`
- README.md has public-facing License section with link to LICENSE
- `main.jsx` carries the header as the app entry point

Licensor: Christopher Campbell / Tech Freedom Ministries
Commercial use prohibited without written permission from the Licensor.
