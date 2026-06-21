import { pgTable, text, serial, integer, boolean, timestamp, uuid, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// The Viber edition competitors currently onboard for and compete in. Bump this
// when a new session starts so the randomizer, onboarding and dashboards all
// target the active session's builders.
export const CURRENT_EDITION = 5;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull(),
  teamName: text("team_name"),
  teammate: text("teammate"),
  teammateEmail: text("teammate_email"),
  discordId: text("discord_id").unique(),
  discordUsername: text("discord_username"),
  discordAvatar: text("discord_avatar"),
  nsVerified: boolean("ns_verified").default(false),
  isAdmin: boolean("is_admin").default(false),
  // Which Viber edition this user belongs to (existing users = 4, new signups = 5)
  edition: integer("edition").default(5),
  // Competitor onboarding
  country: text("country"),
  shirtSize: text("shirt_size"),
  onboarded: boolean("onboarded").default(false),
  // Shirt payment tracking (admin-managed)
  shirtPaid: boolean("shirt_paid").default(false),
  paymentMethod: text("payment_method"), // 'cash' | 'crypto'
});

// Frozen snapshot of a competitor's onboarding for a past Viber edition.
// The live `users` row always holds the CURRENT edition's working copy; when a
// competitor returns for a new edition their previous edition is preserved here
// so admin keeps the historical record.
export const onboardings = pgTable("onboardings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  edition: integer("edition").notNull(),
  name: text("name"),
  country: text("country"),
  shirtSize: text("shirt_size"),
  onboarded: boolean("onboarded").default(false),
  shirtPaid: boolean("shirt_paid").default(false),
  paymentMethod: text("payment_method"),
});

export type Onboarding = typeof onboardings.$inferSelect;
export type OnboardingRecord = Onboarding & {
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  email: string | null;
};

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnail_url: text("thumbnail_url"),
  game_url: text("game_url").notNull(),
  creator: text("creator"),
  submitted_by: text("submitted_by"), // Track who submitted (email/session)
  // Which Viber edition this app belongs to (existing apps = 4, new = current).
  edition: integer("edition").default(CURRENT_EDITION),
});

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_id: uuid("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  session_id: text("session_id").notNull(),
  user_id: text("user_id"), // Associate with registered users for security
  ip_address: text("ip_address"), // Track IP for rate limiting
  user_agent: text("user_agent"), // Additional fingerprinting
  rating: integer("rating").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameChanged: boolean("name_changed").default(false),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  userType: true,
  teamName: true,
  teammate: true,
  teammateEmail: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  created_at: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Session = typeof sessions.$inferSelect;

// ── Live Dashboard ───────────────────────────────────────────────────────────

// Singleton row (id = 1) holding the event timer state.
export const eventState = pgTable("event_state", {
  id: integer("id").primaryKey().default(1),
  status: text("status").notNull().default("idle"), // idle | running | paused | ended
  durationSeconds: integer("duration_seconds").notNull().default(3600),
  // Seconds accumulated across previous running segments (frozen on pause).
  accumulatedSeconds: integer("accumulated_seconds").notNull().default(0),
  // When the current running segment began; null while paused/idle/ended.
  startedAt: timestamp("started_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Teams shown on the dashboard (operator-managed: colour, standing, shields).
export const dashboardTeams = pgTable("dashboard_teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#f9a826"),
  rank: integer("rank"), // current standing, 1 = leading
  shields: integer("shields").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Challenges and side quests. Challenges land on a team's timeline as markers;
// active ones surface as Active Event Cards with a countdown.
export const dashboardEvents = pgTable("dashboard_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(), // 'challenge' | 'side_quest'
  type: text("type").notNull(), // founders_dispute | server_crash | lawsuit | copyright_strike | safe_round | side_quest | custom
  label: text("label").notNull(),
  teamId: integer("team_id"), // affected team (null for open side quests)
  teamName: text("team_name"),
  atSeconds: integer("at_seconds").notNull().default(0), // elapsed event seconds when triggered (marker position)
  durationSeconds: integer("duration_seconds"), // countdown length in seconds; null = no countdown
  reward: text("reward"), // e.g. a shield for side-quest winners
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resultText: text("result_text"),
});

// Scrolling live feed entries.
export const feedEvents = pgTable("feed_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull().default("info"), // deploy | challenge | side_quest | market | announcement | info
  message: text("message").notNull(),
  atSeconds: integer("at_seconds"), // elapsed event seconds, optional
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertDashboardTeamSchema = createInsertSchema(dashboardTeams).omit({ id: true });
export const insertDashboardEventSchema = createInsertSchema(dashboardEvents).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export const insertFeedEventSchema = createInsertSchema(feedEvents).omit({ id: true, createdAt: true });

export type EventState = typeof eventState.$inferSelect;
export type DashboardTeam = typeof dashboardTeams.$inferSelect;
export type InsertDashboardTeam = z.infer<typeof insertDashboardTeamSchema>;
export type DashboardEvent = typeof dashboardEvents.$inferSelect;
export type InsertDashboardEvent = z.infer<typeof insertDashboardEventSchema>;
export type FeedEvent = typeof feedEvents.$inferSelect;
export type InsertFeedEvent = z.infer<typeof insertFeedEventSchema>;

export interface DashboardSnapshot {
  event: EventState;
  teams: DashboardTeam[];
  events: DashboardEvent[];
  feed: FeedEvent[];
}
