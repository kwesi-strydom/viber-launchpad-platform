---
name: Competition timeline markers
description: How the live dashboard's GlobalTimeline renders calamity/challenge event markers.
---

# Competition timeline (GlobalTimeline on /dashboard)

Event markers on the live competition timeline must:

- **Reveal progressively**: only show events whose `atSeconds <= elapsed`. Events are created with `atSeconds = computeElapsed(state)` at spin time, so this makes a marker appear exactly when the clock reaches it and never before.
- **Cluster simultaneous events**: one Wheel spin hitting multiple teams shares the *same* `atSeconds` (computed once per request, looped over teams). Group markers by `atSeconds` into a single marker with a count badge; the popover lists all events in that cluster. This avoids an unreadable overlapping pile.
- **Stay interactive**: markers are `<button>`s with hover + click-to-pin popovers (click matters for projected/touch big screens).

**Why:** Users run this on a projector during a live hackathon. A thin bar with hover-only dot tooltips hid the icons; dumping every event as an always-on chip row both lost interactivity and showed challenges before they happened.

**How to apply:** Marker/popover overlay must sit OUTSIDE the bar's `overflow-hidden` container, and popover horizontal alignment must clamp near the bar edges (left/center/right) so it isn't clipped by the hero card's `overflow-hidden`.
