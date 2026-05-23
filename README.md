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
| **Animation** (players move on screen) | ❌ Not included | ✅ Yes |
| **Pre-snap motion sequencing** | ❌ Not included | ✅ Yes |
| **Football choreography** (snap, handoff, pass, toss) | ❌ Not included | ✅ Yes |
| **Speed** | Faster on old hardware | Slightly heavier |
| **Stability** | Stable release — no new features | Active development |
| **Link** | [Open TFM Playbook Lite](https://football-play-editor.pages.dev) | [Open TFM Playbook](https://tfm-playbook.pages.dev) |

**Not sure which to pick?** If your device is a Windows 10 tablet with 4 GB RAM or a budget Chromebook, start with Lite. If you are on a newer device and want full animation, use TFM Playbook.

---

## What the app does

TFM Playbook is a play-drawing tool for football coaches. You can:

- **Build a playbook** — organize plays by formation
- **Draw plays** — place players, draw routes (straight or curved), add motion and blocking assignments
- **Sequence pre-snap motion** — mark segments as pre-snap, assign a sequence order, and watch players motion one at a time before the snap (full version only)
- **Animate plays** — link routes to players, set per-segment durations and delays, and watch the play run live
- **Choreograph the football** — place a football, set who snaps it, add handoff / toss / pass events with adjustable flight time and intercept targeting
- **Color-code everything** — assign colors to routes and players by role
- **Print wristband cards** — print play diagrams that fit on a coach's wristband card
- **Present on the sideline** — full-screen play display for showing players the play on a tablet or laptop

Your playbook is saved automatically on your computer. Nothing goes to the internet.

---

## How to open the app

1. Open **Google Chrome** on your computer
2. Click the link for the version you want (see table above)
3. That's it — the app loads in your browser. No account needed.

> **Why Chrome?** The app works best in Chrome (version 90 or newer). It also works in Microsoft Edge. Firefox has minor visual differences. Safari on iPhone and iPad has limitations — see the device section below.

---

## How to install it (optional but strongly recommended)

Installing puts a shortcut on your desktop or home screen and lets the app work without internet — important on the sideline where Wi-Fi is unreliable.

**On Windows (Chrome):**
1. Open the app in Chrome
2. Look at the address bar — you will see a small **monitor icon with a down arrow** on the right side
3. Click it → click **Install**
4. A shortcut appears on your desktop and the app opens in its own window

If you do not see the install icon:
1. Click the **three dots** (⋮) in the top-right of Chrome
2. Look for **"Install TFM Playbook"** or **"Install page as app"**

**On iPad (Chrome):**
Install Chrome from the App Store first — Safari on iPad does not support the install feature. Then open the app in Chrome and follow the same steps as Windows.

**On Chromebook:**
Chrome is already installed. Open the app, click the install icon in the address bar. The app will appear in your launcher.

Once installed, the app loads instantly and works completely offline.

---

## Recommended hardware

### Primary target — works well, tested

| Device type | Notes |
|---|---|
| **Windows 10 / 11 tablet** (4 GB+ RAM) | The main target. Use Lite if the device is older than 2018 or has exactly 4 GB RAM. |
| **Windows 10 / 11 laptop** | Works well on any modern laptop. Full version is fine on any laptop from 2016 or newer. |
| **Surface Pro / Surface Go** | Excellent. Touch and keyboard both work. Use full version. |
| **Chromebook** (4 GB+ RAM) | Works well. Chrome is built in. |
| **iPad** (Air, Pro, or 2019+) | Works well in Chrome. Safari has limitations. See FAQ. |

### Acceptable — use Lite version

| Device type | Notes |
|---|---|
| **Windows tablet** (2 GB RAM, older than 2018) | Use Lite. Close all other browser tabs before opening. |
| **Budget Chromebook** (2 GB RAM) | Use Lite. One tab at a time. |
| **Older iPad** (pre-2019) | Use Lite in Chrome if possible. Expect slower drawing. |

### Not recommended

| Device type | Why |
|---|---|
| **Android tablet** | Browser inconsistencies affect drawing and touch handling. Not tested. |
| **Phone (any)** | Screen is too small for the field editor. Phone support is planned. |
| **Windows 7 / 8 machines** | Chrome no longer updates on these. Security risk and compatibility issues. |

---

## Browser and software setup

### Chrome setup (recommended)

1. Make sure Chrome is up to date: click ⋮ → Help → About Google Chrome. It will update automatically.
2. Install the app as a PWA (see above) — this gives the best performance and offline access.
3. Do not use **Incognito mode** — your playbook will not save between sessions in Incognito.
4. Do not **clear browsing data** unless you have exported your playbook first. Clearing site data deletes your saved plays.

### Edge setup

Edge works well as a fallback. The install process is the same — look for the install icon in the address bar.

### Device-specific configuration

**Windows tablets — touch optimization:**
- Set display scaling to **100%** for accurate touch targets. (Settings → Display → Scale)
- If tap targets feel small, try **125%** scaling — the app's touch targets are sized for 44px minimum at 100%.
- Disable **palm rejection** settings that might interfere with drawing on the canvas.
- If the on-screen keyboard pops up unexpectedly when tapping inspector fields, dismiss it with the keyboard button in the taskbar.

**Surface Pro / Go with keyboard:**
- Keyboard shortcuts work: **Ctrl+Z** for Undo, **Delete** to remove selected elements, **Shift** to constrain angles while drawing.
- The stylus works for drawing routes — treat it like a finger.

**Chromebook:**
- Chrome is already the default browser — no setup needed.
- If Chrome asks to update, do it before a game day. Updates can take a few minutes.
- Chromebooks with Android app support: use the Chrome browser version, not an Android app. There is no Android app.

**iPad:**
- Install **Google Chrome from the App Store** first.
- Open the app in Chrome, not Safari. Safari on iPad does not support the install-as-app feature and has animation rendering differences.
- If the keyboard appears when tapping a text field in the inspector, it can push the layout up — dismiss it with the keyboard dismiss button (⌨ ↓) in the bottom-right of the keyboard.

**Low-RAM devices (4 GB or less):**
- Use **TFM Playbook Lite**.
- Close all other browser tabs before opening the app.
- Close other apps running in the background.
- If the app feels slow after a long session, refresh the page — this clears any memory buildup.
- Disable animation (tap the **Anim** toggle in the animation bar) if playback is choppy. The app works fully without animation.

---

## Recent updates

**Live now in TFM Playbook (full version):**

| Shipped | What's new |
|---|---|
| ✅ | **Rugged UI overhaul** — the entire interface has been redesigned with a tactical hardware aesthetic. Buttons have physical depth and press down when tapped. Every screen — editor, card views, Present Mode — uses the same visual system. |
| ✅ | **Theme-aware chrome** — all controls (toolbar, toolbox, inspector, animation bar) now pull from the active theme. Switching themes updates everything uniformly. |
| ✅ | **TFM brand button** — the logo and app name in the header is now a button that links to [techfreedomministries.org](https://techfreedomministries.org/). |
| ✅ | **Haptic feedback** — on supported devices (Android tablets, phones), tapping any tool or action button produces a short 12ms click pulse. |
| ✅ | **New toolbar icons** — Undo, Redo, Flip H, and Flip V now use clean Heroicons instead of Unicode symbols. |
| ✅ | **Clear button guard** — the Clear button is now visually distinct (orange border, heavier weight) and pinned to the far right so it is never accidentally tapped. |
| ✅ | **Present Mode controls** — the navigation arrows and the Hide/Show toggle now match the app theme instead of appearing as transparent overlays. |
| ✅ | **Pre-snap motion sequencing** — mark route segments as pre-snap and assign a sequence order (1, 2, 3...). Players motion one at a time before the snap, enforcing the NFL one-player-in-motion rule. Ball snaps automatically 0.1s after the last pre-snap motion completes. |
| ✅ | **Football animation** — place a football, set a snap target, add handoff / toss / pass events, then hit play to watch the play run |
| ✅ | **Per-event flight duration** — set how long each pass/toss/handoff takes in the football inspector |
| ✅ | **Intercept node** — drag the yellow diamond on the field to set exactly where a pass/toss lands |
| ✅ | **Hide/show panel** in Present Mode — collapse the bottom controls so the play fills the screen |
| ✅ | **In-flight ring** — football glows yellow while in motion |
| ✅ | **Undo preserves selection** — pressing Undo no longer deselects the element you were editing |
| ✅ | **Print queue live-resolve** — editing a play after adding it to the print queue now shows the updated version at print time |
| ✅ | **Storage full warning** — if your browser storage fills up, a banner appears before you lose any work |
| ✅ | **Duration slider** — dragging the segment duration slider no longer generates 50 undo steps per drag |

### What's planned next

| Status | Item |
|---|---|
| 🔜 Planned | **Knurled timeline scrubber** — custom ribbed thumb on the animation bar slider (currently uses browser default) |
| 🔜 Planned | **Toggle switches** — inspector boolean controls redesigned as rocker switches (currently uses checkboxes) |
| 🔜 Planned | Flight duration slider layout cleanup |
| 💤 Deferred | **Phone support** — waiting until animation is fully stable on tablets first |
| 💤 Deferred | **Route branching** (option routes — click an existing route to fork) |
| 💤 Deferred | **Dashed line per-segment** — checkbox exists in inspector but applies to the whole route |
| 💤 Deferred | **Manual curve control point** — curves use automatic tension only |

⏳ = In flight  ✅ = Shipped  🔜 = Planned next  💤 = Deferred (not scheduled)

---

## For testers — how to report issues

1. Note what you were doing — which playbook, formation, play, and tool.
2. Take a screenshot if it is a visual problem.
3. Hard-refresh the page (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) and note if the issue comes back.
4. Send the screenshot and short description to Christopher.

**Things that are intentionally limited:**

- Phone screens are not supported yet.
- Right-click to finish a route only works on desktop — use the **Done** button on touch.
- Dashed line style applies to the whole route, not per segment.
- Curve control points use auto-tension; manual drag is deferred.
- Drawing preview only appears while a finger is touching the screen — no hover state on touch devices.

---

## Your playbook stays on your computer

All plays and playbooks are saved locally in your browser. Nothing is sent to a server. If you clear your browser data or switch to a different device, your playbook will not be there.

**Before switching devices or clearing your browser:**
1. Open your playbook
2. Tap **Export** — this saves a `.json` file to your Downloads folder
3. On the new device, tap **Import** and select that file

Keep your export file somewhere safe — a USB drive, email attachment, or cloud folder.

---

## Frequently asked questions

**Can I use this on my phone?**
Not yet. The field editor needs a screen at least 10 inches wide to be usable. Phone support is planned after the animation feature is fully stable on tablets.

**Can two coaches share a playbook?**
Yes. One coach exports the playbook (tap Export → saves a file). Send that file by email, text, AirDrop, or USB. The other coach taps Import and selects the file. Both coaches then have independent copies — changes one coach makes do not automatically sync to the other.

**Is this free?**
Yes. No account, no subscription, no cost — ever.

**Who made this?**
Tech Freedom Ministries. A nonprofit that builds free tools for communities. [techfreedomministries.com](https://techfreedomministries.com)

**Does it work without internet?**
Yes, once installed. The first time you open the app it needs internet to load. After that, install it as an app (see above) and it works completely offline — including on the sideline.

**Why does it ask to update sometimes?**
The app updates itself in the background like any website. When a new version is ready, your browser may show a small notification or the app may reload after you close and reopen it. You do not need to do anything — updates are automatic and your playbook data is never affected by updates.

**I accidentally deleted something. Can I get it back?**
Yes — tap **Undo** (↩ in the toolbar) immediately. The app keeps a full undo history for the current session. If you refresh the page or close the app, the undo history is gone, so act fast. This is why Export is a good habit after long editing sessions.

**My playbook disappeared after I cleared my browser history.**
Clearing browser history, cookies, or site data also clears saved app data. The playbook lives in your browser's local storage. Always export a backup before clearing anything. If you already cleared it and have no backup, the data cannot be recovered.

**I see a yellow banner that says "Storage full."**
Your browser's local storage is running out of space. This happens when you have many large playbooks saved. Do this immediately:
1. Tap **Export** to save a backup of your current playbook to a file.
2. Delete playbooks you no longer need (tap the playbook card → Delete).
3. The banner will disappear once there is enough space to save again.
If the banner keeps coming back, you may have too many plays with complex routes. Exporting and deleting older playbooks is the fix.

**The app is slow or choppy on my tablet.**
A few things to try, in order:
1. Close all other browser tabs.
2. Turn off the **Anim** toggle in the animation bar — the app works fully without animation and this alone can make a big difference on older tablets.
3. Refresh the page (this clears memory buildup from a long session).
4. If it is still slow, switch to **TFM Playbook Lite** — it loads faster and uses less memory because animation is not included.

**Animation plays but players move at the wrong time.**
Check that each player's route is linked to that player. In the inspector (tap a player), look for **Route: None**. If it says None, the player has no linked route and will not animate. Use the route dropdown to link them.

**Pre-snap motion plays all at once instead of one at a time.**
Each segment needs a sequence number — the number controls the order. Tap a route to select it, then tap a segment's **Pre-snap** button to assign it a number. If two segments have the same number, they will both animate at the same time (which may be intentional — two players in unison). To enforce one-at-a-time, make sure each pre-snap segment has a unique number.

**The football doesn't move during animation.**
The football needs a **snap target** set in its inspector. Tap the football → inspector → under Journey, tap the **Snap to** field and select the center or QB. Without a snap target, the football sits still.

**Print PDF opens a blank page or cuts off the cards.**
When printing, set these options in the print dialog:
- Paper size: **Letter**
- Orientation: **Landscape**
- Scale / margins: **100%** (or "Actual size") — do not use "Fit to page"
- Headers and footers: **Off**

**Chrome says "Install" but nothing happens.**
This can happen if Chrome is not fully up to date, or if you already installed the app once and it is already on your desktop. Check your desktop or Start menu for a TFM Playbook shortcut — it may already be there.

**I'm on an iPad and the install option doesn't appear.**
Safari on iPad does not support installing web apps the same way Chrome does. Install Google Chrome from the App Store, open the app in Chrome, then use Chrome's install option. Alternatively, in Safari you can tap the Share button (□↑) → **Add to Home Screen** — this adds a shortcut but it will not work offline.

---

## Minimum requirements

| | Minimum | Recommended |
|---|---|---|
| **Computer** | Windows 10 tablet or laptop, 4 GB RAM | Windows 11 laptop or tablet, 8 GB RAM |
| **Browser** | Google Chrome version 90+ | Latest Chrome or Edge |
| **Screen** | 10 inches (for field editor) | 12 inches or larger |
| **Internet** | Required first load only (offline after install) | — |
| **Storage** | ~5 MB free browser storage | ~50 MB for large playbooks |

Chromebooks, Macs, and iPads also work but are not the primary target.

---

## For developers

Stack: React, Vite, Konva, Zustand, Cloudflare Pages.

- `lite` branch → [football-play-editor.pages.dev](https://football-play-editor.pages.dev) (stable, feature-frozen at v1.0.0)
- `main` branch → [tfm-playbook.pages.dev](https://tfm-playbook.pages.dev) (active development)

See `CLAUDE.md` for full build state, architecture notes, and session protocol.
