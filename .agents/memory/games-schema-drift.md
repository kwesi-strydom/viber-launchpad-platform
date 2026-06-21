---
name: games table schema drift vs drizzle push
description: Why never run drizzle-kit push on this repo's external Neon DB
---

The external Neon DB (shared by dev AND the deployed site — there is no separate prod DB)
has live columns on `games` (and likely other tables) that are NOT in `shared/schema.ts`:
e.g. builder_id, tags, views, shares, tips, stakes, virality_index, graduated, experience.

**Rule:** Do NOT run `npm run db:push` / `drizzle-kit push` to apply schema changes here.
Push reconciles schema→DB and will offer to DROP those un-modeled columns (and prompts to
"rename" a new column from one of them), risking data loss on the live site.

**How to apply:** Add columns surgically with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
via `executeSql` (the dev DB query is the live DB), then update existing rows as needed.
Example used for the `edition` feature: added `edition int` to games, backfilled existing
rows to 4 (Viber 4), set column DEFAULT to 5 (CURRENT_EDITION) for new submissions.
