---
name: Viber session/edition scoping
description: How a Viber "session" maps to data and the rule for scoping competitors/teams to the active session
---

Viber sessions are modeled by `users.edition` (integer). The single source of truth
for the active session number is `CURRENT_EDITION`, exported from `shared/schema.ts`.

**Rule:** anything that should reflect only the *active session* must filter to
`edition === CURRENT_EDITION` (strict equality) and, for participant pools, also
`onboarded === true`.

**Why:** competitors from past sessions still live in the `users` table. The Team
Randomizer originally pulled all competitors regardless of edition, mixing past
sessions into the draw. Past-edition snapshots are frozen in the `onboardings`
table; the live `users` row always holds the current edition's working copy.

**Null edition = legacy/excluded.** Treat `edition == null` as a past session, NOT
current. (Server onboarding-upgrade logic uses `?? 4` to mean "legacy"; keep
consumer filters consistent — do not use `?? CURRENT_EDITION`.)

**How to apply:**
- Randomizer pool, `/api/admin/assign-teams` eligibility, and Wheel of Destiny team
  derivation all filter by `edition === CURRENT_EDITION` (+ onboarded for pools).
- `assign-teams` clears every user's `teamName` then assigns only eligible
  current-session competitors, so team-name-derived views (Wheel, dashboard
  `getAllTeams` member counts) reflect the current session after any re-run.
- When bumping to a new session, change `CURRENT_EDITION` in `shared/schema.ts`.
