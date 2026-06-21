---
name: Live dashboard ↔ admin unification
description: How the public/operator live dashboard stays in sync with the /admin console, and why the Wheel of Destiny must hit the backend.
---

The app has two historically-disconnected systems:
- **System A (live dashboard):** isolated tables `dashboard_teams`, `dashboard_events`, `feed_events`, `event_state`.
- **System B (/admin):** the real `users` + `teams` tables (rosters, assignments).

**Decision:** /admin is the single source of truth. The live dashboard must auto-reflect it — never require a manual "seed"/"Load from platform teams" step.

**How to apply:**
- The canonical team list = distinct `users.teamName` for `userType==='competitor'` in `CURRENT_EDITION`, numeric-sorted. `GET /api/dashboard` derives this and calls `storage.syncDashboardTeams(desiredNames)` to reconcile `dashboard_teams` (dedupe by name, drop orphans, create missing, align sortOrder, preserve color/shields/rank by name match).
- `dashboard_teams.name` has **no unique constraint**, and sync is non-transactional, so concurrent polls can briefly create duplicate rows; the next sync dedupes them. Acceptable at hackathon scale — if it ever matters, add a unique constraint + transactional upsert-by-name.

**Why the Wheel bug happened:** the Wheel of Destiny was almost entirely client-side. Only Founders Dispute called the backend (`/api/admin/rotate-members` for the member swap); every other calamity (Server Crash, Lawsuit, Copyright Strike, Safe) persisted nothing, so the public dashboard showed nothing.

**Rule for Wheel changes:** anything that happens on the Wheel must POST to the backend to appear on the dashboard. `POST /api/admin/dashboard/calamity {teamNames[], type, label}` creates a challenge `dashboardEvent` + feed entry per team (or info-feed entries for `safe_round`) and broadcasts. Team mutations (`assign-teams`, `swap-members`, `rotate-members`) also sync teams, write a feed entry, and broadcast; `rotate-members` resolves active `founders_dispute` events.
