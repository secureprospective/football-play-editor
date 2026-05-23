# TFM Playbook — Football Play Editor

Built by Tech Freedom Ministries. Free tools for coaches who teach the game.

---

## Which version is right for you?

There are two versions of TFM Playbook. Both are free. Both run in your browser — nothing to download or install (unless you want to, see below).

| | TFM Playbook Lite | TFM Playbook |
|---|---|---|
| **Best for** | Coaches on older or budget computers | Coaches who want the full feature set |
| **Play drawing** | ✅ Yes | ✅ Yes |
| **Print Mode** (wristband cards) | ✅ Yes | ✅ Yes |
| **Present Mode** (sideline display) | ✅ Yes | ✅ Yes |
| **Animation** (players move on screen) | ❌ Not included | ✅ In progress |
| **Speed** | Faster on old hardware | Slightly heavier |
| **Stability** | Stable release — no new features | Active development — new features added regularly |
| **Link** | [Open TFM Playbook Lite](https://football-play-editor.pages.dev) | [Open TFM Playbook](https://tfm-playbook.pages.dev) |

**Not sure which to pick?** Start with Lite. If your computer handles it fine and you want animation when it's ready, switch to TFM Playbook.

---

## How to open the app

1. Open **Google Chrome** on your Windows computer
2. Click the link for the version you want (see table above)
3. That's it — the app loads in your browser. No account needed.

> **Why Chrome?** The app works best in Chrome. It also works in Microsoft Edge. Firefox and Safari are not recommended.

---

## How to install it on your computer (optional but recommended)

Installing puts a shortcut on your desktop and lets the app work even without internet — useful on the sideline.

**Steps (same for both versions):**

1. Open the app in Chrome
2. Look at the address bar — you will see a small **computer screen icon** on the right side (it may look like a monitor with a down arrow)
3. Click that icon
4. A box will pop up that says **"Install TFM Playbook"** (or similar)
5. Click **Install**
6. The app will open in its own window and a shortcut will appear on your desktop

If you do not see the install icon, try this instead:
1. Click the **three dots** (⋮) in the top-right corner of Chrome
2. Look for **"Install TFM Playbook"** or **"Install page as app"** and click it

Once installed, you can open it from your desktop like any other program.

---

## What the app does

TFM Playbook is a play-drawing tool for football coaches. You can:

- **Build a playbook** — organize plays by formation
- **Draw plays** — place players, draw routes (straight or curved), add motion and blocking assignments
- **Animate plays** — link routes to players, set per-segment durations, and watch the play run in Present Mode (full version only)
- **Choreograph the football** — place a football, set who snaps it, then add handoff, toss, or pass events with adjustable flight time (full version only)
- **Color-code everything** — assign colors to routes and players by role
- **Print wristband cards** — print play diagrams that fit on a coach's wristband card
- **Present on the sideline** — full-screen play display for showing players the play on a tablet or laptop

Your playbook is saved automatically on your computer. Nothing goes to the internet.

---

## Recent updates

**Live now in TFM Playbook (full version):**

| Shipped | What's new |
|---|---|
| ✅ | **Football animation** — place a football, set a snap target, add handoff / toss / pass events, then hit play in Present Mode to watch the play run |
| ✅ | **Per-event flight duration** — set how long each pass/toss/handoff takes in the football inspector |
| ✅ | **Intercept node** — drag the yellow diamond on the field to set exactly where a pass/toss lands |
| ✅ | **Hide/show panel** in Present Mode — collapse the bottom controls so the play fills the screen |
| ✅ | **In-flight ring** — football glows yellow while in motion so it's easy to follow during playback |

### Cleanup phase progress

The app is in a 6-phase cleanup sweep right now. Some phases ship visible fixes; others are internal performance work. Each row flips to ✅ as it deploys.

**Phase tracker** (last updated: 2026-05-23)

| Phase | What it does | Visible to you? | Status |
|---|---|---|---|
| A | Code cleanup — dead code, unused files | No | ✅ Shipped |
| B | Visible bug fixes (3 fixes — see below) | **Yes** | ✅ Shipped |
| C | Inspector duration slider responsiveness | **Yes** (subtle) | ✅ Shipped |
| D | App-wide performance sweep | No | ✅ Shipped |
| E | Animation runtime tuning | No | ⏳ Not started |
| F | Storage-full warning banner | **Yes** (new banner) | ⏳ Not started |

Time and token budget will decide whether these ship in one session or several. The tracker above is the source of truth — if it says ⏳ Not started, that deploy has not landed yet.

**Visible fixes in flight (Phases B, C, F):**

| Phase | Status | Fix |
|---|---|---|
| B | ✅ Shipped | **Print Mode staging buttons** that appeared blank now show a visible background (Text/Plays toggle, Youth/Adult toggle, Clear/Print) |
| B | ✅ Shipped | **Print queue no longer shows old play data** — if you queued a play, edited it, then printed, the card showed the pre-edit version. Now resolves the live play at print time. |
| B | ✅ Shipped | **Present Mode blur on older Safari** — frosted backdrop on the bottom bar now renders correctly |
| C | ✅ Shipped | **Inspector duration slider** feels responsive on cheap tablets — was generating excess work per drag |
| F | ⏳ Coming | **Storage full warning** — visible banner if your browser storage fills, before you lose any work |

Phases A, D, and E are invisible — code organization and performance improvements that make the app faster without changing what you see.

### What's planned after cleanup

After the cleanup sweep lands, the next development pass picks up these items. They are not in flight yet — listed so you know where the app is headed.

| Status | Item |
|---|---|
| 🔜 Planned | Inspector layout polish — tighter spacing in the segment list and journey events |
| 🔜 Planned | Present Mode UX refinements |
| 🔜 Planned | Flight duration slider layout — current version works, layout will be cleaner |
| 💤 Deferred | **Phone support** — waiting until animation is fully stable on tablets first |
| 💤 Deferred | **Route branching** (option routes — click an existing route to fork) |
| 💤 Deferred | **Dashed line per-segment** — checkbox exists in inspector but applies to the whole route; will become per-segment later |
| 💤 Deferred | **Manual curve control point drag** — curves currently use automatic tension only |
| 💤 Deferred | **Card view refactor** — internal architecture cleanup, no user-visible change planned |

⏳ = In flight  ✅ = Shipped  🔜 = Planned next  💤 = Deferred (not scheduled)

---

## For testers — how to report issues

If something looks wrong:

1. Note what you were doing when it happened — which playbook, which formation, which play, which tool.
2. Take a screenshot if it is a visual problem.
3. Try refreshing the page — note whether the issue persists.
4. Send the screenshot and short description to Christopher.

**Things that are intentionally limited in this build:**

- Phone screens are not supported yet (planned after animation work fully stabilizes).
- Right-click to finish a route only works on desktop, not touch — use the **Done** button on touch.
- Dashed line per-segment is wired in the inspector but not honored — the entire route uses one line style.
- Curve control point drag — curves use auto-tension; manual control point is deferred.
- Hover preview of a route only appears while a finger is touching the screen (touch devices have no hover state).

---

## Minimum requirements

| | Minimum |
|---|---|
| **Computer** | Any Windows 10 or Windows 11 laptop or tablet |
| **RAM** | 4 GB |
| **Browser** | Google Chrome (version 90 or newer) |
| **Internet** | Needed the first time you open it; not needed after installing |

Chromebooks and Mac computers also work but are not the primary target.

---

## Your playbook stays on your computer

All plays and playbooks are saved locally on your device. Nothing is sent to a server. If you clear your browser data or use a different computer, your playbook will not be there — use the **Export** button to save a backup file before switching devices.

---

## Frequently asked questions

**Can I use this on my phone?**
Not yet. Phone support is planned after the animation feature is complete.

**Can two coaches share a playbook?**
Use the **Export** button to save your playbook as a file, then send that file to the other coach. They use **Import** to load it.

**Is this free?**
Yes. No account, no subscription, no cost.

**Who made this?**
Tech Freedom Ministries. A nonprofit that builds free tools for communities. Learn more at [techfreedomministries.com](https://techfreedomministries.com).

---

## For developers

Stack: React, Vite, Konva, Zustand, Cloudflare Pages.

- `lite` branch → [football-play-editor.pages.dev](https://football-play-editor.pages.dev) (stable, feature-frozen at v1.0.0)
- `main` branch → [tfm-playbook.pages.dev](https://tfm-playbook.pages.dev) (active development, Phase 2+)

See `CLAUDE.md` for full build state, architecture notes, and session protocol.
