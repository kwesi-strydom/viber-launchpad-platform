import { CURRENT_EDITION, users, games, ratings, sessions, teams, onboardings, eventState, dashboardTeams, dashboardEvents, feedEvents, type User, type InsertUser, type Game, type InsertGame, type Rating, type InsertRating, type Session, type Team, type OnboardingRecord, type EventState, type DashboardTeam, type InsertDashboardTeam, type DashboardEvent, type InsertDashboardEvent, type FeedEvent, type InsertFeedEvent } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export type TeamMember = { id: number; name: string; discordId: string | null; discordAvatar: string | null };

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getOnboardingsByEdition(edition: number): Promise<OnboardingRecord[]>;
  
  // Games
  getAllGames(): Promise<Array<Game & { avg_rating: number; rating_count: number }>>;
  getAllPublicGames(): Promise<Array<Pick<Game, 'id' | 'title' | 'description' | 'thumbnail_url' | 'creator' | 'created_at'>>>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(gameId: string, game: Partial<InsertGame>): Promise<Game>;
  getGameByCreator(creator: string): Promise<Game | undefined>;
  
  // Ratings
  createOrUpdateRating(rating: InsertRating): Promise<Rating>;
  getRatingBySessionAndGame(sessionId: string, gameId: string): Promise<Rating | undefined>;
  getRatingsBySession(sessionId: string): Promise<Rating[]>;
  getRatingsByUser(userId: number): Promise<Rating[]>;
  getRatingByUserAndGame(userId: number, gameId: string): Promise<Rating | undefined>;
  
  // Sessions
  createSession(sessionId: string, userId: number, expiresAt: Date): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<void>;

  // Teams
  getTeamBySlug(slug: string): Promise<Team | undefined>;
  getAllTeams(): Promise<Array<Team & { memberCount: number; members: TeamMember[] }>>;
  upsertTeam(slug: string, name: string): Promise<Team>;
  renameTeam(slug: string, newName: string, newSlug: string, byAdmin: boolean): Promise<Team>;
  clearAllTeams(): Promise<void>;

  // Games management
  clearAllGames(): Promise<void>;

  // Live Dashboard
  getEventState(): Promise<EventState>;
  updateEventState(updates: Partial<Omit<EventState, "id">>): Promise<EventState>;
  getDashboardTeams(): Promise<DashboardTeam[]>;
  createDashboardTeam(team: InsertDashboardTeam): Promise<DashboardTeam>;
  updateDashboardTeam(id: number, updates: Partial<InsertDashboardTeam>): Promise<DashboardTeam>;
  deleteDashboardTeam(id: number): Promise<void>;
  clearDashboardTeams(): Promise<void>;
  syncDashboardTeams(desiredNames: string[]): Promise<DashboardTeam[]>;
  getDashboardEvents(): Promise<DashboardEvent[]>;
  createDashboardEvent(event: InsertDashboardEvent): Promise<DashboardEvent>;
  resolveDashboardEvent(id: string, resultText?: string): Promise<DashboardEvent>;
  clearDashboardEvents(): Promise<void>;
  getFeedEvents(limit?: number): Promise<FeedEvent[]>;
  createFeedEvent(entry: InsertFeedEvent): Promise<FeedEvent>;
  clearFeed(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<string, Game>;
  private ratings: Map<string, Rating>;
  private teams: Map<string, Team>;
  currentUserId: number;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.ratings = new Map();
    this.teams = new Map();
    this.currentUserId = 1;
    
    // Add sample games for development
    this.seedData();
  }

  private seedData() {
    const sampleGames: Game[] = [
      {
        id: '1',
        created_at: new Date(),
        title: 'Space Invaders 2.0',
        description: 'A modern take on the classic game.',
        thumbnail_url: 'https://placehold.co/400x300/9333ea/ffffff?text=Space+Invaders',
        game_url: 'https://example.com/space-invaders',
        creator: 'AI Developer'
      },
      {
        id: '2',
        created_at: new Date(),
        title: 'Pixel Platformer',
        description: 'Jump and run through colorful pixel worlds.',
        thumbnail_url: 'https://placehold.co/400x300/3b82f6/ffffff?text=Pixel+Platformer',
        game_url: 'https://claude.ai/public/artifacts/ad55d2d6-8a0c-499e-b674-5edd4ce4859e',
        creator: 'RetroAI'
      }
    ];
    
    sampleGames.forEach(game => this.games.set(game.id, game));
    
    // Add sample ratings
    const sampleRatings: Rating[] = [
      {
        id: 'r1',
        game_id: '1',
        session_id: 'session1',
        rating: 5,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'r2',
        game_id: '1',
        session_id: 'session2',
        rating: 4,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'r3',
        game_id: '2',
        session_id: 'session3',
        rating: 4,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    sampleRatings.forEach(rating => this.ratings.set(rating.id, rating));
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.discordId === discordId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error('User not found');
    const updated: User = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
  }

  async getOnboardingsByEdition(_edition: number): Promise<OnboardingRecord[]> {
    return [];
  }

  async getAllGames(): Promise<Array<Game & { avg_rating: number; rating_count: number }>> {
    const gamesArray = Array.from(this.games.values());
    
    return gamesArray.map(game => {
      const gameRatings = Array.from(this.ratings.values()).filter(r => r.game_id === game.id);
      const avg_rating = gameRatings.length > 0 
        ? gameRatings.reduce((sum, r) => sum + r.rating, 0) / gameRatings.length
        : 0;
      const rating_count = gameRatings.length;
      
      return { ...game, avg_rating, rating_count };
    });
  }

  async getAllPublicGames(): Promise<Array<Pick<Game, 'id' | 'title' | 'description' | 'thumbnail_url' | 'creator' | 'created_at'>>> {
    const gamesArray = Array.from(this.games.values());
    
    return gamesArray
      .map(game => ({
        id: game.id,
        title: game.title,
        description: game.description,
        thumbnail_url: game.thumbnail_url,
        creator: game.creator,
        created_at: game.created_at
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getGame(id: string): Promise<Game | undefined> {
    return this.games.get(id);
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = crypto.randomUUID();
    const game: Game = {
      ...insertGame,
      id,
      created_at: new Date(),
      thumbnail_url: insertGame.thumbnail_url || null,
      creator: insertGame.creator || null,
      edition: insertGame.edition ?? CURRENT_EDITION,
      submitted_by: insertGame.submitted_by ?? null,
    };
    this.games.set(id, game);
    return game;
  }

  async updateGame(gameId: string, gameUpdate: Partial<InsertGame>): Promise<Game> {
    const existing = this.games.get(gameId);
    if (!existing) throw new Error('Game not found');
    
    const updated: Game = { ...existing, ...gameUpdate };
    this.games.set(gameId, updated);
    return updated;
  }

  async getGameByCreator(creator: string): Promise<Game | undefined> {
    return Array.from(this.games.values())
      .filter(game => game.creator === creator)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }

  async createOrUpdateRating(insertRating: InsertRating): Promise<Rating> {
    // Check if rating already exists for this session and game
    const existingRating = Array.from(this.ratings.values()).find(
      r => r.session_id === insertRating.session_id && r.game_id === insertRating.game_id
    );

    if (existingRating) {
      // Update existing rating
      const updatedRating: Rating = {
        ...existingRating,
        rating: insertRating.rating,
        ip_address: insertRating.ip_address || existingRating.ip_address,
        user_agent: insertRating.user_agent || existingRating.user_agent,
        updated_at: new Date()
      };
      this.ratings.set(existingRating.id, updatedRating);
      return updatedRating;
    } else {
      // Create new rating
      const id = crypto.randomUUID();
      const rating: Rating = {
        ...insertRating,
        id,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.ratings.set(id, rating);
      return rating;
    }
  }



  async getRatingBySessionAndGame(sessionId: string, gameId: string): Promise<Rating | undefined> {
    return Array.from(this.ratings.values()).find(
      r => r.session_id === sessionId && r.game_id === gameId
    );
  }

  async getRatingsBySession(sessionId: string): Promise<Rating[]> {
    return Array.from(this.ratings.values()).filter(
      r => r.session_id === sessionId
    );
  }

  async getRatingsByUser(userId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values()).filter(
      r => r.user_id === userId.toString()
    );
  }

  async getRatingByUserAndGame(userId: number, gameId: string): Promise<Rating | undefined> {
    return Array.from(this.ratings.values()).find(
      r => r.user_id === userId.toString() && r.game_id === gameId
    );
  }

  async createSession(sessionId: string, userId: number, expiresAt: Date): Promise<Session> {
    const session: Session = {
      id: sessionId,
      user_id: userId,
      created_at: new Date(),
      expires_at: expiresAt
    };
    // For MemStorage, we'd need a sessions Map, but we're using DatabaseStorage
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    // For MemStorage, we'd check a sessions Map, but we're using DatabaseStorage
    return undefined;
  }

  async deleteSession(sessionId: string): Promise<void> {
    // For MemStorage, we'd delete from sessions Map, but we're using DatabaseStorage
  }

  async getTeamBySlug(slug: string): Promise<Team | undefined> {
    return this.teams.get(slug);
  }

  async getAllTeams(): Promise<Array<Team & { memberCount: number; members: TeamMember[] }>> {
    const allUsers = Array.from(this.users.values());
    return Array.from(this.teams.values()).map(team => {
      const teamMembers = allUsers.filter(u => u.teamName === team.name);
      return {
        ...team,
        memberCount: teamMembers.length,
        members: teamMembers.map(u => ({ id: u.id, name: u.name, discordId: u.discordId, discordAvatar: u.discordAvatar })),
      };
    });
  }

  async upsertTeam(slug: string, name: string): Promise<Team> {
    const existing = this.teams.get(slug);
    if (existing) return existing;
    const team: Team = { id: this.teams.size + 1, slug, name, nameChanged: false };
    this.teams.set(slug, team);
    return team;
  }

  async renameTeam(slug: string, newName: string, newSlug: string, byAdmin: boolean): Promise<Team> {
    const existing = this.teams.get(slug);
    if (existing && existing.nameChanged && !byAdmin) throw new Error('Team has already used its rename');
    const updated: Team = { id: existing?.id ?? this.teams.size + 1, slug: newSlug, name: newName, nameChanged: byAdmin ? (existing?.nameChanged ?? false) : true };
    if (existing) this.teams.delete(slug);
    this.teams.set(newSlug, updated);
    Array.from(this.users.values()).forEach(u => {
      if (u.teamName === (existing?.name ?? slug)) {
        this.users.set(u.id, { ...u, teamName: newName });
      }
    });
    return updated;
  }

  async clearAllTeams(): Promise<void> {
    this.teams.clear();
  }

  async clearAllGames(): Promise<void> {
    this.games.clear();
    // Also clear ratings since they reference games
    this.ratings.clear();
  }

  // Live Dashboard (in-memory)
  private memEventState: EventState = { id: 1, status: "idle", durationSeconds: 3600, accumulatedSeconds: 0, startedAt: null, updatedAt: new Date() };
  private dashTeams: DashboardTeam[] = [];
  private dashEvents: DashboardEvent[] = [];
  private feed: FeedEvent[] = [];
  private dashTeamSeq = 1;

  async getEventState(): Promise<EventState> {
    return this.memEventState;
  }

  async updateEventState(updates: Partial<Omit<EventState, "id">>): Promise<EventState> {
    this.memEventState = { ...this.memEventState, ...updates, id: 1, updatedAt: new Date() };
    return this.memEventState;
  }

  async getDashboardTeams(): Promise<DashboardTeam[]> {
    return [...this.dashTeams].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createDashboardTeam(team: InsertDashboardTeam): Promise<DashboardTeam> {
    const row: DashboardTeam = {
      id: this.dashTeamSeq++,
      name: team.name,
      color: team.color ?? "#f9a826",
      rank: team.rank ?? null,
      shields: team.shields ?? 0,
      sortOrder: team.sortOrder ?? 0,
    };
    this.dashTeams.push(row);
    return row;
  }

  async updateDashboardTeam(id: number, updates: Partial<InsertDashboardTeam>): Promise<DashboardTeam> {
    const idx = this.dashTeams.findIndex(t => t.id === id);
    if (idx === -1) throw new Error("Team not found");
    this.dashTeams[idx] = { ...this.dashTeams[idx], ...updates };
    return this.dashTeams[idx];
  }

  async deleteDashboardTeam(id: number): Promise<void> {
    this.dashTeams = this.dashTeams.filter(t => t.id !== id);
  }

  async clearDashboardTeams(): Promise<void> {
    this.dashTeams = [];
  }

  async syncDashboardTeams(desiredNames: string[]): Promise<DashboardTeam[]> {
    const palette = ["#f9a826", "#ef4444", "#a855f7", "#22d3ee", "#84cc16", "#ec4899", "#3b82f6", "#f97316"];
    // Dedupe existing dashboard teams by name (keep first occurrence).
    const seen = new Map<string, DashboardTeam>();
    for (const t of this.dashTeams) if (!seen.has(t.name)) seen.set(t.name, t);
    // Drop any dashboard team whose platform team no longer exists.
    const desiredSet = new Set(desiredNames);
    this.dashTeams = Array.from(seen.values()).filter(t => desiredSet.has(t.name));
    // Add missing teams and keep sortOrder aligned to the desired ordering.
    desiredNames.forEach((name, i) => {
      const existing = this.dashTeams.find(t => t.name === name);
      if (!existing) {
        this.dashTeams.push({ id: this.dashTeamSeq++, name, color: palette[i % palette.length], rank: null, shields: 0, sortOrder: i });
      } else {
        existing.sortOrder = i;
      }
    });
    return this.getDashboardTeams();
  }

  async getDashboardEvents(): Promise<DashboardEvent[]> {
    return [...this.dashEvents].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createDashboardEvent(event: InsertDashboardEvent): Promise<DashboardEvent> {
    const row: DashboardEvent = {
      id: crypto.randomUUID(),
      category: event.category,
      type: event.type,
      label: event.label,
      teamId: event.teamId ?? null,
      teamName: event.teamName ?? null,
      atSeconds: event.atSeconds ?? 0,
      durationSeconds: event.durationSeconds ?? null,
      reward: event.reward ?? null,
      active: event.active ?? true,
      createdAt: new Date(),
      resolvedAt: null,
      resultText: event.resultText ?? null,
    };
    this.dashEvents.push(row);
    return row;
  }

  async resolveDashboardEvent(id: string, resultText?: string): Promise<DashboardEvent> {
    const idx = this.dashEvents.findIndex(e => e.id === id);
    if (idx === -1) throw new Error("Event not found");
    this.dashEvents[idx] = { ...this.dashEvents[idx], active: false, resolvedAt: new Date(), resultText: resultText ?? this.dashEvents[idx].resultText };
    return this.dashEvents[idx];
  }

  async clearDashboardEvents(): Promise<void> {
    this.dashEvents = [];
  }

  async getFeedEvents(limit = 50): Promise<FeedEvent[]> {
    return [...this.feed].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async createFeedEvent(entry: InsertFeedEvent): Promise<FeedEvent> {
    const row: FeedEvent = {
      id: crypto.randomUUID(),
      kind: entry.kind ?? "info",
      message: entry.message,
      atSeconds: entry.atSeconds ?? null,
      createdAt: new Date(),
    };
    this.feed.push(row);
    return row;
  }

  async clearFeed(): Promise<void> {
    this.feed = [];
  }
}

import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import { teams as teamsTable } from "@shared/schema";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`)
      .limit(1);
    return result[0];
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getOnboardingsByEdition(edition: number): Promise<OnboardingRecord[]> {
    const rows = await db
      .select({
        id: onboardings.id,
        userId: onboardings.userId,
        edition: onboardings.edition,
        name: onboardings.name,
        country: onboardings.country,
        shirtSize: onboardings.shirtSize,
        onboarded: onboardings.onboarded,
        shirtPaid: onboardings.shirtPaid,
        paymentMethod: onboardings.paymentMethod,
        discordId: users.discordId,
        discordUsername: users.discordUsername,
        discordAvatar: users.discordAvatar,
        email: users.email,
      })
      .from(onboardings)
      .leftJoin(users, eq(onboardings.userId, users.id))
      .where(eq(onboardings.edition, edition))
      .orderBy(onboardings.name);
    return rows as OnboardingRecord[];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.name);
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllGames(): Promise<Array<Game & { avg_rating: number; rating_count: number }>> {
    // Get minimum votes threshold from environment variable (default: 15)
    // Higher threshold makes apps with few votes drop more dramatically
    // Sanitize to ensure it's a positive number to avoid division-by-zero
    const minVotesRaw = parseInt(process.env.LEADERBOARD_MIN_VOTES || '15', 10);
    const minVotes = !isNaN(minVotesRaw) && minVotesRaw >= 1 ? minVotesRaw : 15;
    
    // Calculate global mean rating (C) across all apps
    const globalMeanResult = await db
      .select({
        mean: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`.as('mean')
      })
      .from(ratings);
    
    const globalMean = Number(globalMeanResult[0]?.mean) || 0;
    
    // Fetch all games with their ratings using IMDb weighted rating formula
    // WR = (v/(v+m)) * R + (m/(v+m)) * C
    // Where: R = average rating, v = vote count, C = global mean, m = min votes threshold
    // When v = 0 (no votes), WR = C (global mean)
    const result = await db
      .select({
        id: games.id,
        created_at: games.created_at,
        title: games.title,
        description: games.description,
        thumbnail_url: games.thumbnail_url,
        game_url: games.game_url,
        creator: games.creator,
        submitted_by: games.submitted_by,
        edition: games.edition,
        avg_rating: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`.as('avg_rating'),
        rating_count: sql<number>`COUNT(CASE WHEN ${ratings.id} IS NOT NULL THEN 1 END)`.as('rating_count')
      })
      .from(games)
      .leftJoin(ratings, eq(games.id, ratings.game_id))
      .groupBy(games.id)
      .orderBy(
        // Primary sort: Ranking gate - apps with >= minVotes always rank above apps with < minVotes
        desc(sql`CASE WHEN COUNT(CASE WHEN ${ratings.id} IS NOT NULL THEN 1 END) >= ${minVotes} THEN 1 ELSE 0 END`),
        // Secondary sort: IMDb weighted rating formula
        desc(sql`
          -- WR = (v/(v+m)) * R + (m/(v+m)) * C
          -- When v = 0, this correctly evaluates to C (global mean)
          (
            (CAST(COUNT(CASE WHEN ${ratings.id} IS NOT NULL THEN 1 END) AS FLOAT) / 
             (CAST(COUNT(CASE WHEN ${ratings.id} IS NOT NULL THEN 1 END) AS FLOAT) + ${minVotes})) * 
            COALESCE(AVG(${ratings.rating}), 0)
          ) + (
            (${minVotes} / 
             (CAST(COUNT(CASE WHEN ${ratings.id} IS NOT NULL THEN 1 END) AS FLOAT) + ${minVotes})) * 
            ${globalMean}
          )
        `),
        // Tertiary sort: Tie-breaker by vote count
        desc(sql`COUNT(CASE WHEN ${ratings.id} IS NOT NULL THEN 1 END)`)
      );

    return result.map(row => ({
      ...row,
      avg_rating: Number(row.avg_rating) || 0,
      rating_count: Number(row.rating_count) || 0,
    }));
  }

  async getAllPublicGames(): Promise<Array<Pick<Game, 'id' | 'title' | 'description' | 'thumbnail_url' | 'creator' | 'created_at'>>> {
    const result = await db
      .select({
        id: games.id,
        title: games.title,
        description: games.description,
        thumbnail_url: games.thumbnail_url,
        creator: games.creator,
        created_at: games.created_at
      })
      .from(games)
      .orderBy(desc(games.created_at));
    
    return result;
  }

  async getGame(id: string): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id)).limit(1);
    return result[0];
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const result = await db.insert(games).values(insertGame).returning();
    return result[0];
  }

  async updateGame(gameId: string, gameUpdate: Partial<InsertGame>): Promise<Game> {
    const result = await db
      .update(games)
      .set(gameUpdate)
      .where(eq(games.id, gameId))
      .returning();
    return result[0];
  }

  async getGameByCreator(creator: string): Promise<Game | undefined> {
    const result = await db
      .select()
      .from(games)
      .where(eq(games.creator, creator))
      .orderBy(desc(games.created_at))
      .limit(1);
    return result[0];
  }

  async createOrUpdateRating(insertRating: InsertRating): Promise<Rating> {
    // Try to find existing rating
    const existingRating = await this.getRatingBySessionAndGame(insertRating.session_id, insertRating.game_id);
    
    if (existingRating) {
      // Update existing rating with security data
      const result = await db
        .update(ratings)
        .set({ 
          rating: insertRating.rating,
          ip_address: insertRating.ip_address,
          user_agent: insertRating.user_agent,
          updated_at: sql`NOW()` 
        })
        .where(eq(ratings.id, existingRating.id))
        .returning();
      return result[0];
    } else {
      // Create new rating with proper timestamps
      const result = await db.insert(ratings).values(insertRating).returning();
      return result[0];
    }
  }



  async getRatingBySessionAndGame(sessionId: string, gameId: string): Promise<Rating | undefined> {
    const result = await db
      .select()
      .from(ratings)
      .where(and(
        eq(ratings.session_id, sessionId),
        eq(ratings.game_id, gameId)
      ))
      .limit(1);
    return result[0];
  }

  async getRatingsBySession(sessionId: string): Promise<Rating[]> {
    const result = await db
      .select()
      .from(ratings)
      .where(eq(ratings.session_id, sessionId));
    return result;
  }

  async getRatingsByUser(userId: number): Promise<Rating[]> {
    const result = await db
      .select()
      .from(ratings)
      .where(eq(ratings.user_id, userId.toString()));
    return result;
  }

  async getRatingByUserAndGame(userId: number, gameId: string): Promise<Rating | undefined> {
    const result = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.user_id, userId.toString()), eq(ratings.game_id, gameId)))
      .limit(1);
    return result[0];
  }

  async createSession(sessionId: string, userId: number, expiresAt: Date): Promise<Session> {
    const result = await db
      .insert(sessions)
      .values({ id: sessionId, user_id: userId, expires_at: expiresAt })
      .returning();
    return result[0];
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);
    return result[0];
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async getTeamBySlug(slug: string): Promise<Team | undefined> {
    const result = await db.select().from(teamsTable).where(eq(teamsTable.slug, slug)).limit(1);
    return result[0];
  }

  async getAllTeams(): Promise<Array<Team & { memberCount: number; members: TeamMember[] }>> {
    const allUsers = await db.select().from(users);
    const allTeams = await db.select().from(teamsTable);
    const slugToMembers: Record<string, TeamMember[]> = {};
    allUsers.forEach(u => {
      if (u.teamName) {
        const s = slugifyTeamName(u.teamName);
        (slugToMembers[s] ||= []).push({ id: u.id, name: u.name, discordId: u.discordId, discordAvatar: u.discordAvatar });
      }
    });
    const teamSlugs = new Set(allTeams.map(t => t.slug));
    const extraTeams: Array<Team & { memberCount: number; members: TeamMember[] }> = [];
    Object.entries(slugToMembers).forEach(([s, members]) => {
      if (!teamSlugs.has(s)) {
        const matchedUser = allUsers.find(u => u.teamName && slugifyTeamName(u.teamName) === s);
        if (matchedUser?.teamName) {
          extraTeams.push({ id: 0, slug: s, name: matchedUser.teamName, nameChanged: false, memberCount: members.length, members });
        }
      }
    });
    return [
      ...allTeams.map(t => ({ ...t, memberCount: (slugToMembers[t.slug] || []).length, members: slugToMembers[t.slug] || [] })),
      ...extraTeams,
    ];
  }

  async upsertTeam(slug: string, name: string): Promise<Team> {
    const result = await db
      .insert(teamsTable)
      .values({ slug, name, nameChanged: false })
      .onConflictDoNothing()
      .returning();
    if (result[0]) return result[0];
    const existing = await db.select().from(teamsTable).where(eq(teamsTable.slug, slug)).limit(1);
    return existing[0];
  }

  async clearAllTeams(): Promise<void> {
    await db.delete(teamsTable);
  }

  async clearAllGames(): Promise<void> {
    await db.delete(ratings);
    await db.delete(games);
  }

  async renameTeam(slug: string, newName: string, newSlug: string, byAdmin: boolean): Promise<Team> {
    // Determine old team name from users (source of truth for teams without a row yet)
    const allUserRows = await db.select({ teamName: users.teamName }).from(users);
    const oldTeamName = allUserRows.find(
      u => u.teamName && slugifyTeamName(u.teamName) === slug
    )?.teamName;

    if (!oldTeamName) throw new Error('Team not found');

    // Check rename lock
    const existing = await this.getTeamBySlug(slug);
    if (existing?.nameChanged && !byAdmin) throw new Error('Team has already used its rename');

    // Update all users with the old team name to the new name
    await db.update(users)
      .set({ teamName: newName })
      .where(eq(users.teamName, oldTeamName));

    // Upsert the teams record
    if (existing) {
      const result = await db.update(teamsTable)
        .set({ slug: newSlug, name: newName, nameChanged: byAdmin ? existing.nameChanged : true })
        .where(eq(teamsTable.slug, slug))
        .returning();
      return result[0];
    }
    const result = await db.insert(teamsTable)
      .values({ slug: newSlug, name: newName, nameChanged: !byAdmin })
      .returning();
    return result[0];
  }

  // ── Live Dashboard ─────────────────────────────────────────────────────────

  async getEventState(): Promise<EventState> {
    const result = await db.select().from(eventState).where(eq(eventState.id, 1)).limit(1);
    if (result[0]) return result[0];
    const created = await db.insert(eventState).values({ id: 1 }).onConflictDoNothing().returning();
    if (created[0]) return created[0];
    const again = await db.select().from(eventState).where(eq(eventState.id, 1)).limit(1);
    return again[0];
  }

  async updateEventState(updates: Partial<Omit<EventState, "id">>): Promise<EventState> {
    await this.getEventState(); // ensure singleton exists
    const result = await db
      .update(eventState)
      .set({ ...updates, updatedAt: sql`NOW()` })
      .where(eq(eventState.id, 1))
      .returning();
    return result[0];
  }

  async getDashboardTeams(): Promise<DashboardTeam[]> {
    return db.select().from(dashboardTeams).orderBy(dashboardTeams.sortOrder, dashboardTeams.id);
  }

  async createDashboardTeam(team: InsertDashboardTeam): Promise<DashboardTeam> {
    const result = await db.insert(dashboardTeams).values(team).returning();
    return result[0];
  }

  async updateDashboardTeam(id: number, updates: Partial<InsertDashboardTeam>): Promise<DashboardTeam> {
    const result = await db.update(dashboardTeams).set(updates).where(eq(dashboardTeams.id, id)).returning();
    if (!result[0]) throw new Error("Team not found");
    return result[0];
  }

  async deleteDashboardTeam(id: number): Promise<void> {
    await db.delete(dashboardTeams).where(eq(dashboardTeams.id, id));
  }

  async clearDashboardTeams(): Promise<void> {
    await db.delete(dashboardTeams);
  }

  async syncDashboardTeams(desiredNames: string[]): Promise<DashboardTeam[]> {
    const palette = ["#f9a826", "#ef4444", "#a855f7", "#22d3ee", "#84cc16", "#ec4899", "#3b82f6", "#f97316"];
    const existing = await db.select().from(dashboardTeams).orderBy(dashboardTeams.sortOrder, dashboardTeams.id);
    // Dedupe by name (keep first), removing accidental duplicates.
    const seen = new Map<string, DashboardTeam>();
    for (const t of existing) {
      if (seen.has(t.name)) await db.delete(dashboardTeams).where(eq(dashboardTeams.id, t.id));
      else seen.set(t.name, t);
    }
    // Drop teams whose platform team no longer exists.
    const desiredSet = new Set(desiredNames);
    for (const [name, t] of Array.from(seen.entries())) {
      if (!desiredSet.has(name)) {
        await db.delete(dashboardTeams).where(eq(dashboardTeams.id, t.id));
        seen.delete(name);
      }
    }
    // Add missing teams; align sortOrder to desired ordering (write only on change).
    for (let i = 0; i < desiredNames.length; i++) {
      const name = desiredNames[i];
      const t = seen.get(name);
      if (!t) {
        await db.insert(dashboardTeams).values({ name, color: palette[i % palette.length], rank: null, shields: 0, sortOrder: i });
      } else if (t.sortOrder !== i) {
        await db.update(dashboardTeams).set({ sortOrder: i }).where(eq(dashboardTeams.id, t.id));
      }
    }
    return this.getDashboardTeams();
  }

  async getDashboardEvents(): Promise<DashboardEvent[]> {
    return db.select().from(dashboardEvents).orderBy(dashboardEvents.createdAt);
  }

  async createDashboardEvent(event: InsertDashboardEvent): Promise<DashboardEvent> {
    const result = await db.insert(dashboardEvents).values(event).returning();
    return result[0];
  }

  async resolveDashboardEvent(id: string, resultText?: string): Promise<DashboardEvent> {
    const set: Record<string, unknown> = { active: false, resolvedAt: sql`NOW()` };
    if (resultText !== undefined) set.resultText = resultText;
    const result = await db.update(dashboardEvents).set(set).where(eq(dashboardEvents.id, id)).returning();
    if (!result[0]) throw new Error("Event not found");
    return result[0];
  }

  async clearDashboardEvents(): Promise<void> {
    await db.delete(dashboardEvents);
  }

  async getFeedEvents(limit = 50): Promise<FeedEvent[]> {
    return db.select().from(feedEvents).orderBy(desc(feedEvents.createdAt)).limit(limit);
  }

  async createFeedEvent(entry: InsertFeedEvent): Promise<FeedEvent> {
    const result = await db.insert(feedEvents).values(entry).returning();
    return result[0];
  }

  async clearFeed(): Promise<void> {
    await db.delete(feedEvents);
  }
}

function slugifyTeamName(name: string): string {
  return name.toLowerCase().replace(/^team\s+/i, '').replace(/\s+/g, '-');
}

export async function backfillTeams(): Promise<void> {
  try {
    const allUsers = await db.select({ teamName: users.teamName }).from(users);
    const uniqueTeamNames = [...new Set(allUsers.map(u => u.teamName).filter(Boolean) as string[])];
    await Promise.all(
      uniqueTeamNames.map(name => {
        const slug = slugifyTeamName(name);
        return db.insert(teamsTable).values({ slug, name, nameChanged: false }).onConflictDoNothing();
      })
    );
  } catch (err) {
    console.error('[backfillTeams] error:', err);
  }
}

export const storage = new DatabaseStorage();
