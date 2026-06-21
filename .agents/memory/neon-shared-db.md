---
name: Shared Neon DB across dev and prod
description: This repl uses one external Neon database for both development and the deployed app
---

This project connects to an external Neon serverless Postgres via `DATABASE_URL`, NOT Replit's managed Postgres.

**Key fact:** There is no separate production Neon database. `executeSql({environment:"production"})` fails with "does not have a production Neon database". The deployed app (viberlaunchpad.replit.app) reads/writes the SAME database as the dev environment.

**Why it matters:** To inspect or fix what the live dashboard shows, query/mutate the development DB (`environment:"development"`) — those changes are immediately visible on the deployed site. There is no dev→prod schema migration step to worry about here.
