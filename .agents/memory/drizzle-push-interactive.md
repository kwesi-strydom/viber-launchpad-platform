---
name: Drizzle schema changes on this repo
description: Why `drizzle-kit push` is unsafe here and how to add tables instead
---

`npm run db:push` / `drizzle-kit push` is INTERACTIVE on this repo and hangs the agent.
It prompts to rename pre-existing tables (e.g. it offered to rename `stakes`/`transactions`)
because the schema has tables it can't confidently diff, and waits on stdin forever.

**Why:** drizzle-kit's interactive rename prompt blocks; there is no non-interactive flag wired into the script, and `drizzle.config.ts` must not be edited.

**How to apply:** When adding new tables, create them directly with `executeSql` (CREATE TABLE ...)
in the code_execution sandbox, then keep `shared/schema.ts` in sync by hand. Do NOT run push.
