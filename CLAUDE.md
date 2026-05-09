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
- Route drawing with node editing
- Undo / Redo, Flip H/V, Snap toggle, LOS toggle
- Present Mode
- Breadcrumb navigation — real buttons, active play name uncapped
- Inline add, rename, duplicate, arm/confirm delete on all nav screens
- No prompt() or confirm() dialogs anywhere
- Touch event wiring on FieldCanvas (onTouchStart/Move/End)
- 44px minimum touch targets on Toolbox buttons
- Single-row toolbar: nav left (Back, breadcrumb, Present), actions right (scrollable)
- Present Mode button lives in nav context, immediately after breadcrumb
## What is next
1. Play thumbnails — mini field render on play cards (own session)
2. Previous/Next play in Present Mode
3. PWA — installable offline
4. Inspector touch friendliness — input heights, label padding, color/checkbox hit areas
5. Nav screens touch audit — card action buttons
6. Animation — future phase, major session
## Known deferred items
- Duplicate play is Play view only — Formation and Playbook views have no duplicate concept by design
- Chunk size warning on build — Konva bundle, address when animation phase requires code splitting
- Drawing preview (route ghost line) only appears during touch contact — no hover state on touch, browser limitation
- Right-click to finish route not available on touch — Done button covers this
