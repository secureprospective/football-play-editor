# UI_OVERHAUL_SPEC.md
**Project:** Football Play Editor — Rugged Tactical UI Overhaul
**For:** Claude Code
**Status:** Approved design direction. Implement exactly as specified.

---

## How to Use This Document

Read this entire file before touching a single file. This is not a loose brief — it is a precision spec. Every measurement, shadow value, and behavioral rule is intentional. When you encounter a decision point not covered here, default to the principle in Section 1. Do not substitute your own aesthetic judgment.

This document covers the UI chrome only. **The Konva canvas is off-limits. Do not touch any canvas rendering logic.**

---

## Section 1 — Design Directive

The objective is to replace the current flat web aesthetic with a **rugged, injection-molded hardware interface**. Think: Dell Latitude Rugged laptop chassis, UAG phone case construction, military field terminal bolted inside a Pelican case lid. The interface should look like something you could drop on a sideline, toss in the back of a truck, and pick up still working.

The user base is mechanically minded. They trust gear that looks structural, not decorative. Every UI decision must reinforce two psychological signals:

1. **This is built to take abuse.** Surfaces have weight. Controls have depth. Nothing looks fragile.
2. **State is absolutely certain.** A pressed button looks unmistakably different from an unpressed one. There is no ambiguity about what is active.

The aesthetic is achieved entirely through CSS — shadow direction, inset vs outset, border contrast, and subtle surface gradients. No images, no SVGs, no icon fonts beyond what already exists.

---

## Section 2 — The Token Architecture

All visual properties must be implemented as CSS custom properties on each theme class. **This is the non-negotiable structural rule.** Every component reads from these tokens. No component has hardcoded colors, shadows, or gradients.

The existing codebase uses theme classes applied to the root element (e.g. `.theme-dark-cyan`, `.theme-dark-orange`, `.theme-light`, `.theme-sand`). Add the following token groups to each theme class in `themes.css`. The HTML and component CSS files must reference only these variables — never raw hex values.

### Token Groups Required

```css
/* Applied to each theme class */

/* Surface hierarchy */
--s-canvas          /* The field background. Do not change — it is set by the field renderer. */
--s-panel           /* Top bar and side rail background */
--s-panel-deep      /* Animation bar and toolbelt background — slightly darker/deeper than panel */
--s-border-hard     /* The structural seam color — the darkest border, used for all outer edges */

/* Button states */
--s-btn-face        /* Raised button surface — a two-stop gradient simulating molded plastic */
--s-btn-active-face /* Active/pressed button surface — darker, recessed */
--s-btn-raised      /* Box-shadow for unselected raised state */
--s-btn-pressed     /* Box-shadow for active/selected pressed state */

/* Panel structural shadows */
--s-panel-shadow    /* Top bar: inset highlight top + drop shadow bottom */
--s-rail-shadow     /* Toolbelt right edge shadow */
--s-bar-shadow      /* Animation bar top edge shadow */

/* Recessed wells */
--s-well            /* Background for inset elements: timeline track, text inputs */
--s-well-shadow     /* Inset shadow for recessed elements */

/* Accent (theme color — drives all active states) */
--s-accent          /* Two-stop gradient for active button face and Anim tab */
--s-accent-border   /* Solid border color to pair with accent gradient */
--s-accent-text     /* Text/icon color on top of accent surface */

/* Danger (destructive actions) */
--s-danger          /* Text/icon color for Clear button */
--s-danger-border   /* Border color for Clear button */
--s-danger-face     /* Background gradient for Clear button */

/* Text */
--s-text-muted      /* Default icon and label color — readable but recessed */
--s-text-dim        /* Very muted — for secondary labels, placeholders, readouts */

/* Decorative hardware details */
--s-rivet           /* Radial gradient for rivet/bolt head decorations */
--s-rivet-shine     /* 1px highlight on rivet top edge */
--s-knurl           /* Color of the ribbing pattern on the timeline thumb */

/* Play/transport button */
--s-play-border     /* Border color for play button */
--s-play-color      /* Icon color for play button */
--s-play-face       /* Background gradient for play button */
```

### Token Values by Theme

#### Dark Charcoal — Cyan accent
```css
.theme-dark-cyan {
  --s-panel:           #1e2229;
  --s-panel-deep:      #191d23;
  --s-border-hard:     #0a0c0e;
  --s-btn-face:        linear-gradient(160deg, #2d333d 0%, #242930 100%);
  --s-btn-active-face: linear-gradient(160deg, #1a2028 0%, #131820 100%);
  --s-btn-raised:      0 2px 0 #0a0c0e, inset 0 1px 0 rgba(255,255,255,0.07);
  --s-btn-pressed:     inset 0 2px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
  --s-panel-shadow:    inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.4);
  --s-rail-shadow:     inset -1px 0 0 rgba(255,255,255,0.02), 2px 0 5px rgba(0,0,0,0.3);
  --s-bar-shadow:      inset 0 1px 0 rgba(255,255,255,0.04), 0 -2px 5px rgba(0,0,0,0.3);
  --s-well:            #0c0f13;
  --s-well-shadow:     inset 2px 2px 4px rgba(0,0,0,0.5);
  --s-accent:          linear-gradient(180deg, #00d4ff 0%, #00a8cc 100%);
  --s-accent-border:   #007a99;
  --s-accent-text:     #001a22;
  --s-danger:          #ff6b00;
  --s-danger-border:   #3a1a0a;
  --s-danger-face:     linear-gradient(160deg, #2a1a0d 0%, #1a0f06 100%);
  --s-text-muted:      #606878;
  --s-text-dim:        #3a4150;
  --s-rivet:           radial-gradient(circle at 35% 35%, #3a4150, #0d0f12);
  --s-rivet-shine:     rgba(255,255,255,0.04);
  --s-play-border:     #1a3a1a;
  --s-play-color:      #44cc66;
  --s-play-face:       linear-gradient(160deg, #1a2a1a 0%, #111a11 100%);
  --s-knurl:           rgba(255,255,255,0.12);
}
```

#### Dark Charcoal — Orange accent
```css
.theme-dark-orange {
  /* All --s-panel, --s-panel-deep, --s-border-hard, --s-btn-*, --s-well-*,
     --s-text-*, --s-rivet-*, --s-play-*, --s-knurl identical to theme-dark-cyan */
  --s-accent:          linear-gradient(180deg, #ff8c2a 0%, #d96000 100%);
  --s-accent-border:   #a04000;
  --s-accent-text:     #1a0800;
  --s-danger:          #ff6b00;
  --s-danger-border:   #3a1a0a;
  --s-danger-face:     linear-gradient(160deg, #2a1a0d 0%, #1a0f06 100%);
}
```

#### Light — Teal accent
```css
.theme-light {
  --s-panel:           #e0e4ea;
  --s-panel-deep:      #d8dce4;
  --s-border-hard:     #b0b8c4;
  --s-btn-face:        linear-gradient(160deg, #eaeef4 0%, #d8dce6 100%);
  --s-btn-active-face: linear-gradient(160deg, #c8d0dc 0%, #bcc4d0 100%);
  --s-btn-raised:      0 2px 0 #a0a8b4, inset 0 1px 0 rgba(255,255,255,0.7);
  --s-btn-pressed:     inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
  --s-panel-shadow:    inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.12);
  --s-rail-shadow:     inset -1px 0 0 rgba(255,255,255,0.5), 2px 0 5px rgba(0,0,0,0.1);
  --s-bar-shadow:      inset 0 1px 0 rgba(255,255,255,0.6), 0 -2px 5px rgba(0,0,0,0.1);
  --s-well:            #c8cdd8;
  --s-well-shadow:     inset 2px 2px 4px rgba(0,0,0,0.12);
  --s-accent:          linear-gradient(180deg, #1db88a 0%, #148c66 100%);
  --s-accent-border:   #0a6644;
  --s-accent-text:     #ffffff;
  --s-danger:          #cc4400;
  --s-danger-border:   #aa3300;
  --s-danger-face:     linear-gradient(160deg, #f0d4c4 0%, #e4c0a8 100%);
  --s-text-muted:      #6a7280;
  --s-text-dim:        #9aa0aa;
  --s-rivet:           radial-gradient(circle at 35% 35%, #c8ccd4, #90949c);
  --s-rivet-shine:     rgba(255,255,255,0.8);
  --s-play-border:     #0a6644;
  --s-play-color:      #148c66;
  --s-play-face:       linear-gradient(160deg, #d4ece4 0%, #c4e0d4 100%);
  --s-knurl:           rgba(0,0,0,0.12);
}
```

#### Warm Sand — Red accent
```css
.theme-sand {
  --s-panel:           #ddd8ce;
  --s-panel-deep:      #d4cfc4;
  --s-border-hard:     #a89e90;
  --s-btn-face:        linear-gradient(160deg, #e8e2d8 0%, #d8d2c6 100%);
  --s-btn-active-face: linear-gradient(160deg, #c8c0b4 0%, #bcb4a8 100%);
  --s-btn-raised:      0 2px 0 #908880, inset 0 1px 0 rgba(255,255,255,0.6);
  --s-btn-pressed:     inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
  --s-panel-shadow:    inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.12);
  --s-rail-shadow:     inset -1px 0 0 rgba(255,255,255,0.4), 2px 0 5px rgba(0,0,0,0.1);
  --s-bar-shadow:      inset 0 1px 0 rgba(255,255,255,0.5), 0 -2px 5px rgba(0,0,0,0.1);
  --s-well:            #c0b8ac;
  --s-well-shadow:     inset 2px 2px 4px rgba(0,0,0,0.12);
  --s-accent:          linear-gradient(180deg, #e03030 0%, #b82020 100%);
  --s-accent-border:   #881818;
  --s-accent-text:     #ffffff;
  --s-danger:          #cc2200;
  --s-danger-border:   #881800;
  --s-danger-face:     linear-gradient(160deg, #e8d0c8 0%, #dcc0b4 100%);
  --s-text-muted:      #786860;
  --s-text-dim:        #a09088;
  --s-rivet:           radial-gradient(circle at 35% 35%, #c8c0b4, #888078);
  --s-rivet-shine:     rgba(255,255,255,0.7);
  --s-play-border:     #881818;
  --s-play-color:      #cc2828;
  --s-play-face:       linear-gradient(160deg, #e8ccc8 0%, #dcbcb8 100%);
  --s-knurl:           rgba(0,0,0,0.1);
}
```

---

## Section 3 — The 3D Bevel System

This is the core visual mechanic. Every interactive element operates on a strict raised/pressed binary. There is no hover state that blurs the two — hover may lighten the icon color only. The physical state is either up or down.

### Raised State (unselected, available)

Simulates a chunky plastic button sitting 2–3px above the faceplate surface. Light source is top-left at 45°.

```
box-shadow: var(--s-btn-raised);
background: var(--s-btn-face);
border: 1px solid var(--s-border-hard);
border-radius: 2px;  /* tight — not soft. This is machined, not molded round */
transform: none;
```

The `--s-btn-raised` value provides two layers:
- `0 2px 0 [dark color]` — the hard bottom edge shadow, making the button appear to sit above the surface
- `inset 0 1px 0 rgba(255,255,255,N)` — the top specular highlight, simulating light catching the top edge

The gradient on `--s-btn-face` runs from slightly lighter at the top to slightly darker at the bottom — 10 to 15% lightness difference. Never flat. Never glossy.

### Pressed State (active, selected)

Simulates the button physically locked into a recessed socket in the faceplate.

```
box-shadow: var(--s-btn-pressed);
background: var(--s-btn-active-face);
border: 1px solid var(--s-accent);  /* accent color on active, --s-border-hard on inactive */
border-radius: 2px;
transform: translateY(2px);  /* physical downward travel */
```

The `--s-btn-pressed` value provides two layers:
- `inset 0 2px 4px rgba(0,0,0,N)` — deep internal shadow from the top, making the inside of the socket dark
- `inset 0 1px 0 rgba(255,255,255,N)` — tiny residual inner highlight so the socket doesn't go completely dead

The `translateY(2px)` is mandatory. It makes the button visibly travel downward on activation — the core physiological signal that something physically moved.

### Transition

```css
transition: transform 0.06s ease, box-shadow 0.06s ease, background 0.06s ease;
```

Fast. Snappy. This is a mechanical click, not a smooth animation.

---

## Section 4 — Component Specifications

### 4.1 Top Bar (`Toolbar.css` or equivalent)

**Container:**
```css
height: 44px;
background: var(--s-panel);
border-bottom: 1px solid var(--s-border-hard);
box-shadow: var(--s-panel-shadow);
padding: 0 8px;
display: flex;
align-items: center;
gap: 4px;
```

**Breadcrumb tabs** (Plays, Formation, Play name, Present):

Each tab is a button. They use the standard raised/pressed bevel system. Active tab (current screen) uses `--s-accent` as background and `--s-accent-text` as text color in pressed state. Inactive tabs use muted text on raised face.

```css
height: 30px;
padding: 0 12px;
font-size: 11px;
font-weight: 700;
letter-spacing: 0.04em;
text-transform: uppercase;
/* Apply raised or pressed system per state */
```

The separator character between breadcrumbs (`›`) is plain text, `color: var(--s-text-dim)`, no button treatment.

**Toolbar action buttons** (Undo, Redo, Flip H, Flip V, Snap, LOS, Export, Import):

Same bevel system. Inactive = raised. Active (Snap when on, LOS when on) = pressed with accent border.

**LOS button when active:** Uses `border-color: #b8960a` and `color: #c8a010` instead of the theme accent. The LOS indicator is a field element — it uses construction yellow on every theme, never the theme accent color. This is intentional and must not be changed.

**Clear button:**
```css
border-color: var(--s-danger-border);
color: var(--s-danger);
background: var(--s-danger-face);
/* Uses the raised bevel — it is NOT pressed by default */
/* It does NOT get the accent border treatment */
```

**Playbook name label** (center of top bar):

Not a button. Plain text.
```css
font-size: 11px;
font-weight: 700;
letter-spacing: 0.1em;
text-transform: uppercase;
color: var(--s-text-dim);
```

---

### 4.2 Left Toolbelt (`Toolbar.css` — sidebar section)

**Container:**
```css
width: 52px;
background: var(--s-panel-deep);
border-right: 1px solid var(--s-border-hard);
box-shadow: var(--s-rail-shadow);
display: flex;
flex-direction: column;
align-items: center;
padding: 8px 0;
gap: 4px;
position: relative;
```

**Rivet decorations** — two small circles, top and bottom of the rail, simulating structural fasteners:

```css
.toolbelt::before,
.toolbelt::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--s-rivet);
  border: 1px solid var(--s-border-hard);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 var(--s-rivet-shine);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.toolbelt::before { top: 6px; }
.toolbelt::after  { bottom: 6px; }
```

These are non-interactive. They are purely structural decoration. They look like recessed hex bolt heads or rivets stamped into the rail surface.

**Tool buttons:**
```css
width: 38px;
height: 38px;
/* Apply the full raised/pressed bevel system */
/* Minimum 38px — this is a touch target on a tablet */
```

Active tool: full pressed state — accent background, translateY(2px), inset shadow.

**Divider between tool groups:**
```css
width: 28px;
height: 1px;
background: var(--s-border-hard);
/* This reads as a structural seam pressed into the rail surface */
```

**Color swatches** (team colors, bottom of toolbelt):

These are lens-style — circular, with a radial highlight simulating a convex plastic lens pressed into the rail.

```css
width: 22px;
height: 22px;
border-radius: 50%;
border: 2px solid var(--s-border-hard);
box-shadow: 0 2px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
/* The inset highlight is what makes it read as a lens, not a flat dot */
```

Selected swatch adds an outer ring:
```css
box-shadow: 0 0 0 2px var(--s-accent-border), 0 2px 4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
```

Do not use a colored border for selected state — a ring offset from the swatch reads more like hardware than a border-color change.

---

### 4.3 Inspector Panel

**Container:**
```css
width: 200px;  /* or current width — do not change layout */
background: var(--s-panel-deep);
border-left: 1px solid var(--s-border-hard);
/* Two rivets, same treatment as toolbelt, positioned top-right and bottom-right */
```

**Section headers** (labels like "Shape", "Label", "Player Color"):
```css
font-size: 9px;
font-weight: 700;
letter-spacing: 0.12em;
text-transform: uppercase;
color: var(--s-text-dim);
margin-bottom: 6px;
```

**Text inputs** (label field, etc.):

These are recessed wells — they sit below the surface, not above it.

```css
height: 30px;
background: var(--s-well);
border: 1px solid var(--s-border-hard);
border-radius: 2px;
box-shadow: var(--s-well-shadow);
color: var(--s-text-muted);
font-family: monospace;  /* engraved placard feel */
font-size: 12px;
font-weight: 700;
padding: 0 8px;
```

**Shape selector** (Circle / Square):

Horizontal segmented button row — two buttons side by side with a 2px gap. Each button uses the full raised/pressed system. Active button is pressed with accent border.

```css
height: 28px;
/* Both buttons same width, flex: 1 */
```

**Boolean toggles** (Snap on/off, Route Visible, etc.):

Implement as a rocker switch — a recessed well track with a sliding thumb inside.

```
[Track] background: var(--s-well), box-shadow: var(--s-well-shadow)
        width: 40px, height: 20px, border-radius: 2px

[Thumb] width: 18px, height: 16px
        background: var(--s-btn-face)
        box-shadow: var(--s-btn-raised)
        position: absolute, top: 1px
        OFF: left: 1px
        ON:  left: 19px, background: var(--s-accent), box-shadow: var(--s-btn-pressed)
```

Pair with a small LED indicator dot next to the label:

```css
.led-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid var(--s-border-hard);
  display: inline-block;
  margin-right: 5px;
}
.led-dot.off { background: var(--s-well); }
.led-dot.on  { background: var(--s-play-color); box-shadow: 0 0 4px var(--s-play-color); }
```

The glow on the ON state (`box-shadow` with the same color) is the one place a glow effect is used. It simulates a lit indicator LED. Keep the radius tight — `4px` maximum.

**Color picker in inspector** (if present):

Same lens treatment as the toolbelt swatches. Row of circles, selected has the ring offset.

---

### 4.4 Animation Bar (`AnimationBar.css`)

**Container:**
```css
height: 48px;
background: var(--s-panel-deep);
border-top: 1px solid var(--s-border-hard);
box-shadow: var(--s-bar-shadow);
display: flex;
align-items: center;
gap: 8px;
padding: 0 10px;
```

**Anim tab:**

Uses `--s-accent` as background. This is always in the pressed/active state visually — it is the active mode indicator, not a button to press.

```css
height: 30px;
padding: 0 10px;
background: var(--s-accent);
border: 1px solid var(--s-accent-border);
border-radius: 2px;
color: var(--s-accent-text);
font-size: 10px;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
box-shadow: 0 2px 0 var(--s-accent-border), inset 0 1px 0 rgba(255,255,255,0.15);
```

**Transport buttons** (rewind, play/pause):

Standard raised bevel. Play button gets its own distinct housing color using `--s-play-*` tokens — it reads as a different class of control from the rewind button.

```css
width: 34px;
height: 34px;
/* raised bevel, border-radius: 3px */
```

Play button specifically:
```css
background: var(--s-play-face);
border-color: var(--s-play-border);
color: var(--s-play-color);
```

**Timeline track:**

A recessed well — not a thin line, a visible carved slot.

```css
flex: 1;
height: 14px;
background: var(--s-well);
border: 1px solid var(--s-border-hard);
border-radius: 2px;
box-shadow: var(--s-well-shadow);
position: relative;
```

**Timeline thumb:**

A chunky rectangular knob — physically grippable, with knurling lines simulating ribbed plastic.

```css
width: 20px;
height: 20px;  /* taller than the track — it overhangs both edges */
background: var(--s-btn-face);
border: 1px solid var(--s-border-hard);
border-radius: 2px;
position: absolute;
top: 50%;
transform: translateY(-50%);
box-shadow: var(--s-btn-raised);
```

Knurling pseudo-element:
```css
.timeline-thumb::before {
  content: '';
  position: absolute;
  inset: 3px 4px;
  background: repeating-linear-gradient(
    90deg,
    var(--s-knurl) 0px,
    var(--s-knurl) 1px,
    transparent 1px,
    transparent 4px
  );
}
```

The knurling lines run vertically across the thumb face. They simulate the ribbed grip surface of a physical slider knob — the kind you'd find on a mixing board or a camera lens control.

**Time readout:**
```css
font-size: 10px;
font-weight: 700;
color: var(--s-text-dim);
font-family: monospace;
letter-spacing: 0.06em;
white-space: nowrap;
```

**Speed selector (1x dropdown):**

Styled as a small raised control to match the button language — not a raw browser select element.

```css
height: 28px;
background: var(--s-btn-face);
border: 1px solid var(--s-border-hard);
border-radius: 2px;
box-shadow: var(--s-btn-raised);
color: var(--s-text-muted);
font-size: 10px;
font-weight: 700;
padding: 0 6px;
```

**Clear button — Guarded Emergency Stop:**

This is the most important individual component in the animation bar. It must look categorically different from everything else — not just a different color, but a different class of object.

The concept: a protected emergency shutoff button inside a raised outer guard ring. The user must consciously reach inside the guard to press the button.

```css
/* Outer guard ring */
.clear-guard-ring {
  width: 38px;
  height: 38px;
  background: var(--s-danger-face);
  border: 2px solid var(--s-danger-border);  /* 2px — heavier than everything else */
  border-radius: 3px;
  box-shadow: 0 2px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,100,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* The actual button text sits inside */
.clear-guard-ring span {
  font-size: 9px;
  font-weight: 700;
  color: var(--s-danger);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  line-height: 1.2;
  pointer-events: none;
}
```

The visual read: an orange/danger-colored box with a heavier border than anything else on screen. The border acts as the protective ring. The label sits in the recessed interior. The user cannot accidentally brush this — its visual weight demands conscious intention.

On `:active` press, it applies a brief inset shadow like the pressed button state, but never gets `translateY` — this button should not feel like it travels down casually.

---

## Section 5 — Structural Seams

Every major panel boundary (top bar bottom edge, toolbelt right edge, inspector left edge, animation bar top edge) must read as a physical seam — a pressed groove in the material.

The seam is not a single border. It is two lines:

```
[Panel edge]  → 1px dark line (var(--s-border-hard)) 
[Adjacent surface] → inset shadow catching the edge
```

The `box-shadow` on each panel container provides the second line implicitly through the inset highlight. This dual-line treatment is what makes a border read as a physical groove rather than a flat dividing line.

Do not add extra border elements to achieve this — the existing `border` + `box-shadow` combination on each container is sufficient.

---

## Section 6 — Typography Rules

These rules apply to all UI chrome text. Canvas labels are not affected.

- Font stack: `'SF Mono', 'Consolas', 'Courier New', monospace` for all button labels, input fields, readouts, and section headers. The monospace stack gives the mechanical, engraved-placard quality appropriate to this aesthetic.
- All text in buttons and section labels: `text-transform: uppercase`, `letter-spacing: 0.05em` minimum
- Font weights: 700 for active labels, 600 for inactive labels, 400 for placeholder/dim text
- No font sizes below 9px
- No italic text anywhere in the UI chrome

---

## Section 7 — Touch Target Requirements

This app runs on tablets and Chromebooks operated by people with large hands, often outdoors, often under time pressure.

- Primary tool buttons (toolbelt): minimum 38×38px
- Top bar action buttons: minimum 30px height
- Breadcrumb tabs: minimum 30px height
- Transport buttons (anim bar): minimum 34×34px
- Color swatches: minimum 22×22px with at least 4px gap between them
- Timeline thumb: minimum 20×20px overhanging the track

Do not reduce these minimums for visual density. If components are too crowded, increase panel height before reducing touch targets.

---

## Section 8 — Haptic Feedback

Create `src/utils/haptics.js`:

```javascript
export const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(12);
  }
};
```

Wire `triggerHaptic()` to the `onPointerDown` event of:
- All toolbelt tool buttons
- All top bar action buttons
- All breadcrumb tabs
- Transport buttons (rewind, play)
- Shape selector segments
- Rocker switch toggles

Do **not** wire it to:
- The Clear guard button (accidental tap protection — no haptic encourages caution)
- The timeline thumb drag (continuous haptic during drag is disorienting)
- Color swatches (selection, not action)

The 12ms pulse is a single discrete click — short enough to feel mechanical, not long enough to feel like a buzz. It bridges the glass screen and gives the user physical confirmation that a control registered.

---

## Section 9 — What Not to Touch

- **Konva canvas rendering** — zero changes to anything inside the canvas container
- **Field grid lines** — rendered by Konva, not CSS
- **LOS dashed line** — rendered by Konva
- **Player shapes, routes, or any canvas element** — not part of this spec
- **Existing theme switching logic** — add tokens to theme classes, do not refactor how themes are applied
- **Any layout dimensions** that would change the relative size of the canvas vs. the chrome panels — the field must remain the dominant element

---

## Section 10 — Implementation Order

Work in this sequence. Verify each step before proceeding.

1. Add all token variables to `themes.css` for all four theme classes
2. Update `Toolbar.css` — top bar and toolbelt
3. Update `Inspector.css` — inspector panel
4. Update `AnimationBar.css` — animation bar and all transport controls
5. Create `src/utils/haptics.js`
6. Wire haptics into JSX components
7. Build and verify all four themes visually before committing

At each step: make the change, run the build, visually confirm the component in all four themes, then proceed.

---

*Spec version: 1.0 — May 2026*
*Built by: Christopher Campbell + Claude (Anthropic)*
*Do not modify this file during implementation — it is the reference, not a working doc*
