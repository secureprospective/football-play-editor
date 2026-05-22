# Football Animation — Planning Document

## The Problem

The football is a first-class element in the play. It needs to travel through the play as players move — snaps, handoffs, tosses, pass routes. Currently the football either sits static or follows one attached player with no awareness of timing or ball transfer.

## Chosen Approach: Options A + B Combined

### Option A — Multiple Footballs + Visibility Timing

Each segment of ball possession is a separate football element with a visibility window.

- Ball 1: attached to QB, visible t=0 to t=1.5s (snap through release)
- Ball 2: attached to WR, visible t=1.5s onward (after catch)

Handoffs and tosses work the same way — each "possession segment" is its own football element. No new mechanics. Uses the visibility system already built in Phase 3 S4.

**What needs to be built:**
- Visibility controls wired to football elements in the Inspector (currently only text/highlight have this)
- Football elements included in the visibility filter in FieldRenderer (currently always rendered)

### Option B — Football Gets a Drawable Route

For passes and tosses where the ball travels through the air independent of a player's route, the football can have its own linked route — same mechanic as player→path linking.

- Draw a path, link it to the football via the Inspector dropdown
- Ball travels along that route during animation
- Coach can draw an arc for a spiral, a flat line for a shovel pass, etc.
- If a football has a routeId, that takes precedence over attachedToElementId during animation

**What needs to be built:**
- `routeId` field support on football elements in the data model
- `linkFootballToRoute` / `unlinkFootballFromRoute` in useEditorStore (mirrors the player link functions)
- Football route dropdown in Inspector (mirrors the player route dropdown)
- `computePositions` updated to handle football routeId (currently only handles player routeId + attachedToElementId offset)

## How a Full Pass Play Works (A + B combined)

1. **Snap:** Ball 1 attached to QB, visible t=0–0.3s (or just t=0 with zero duration)
2. **QB hold/drop back:** Ball 1 still attached to QB, travels with him during his drop-back route
3. **Ball in flight:** Ball 2 linked to a drawn arc route (the throw), visible t=X to t=Y, no player attachment
4. **Catch → run:** Ball 3 attached to WR, visible t=Y onward, follows WR's route

For a simple run play, one football attached to the ball carrier is enough.

## Deferred Questions (for the planning session)

- Should the first football element always snap from the center (snap mechanic)?
- Does the football need a visual "in flight" state (different shape/color) vs. in hand?
- Do we need a "ball carrier indicator" on the player holding the ball?
- Should visibility transitions be instant (cut) or should the football fade?
- How do coaches indicate which player is the ball carrier without drawing a route? (attachment label in inspector?)

## Current State (before this feature)

- Football element renders, attaches to a player via `attachedToElementId`
- `computePositions` in `animationRuntime.js` gives football the offset of its carrying player's animated position
- No visibility controls on football
- No routeId support on football
- Visibility system exists and works for text/highlight elements
