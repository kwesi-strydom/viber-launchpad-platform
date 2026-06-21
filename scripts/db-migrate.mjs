import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const statements = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_name TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS shirt_size TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS shirt_paid BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS edition INTEGER`,
  `UPDATE users SET edition = 4 WHERE edition IS NULL`,
  `ALTER TABLE users ALTER COLUMN edition SET DEFAULT 5`,
  `CREATE TABLE IF NOT EXISTS onboardings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    edition INTEGER NOT NULL,
    name TEXT,
    country TEXT,
    shirt_size TEXT,
    onboarded BOOLEAN DEFAULT FALSE,
    shirt_paid BOOLEAN DEFAULT FALSE,
    payment_method TEXT
  )`,
  // Freeze the Viber 4 roster as historical snapshots (idempotent).
  `INSERT INTO onboardings (user_id, edition, name, country, shirt_size, onboarded, shirt_paid, payment_method)
   SELECT u.id, 4, u.name, u.country, u.shirt_size, COALESCE(u.onboarded, false), COALESCE(u.shirt_paid, false), u.payment_method
   FROM users u
   WHERE u.user_type = 'competitor' AND COALESCE(u.edition, 4) = 4
     AND NOT EXISTS (SELECT 1 FROM onboardings o WHERE o.user_id = u.id AND o.edition = 4)`,
  `CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    name_changed BOOLEAN DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    expires_at TIMESTAMP
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name='users' AND constraint_name='users_username_unique'
    ) THEN
      ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name='users' AND constraint_name='users_discord_id_unique'
    ) THEN
      ALTER TABLE users ADD CONSTRAINT users_discord_id_unique UNIQUE (discord_id);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'teams' AND c.contype = 'u'
    ) THEN
      ALTER TABLE teams ADD CONSTRAINT teams_slug_unique UNIQUE (slug);
    END IF;
  END $$`,
];

async function run() {
  console.log('Running non-interactive DB migration...');
  for (const stmt of statements) {
    try {
      await sql([stmt]);
    } catch (e) {
      console.warn('Skipped:', e.message.split('\n')[0]);
    }
  }
  console.log('Migration complete.');
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
