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
- **Color-code everything** — assign colors to routes and players by role
- **Print wristband cards** — print play diagrams that fit on a coach's wristband card
- **Present on the sideline** — full-screen play display for showing players the play on a tablet or laptop

Your playbook is saved automatically on your computer. Nothing goes to the internet.

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
