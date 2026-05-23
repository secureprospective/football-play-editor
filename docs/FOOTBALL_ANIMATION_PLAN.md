# Football Animation — Locked Design

This document is the **canonical design** for football animation. It replaces all earlier proposals (A+B with multiple footballs, visibility timing on footballs, etc.). Those are superseded — do not build them.

This plan is **executed AFTER** the architecture refactor in the same session. See `ARCHITECTURE_REFACTOR_PLAN.md` for the refactor that precedes this work.

---

## The Problem

The football is a first-class element in a play. It needs to:

1. Sit on the line of scrimmage (LOS) before the snap, visible to the coach
2. Stay at the LOS during pre-snap motion (motion men move, ball stays put)
3. Transfer to a designated player at the snap (under-center QB, shotgun QB, or direct snap to H-back)
4. Move between players during the play via handoffs, tosses, and passes
5. Be **easy for a coach to draw** — minimal clicks, intuitive UI

---

## The Solution: A Ball "Journey"

One football element. The football has a journey — a script of where the ball is at each moment. The animation runtime computes the ball's position from this journey. The coach edits one journey, not multiple football elements.

### Data Model

```js
// Football element
{
  id: 'fb_xyz',
  type: 'football',
  x: 960,                          // LOS x — slides freely
  y: 850,                          // LOS y — auto-snapped to LOS line
  journey: {
    snapToPlayer: 'player_qb_id',  // who receives the snap; null = no snap (ball stays on ground)
    events: [
      { id: 'evt_1', time: 1.8, type: 'handoff', toPlayer: 'player_rb_id', arcPathId: null },
      { id: 'evt_2', time: 3.5, type: 'pass',    toPlayer: 'player_wr_id', arcPathId: 'path_arc_1' },
    ],
  },
}
```

Notes on the data model:
- `journey.events` is ordered by `time` ascending (enforced on insert)
- Each event has a stable `id` so the inspector can edit/delete by id
- `arcPathId` is null for handoffs, points to a path element for passes and tosses
- `snapTime` is NOT stored — it's derived at runtime from the longest pre-snap segment in the play

### Snap Time Derivation

```js
function getSnapTime(elements) {
  let maxPreSnap = 0;
  for (const el of elements) {
    if (el.type !== 'path' || !el.segments) continue;
    let preSnapDuration = 0;
    for (const seg of el.segments) {
      if (seg.preSnap) preSnapDuration += seg.duration ?? 0.5;
      else break;  // pre-snap segments are at the start of a route only
    }
    maxPreSnap = Math.max(maxPreSnap, preSnapDuration);
  }
  return maxPreSnap;  // 0 if no pre-snap segments anywhere
}
```

If no pre-snap segments exist on any route, `snapTime = 0` — ball snaps immediately at play start.

---

## Runtime Logic — `footballPositionAtTime`

A new pure function in `src/utils/animationRuntime.js`:

```js
function footballPositionAtTime(football, players, paths, t, snapTime) {
  // Phase 1: pre-snap — ball on the ground at LOS
  if (t < snapTime) {
    return { x: football.x, y: football.y };
  }

  // Phase 2: walk events to find current carrier or in-flight state
  const journey = football.journey;
  if (!journey?.snapToPlayer) {
    return { x: football.x, y: football.y };  // no snap defined, ball stays on ground
  }

  let currentCarrier = journey.snapToPlayer;
  const events = (journey.events || []).slice().sort((a, b) => a.time - b.time);

  for (const event of events) {
    if (t < event.time) break;  // event is in the future

    if (event.type === 'handoff') {
      currentCarrier = event.toPlayer;
      continue;
    }

    if (event.type === 'pass' || event.type === 'toss') {
      const arcPath = paths.find(p => p.id === event.arcPathId);
      const arcDuration = arcPath ? getPathDuration(arcPath) : 0;
      const arcEndTime = event.time + arcDuration;

      if (t < arcEndTime) {
        // Ball is in-flight along the arc
        const arcT = t - event.time;
        return playerPositionAtTime(arcPath, arcT);
      }

      currentCarrier = event.toPlayer;
      continue;
    }
  }

  // Ball is attached to currentCarrier — use carrier's animated position + offset
  const carrierPos = getPlayerAnimatedPos(currentCarrier, t);
  return {
    x: carrierPos.x + FIELD_CONFIG.PLAYER_RADIUS,
    y: carrierPos.y,
  };
}
```

Update `computePositions` to call this for football elements.

---

## Coach UX — How a Play Gets Built

### Placing the Ball

1. Coach clicks the football tool → clicks anywhere on the field
2. Football auto-snaps to the LOS y-coordinate
3. Coach can drag horizontally along the LOS to position laterally
4. Cannot move off the LOS (y is locked to LOS, x is free between field bounds)

### Designating the Snap Recipient

1. Coach selects the football
2. Inspector shows "Snap to: [dropdown of all players]"
3. Coach picks (e.g.) the QB
4. Done — ball will transfer from LOS to QB at snap time

### Adding a Handoff

1. With the football selected, click "+ Add Handoff"
2. Inspector shows a new event row: "Handoff to [player dropdown] at [time slider]"
3. Coach picks the receiving player and sets the time
4. Done — no arc drawing needed; ball transitions instantly at that time

### Adding a Pass or Toss

1. With the football selected, click "+ Add Pass" or "+ Add Toss"
2. Inspector shows a new event row: "Pass to [player dropdown] at [time slider]" + "Draw arc" button
3. Coach picks receiver and sets release time
4. Coach clicks "Draw arc" → enters arc-drawing mode
5. Using existing straight/curve route tools, coach draws the ball's flight path
6. On Enter/finish, the drawn path is auto-linked to this event (`arcPathId` set)
7. Returns to football inspector

The flight duration is the total duration of all segments in the drawn arc path. Coach can adjust segment durations the same way they do for player routes.

### Editing or Deleting an Event

- Each event row has an edit affordance (change player, time, redraw arc) and a delete button
- Events auto-resort by time on edit

---

## Pre-Snap Behavior (Locked)

- Ball is **visible** during pre-snap, sitting at its LOS position
- Players in motion during pre-snap segments move around the ball (ball doesn't move with anyone)
- At `snapTime`, ball transitions to `snapToPlayer` (instant attachment swap)
- If `snapToPlayer` is null, ball stays on the ground for the whole play (legal but rare)

---

## The Three Event Types — Functional Spec

| Type     | Coach Use Case                            | Mechanic                                      | Drawing Required |
|----------|-------------------------------------------|-----------------------------------------------|------------------|
| Handoff  | Players close enough to physically hand   | Instant attachment swap to `toPlayer`         | No               |
| Toss     | Short pitch behind LOS (sweep, jet sweep) | Animates along drawn arc, then attaches       | Yes — short arc  |
| Pass     | Forward throw                             | Animates along drawn arc, then attaches       | Yes — full arc   |

Toss and Pass are **mechanically identical**. The labels differ for the coach's mental model. Internally they can be one type — `'in_flight'` — with a `label` field of `'toss'` or `'pass'`. Or two types with shared logic. Implementer's call during build.

---

## Inspector Design — Football Selected

```
┌──────────────────────────────────────────┐
│ Football                                  │
├──────────────────────────────────────────┤
│ Position: x=960  y=850 (LOS)             │
│                                           │
│ Snap to:  [QB ▾]                          │
│ Snap time: 1.2s (auto)                    │
│                                           │
│ ── Journey Events ──                      │
│                                           │
│ [1.8s] [Handoff ▾] to [RB ▾]      [×]    │
│                                           │
│ [3.5s] [Pass ▾] to [WR ▾]                │
│        Arc: ✓ drawn   [Redraw] [×]        │
│                                           │
│ + Add Handoff   + Add Toss   + Add Pass  │
└──────────────────────────────────────────┘
```

Notes:
- Time inputs are number fields (step 0.1s) clamped between snap time and play end
- Player dropdowns list only players, not other elements
- When "Draw arc" is clicked, the inspector enters a non-blocking mode — the canvas tools become available, and a "Drawing arc for [event] — press Enter when done" banner appears at the top of the canvas
- After arc completion, the inspector returns to event-list view with "Arc: ✓ drawn"

---

## Tool Mode Integration

The arc-drawing flow introduces a new UI state field:

```js
// useUIStore.drawingSlice
arcDrawingForEventId: null  // or 'evt_xyz' when actively drawing an arc for that event
```

When this field is set:
- The user is in arc-drawing mode
- Drawing tools (straight/curve) work as normal
- On Enter/finish:
  - The drawn path is added to `elements` like any other path
  - The path's `id` is written to the journey event's `arcPathId`
  - `arcDrawingForEventId` is cleared
  - Inspector returns to football view
- On Escape:
  - Drawing is cancelled, no path created
  - `arcDrawingForEventId` is cleared
  - Inspector returns to football view

This is a small extension to existing drawing logic — a "mode" param on `finishDrawing()`. Not a refactor.

---

## Migration

Existing footballs in localStorage have no `journey` field. The persistence slice needs `migrateFootball`:

```js
function migrateFootball(fb) {
  if (!fb.journey) {
    fb.journey = { snapToPlayer: null, events: [] };
  }
  return fb;
}
```

Called from `loadFromStorage` and `importPlaybook` in the data store persistence slice.

---

## Deletion Cleanup

When a path is deleted, journey events that reference it via `arcPathId` need their `arcPathId` cleared. Add to the existing `deleteElement` cleanup logic:

```js
// After deleting a path element:
elements.forEach(el => {
  if (el.type === 'football' && el.journey?.events) {
    el.journey.events.forEach(evt => {
      if (evt.arcPathId === deletedPathId) evt.arcPathId = null;
    });
  }
});
```

When a player is deleted, journey events referencing it (via `snapToPlayer` or `toPlayer`) need similar cleanup — set to null, and the inspector will show "[Player deleted — select replacement]" for that event.

---

## Store Actions Required (Phase 2 Data Store Additions)

Add to `useDataStore.elementOpsSlice`:

```js
setFootballSnapTo(footballId, playerId)
addJourneyEvent(footballId, eventType)         // adds with default time + null target
updateJourneyEvent(footballId, eventId, patch) // partial update
deleteJourneyEvent(footballId, eventId)
setEventArcPath(footballId, eventId, pathId)
```

All these push to history (undoable). Adding/removing journey events should be a single undo step, not two.

---

## Build Sequence (Inside the Football Phase)

After the architecture refactor lands, execute in this order:

1. **Data model + migration** — Add `journey` to football, write `migrateFootball`, run on load
2. **Store actions** — Five new actions in elementOpsSlice
3. **Runtime logic** — `footballPositionAtTime` + `getSnapTime` in animationRuntime.js, wire into `computePositions`
4. **Inspector — read-only journey view** — Display snap-to, event list (no edits yet) when football selected
5. **Inspector — event editing** — Add/edit/delete handoff events (no arc drawing yet)
6. **Pass/toss + arc drawing** — Add `arcDrawingForEventId` to UI store, wire "Draw arc" button, extend drawing completion to set arcPathId
7. **Pre-snap visual** — Confirm ball renders at LOS during `t < snapTime`, transitions cleanly at snap
8. **Deletion cleanup** — Wire path delete → clear stale arcPathIds; player delete → clear stale event references
9. **End-to-end verification** — Build three sample plays (run, handoff sweep, pass) and confirm playback in editor + Present Mode

Each step is its own commit. Run the functional checklist after each.

---

## Open Questions (Defer until building)

These are not blockers — they'll resolve naturally during build:

- Visual polish during in-flight (does the ball spin? Just translate? Stick to first implementation)
- Pass arc default style (probably dashed line, distinct from player routes — confirm during build)
- Default handoff time when "+ Add Handoff" is clicked (probably snap time + 0.5s)
- UI for events ordered by time when coach edits time out-of-order (auto-resort? Show warning?)

---

## What This Replaces

Earlier in this document's history, there was a plan called "A + B":
- A — Multiple footballs with visibility timing
- B — Football with a single drawable route

That plan is **superseded**. Do not build multiple footballs. Do not put visibility timing on footballs. The journey model is the single source of truth for ball movement.

The only remnant of "B" that survives is the drawable arc path concept — but it's stored on journey events, not on the football itself.
