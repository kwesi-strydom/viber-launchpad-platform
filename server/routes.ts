import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertGameSchema, insertRatingSchema } from "@shared/schema";
import { signup, login, logout, getCurrentUser, requireAuth } from "./auth";
import cookieParser from "cookie-parser";
import https from "https";

function teamNameToSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/^team\s+/i, "").replace(/\s+/g, "-");
}

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const PAYMENT_METHODS = ["cash", "crypto"];
// The Viber edition competitors currently onboard for. Bumping this forces all
// returning competitors to go through onboarding again for the new edition.
const CURRENT_EDITION = 5;

export async function registerRoutes(app: Express): Promise<Server> {
  // Cookie parser middleware
  app.use(cookieParser());

  // Auth routes with request logging
  app.post("/api/auth/signup", (req, res, next) => {
    console.log('🟢 SIGNUP REQUEST RECEIVED:', { email: req.body.email, userAgent: req.get('User-Agent') });
    next();
  }, signup);
  
  app.post("/api/auth/login", (req, res, next) => {
    console.log('🟢 LOGIN REQUEST RECEIVED:', { 
      email: req.body.email, 
      userAgent: req.get('User-Agent'),
      host: req.get('Host'),
      origin: req.get('Origin'),
      referer: req.get('Referer')
    });
    next();
  }, login);
  
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/user", getCurrentUser);

  // ── Admin Routes ───────────────────────────────────────────────────────────

  const requireAdmin = async (req: any, res: any, next: any) => {
    const sessionId = req.cookies.sessionId;
    const session = await storage.getSession(sessionId);
    if (!session || session.expires_at < new Date()) return res.status(401).json({ message: 'Authentication required' });
    const user = await storage.getUser(session.user_id);
    if (!user || !user.isAdmin) return res.status(403).json({ message: 'Admin access required' });
    req.adminUser = user;
    next();
  };

  // ── Live Dashboard ─────────────────────────────────────────────────────────

  // Broadcast a payload to every connected WebSocket client.
  const broadcast = (payload: unknown) => {
    const wss = (app as any).wss as WebSocketServer | undefined;
    if (!wss) return;
    const msg = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  };

  // Compute elapsed event seconds from the stored timer state.
  const computeElapsed = (state: { status: string; accumulatedSeconds: number; startedAt: Date | null; durationSeconds: number }) => {
    let elapsed = state.accumulatedSeconds;
    if (state.status === "running" && state.startedAt) {
      elapsed += Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000);
    }
    return Math.max(0, Math.min(elapsed, state.durationSeconds));
  };

  const CHALLENGE_LABELS: Record<string, string> = {
    founders_dispute: "Founders' Dispute",
    server_crash: "Server Crash",
    lawsuit: "Legal Action",
    copyright_strike: "Copyright Strike",
    safe_round: "Safe Round",
    custom: "Challenge",
  };

  // Public dashboard snapshot — no auth required.
  // The dashboard mirrors the real platform rosters: distinct team names of the
  // current edition's competitors, ordered by team number. /admin is the source
  // of truth; the dashboard auto-reconciles to it (no manual "seed" needed).
  const computeDesiredTeamNames = async (): Promise<string[]> => {
    const allUsers = await storage.getAllUsers();
    const names = Array.from(new Set(
      allUsers
        .filter(u => u.userType === "competitor" && u.edition === CURRENT_EDITION && u.teamName)
        .map(u => u.teamName as string),
    ));
    return names.sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0));
  };

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const desired = await computeDesiredTeamNames();
      const [event, teams, events, feed] = await Promise.all([
        storage.getEventState(),
        storage.syncDashboardTeams(desired),
        storage.getDashboardEvents(),
        storage.getFeedEvents(60),
      ]);
      res.json({ event, teams, events, feed });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  // Public competitors directory — no auth required. Returns ONLY non-sensitive
  // fields (no email, password, shirt size, or payment info) for the current
  // edition's competitors, ordered by team number then name.
  app.get("/api/competitors", async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const competitors = allUsers
        .filter(u => u.userType === "competitor" && u.edition === CURRENT_EDITION)
        .map(u => ({
          id: u.id,
          name: u.name,
          country: u.country,
          teamName: u.teamName,
          discordUsername: u.discordUsername,
          avatarUrl: u.discordId && u.discordAvatar
            ? `https://cdn.discordapp.com/avatars/${u.discordId}/${u.discordAvatar}.png?size=64`
            : null,
        }))
        .sort((a, b) => {
          const ta = parseInt((a.teamName ?? "").replace(/\D/g, "")) || 0;
          const tb = parseInt((b.teamName ?? "").replace(/\D/g, "")) || 0;
          if (ta !== tb) return ta - tb;
          return (a.name ?? "").localeCompare(b.name ?? "");
        });
      res.json(competitors);
    } catch (error) {
      console.error("Error fetching competitors:", error);
      res.status(500).json({ error: "Failed to fetch competitors" });
    }
  });

  // Timer control: start | pause | reset | end | set-duration.
  app.post("/api/admin/dashboard/event", requireAdmin, async (req, res) => {
    try {
      const { action, durationSeconds } = req.body ?? {};
      const current = await storage.getEventState();
      let updates: Record<string, unknown> = {};
      switch (action) {
        case "start": {
          if (current.status === "running") return res.json(current);
          updates = { status: "running", startedAt: new Date() };
          break;
        }
        case "pause": {
          updates = { status: "paused", accumulatedSeconds: computeElapsed(current), startedAt: null };
          break;
        }
        case "end": {
          updates = { status: "ended", accumulatedSeconds: computeElapsed(current), startedAt: null };
          break;
        }
        case "reset": {
          // Resetting the timer also wipes the live feed and wheel outcomes so the
          // dashboard starts clean — no stale calamity results left over.
          await Promise.all([storage.clearDashboardEvents(), storage.clearFeed()]);
          updates = { status: "idle", accumulatedSeconds: 0, startedAt: null };
          break;
        }
        case "set-duration": {
          const d = parseInt(durationSeconds, 10);
          if (isNaN(d) || d < 60 || d > 86400) return res.status(400).json({ message: "Invalid duration" });
          updates = { durationSeconds: d };
          break;
        }
        default:
          return res.status(400).json({ message: "Unknown action" });
      }
      const updated = await storage.updateEventState(updates);
      broadcast({ type: "dashboard_update" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // Seed dashboard teams from the existing platform teams.
  app.post("/api/admin/dashboard/teams/seed", requireAdmin, async (_req, res) => {
    try {
      const platformTeams = await storage.getAllTeams();
      await storage.clearDashboardTeams();
      const palette = ["#f9a826", "#ef4444", "#a855f7", "#22d3ee", "#84cc16", "#ec4899", "#3b82f6", "#f97316"];
      let i = 0;
      for (const t of platformTeams) {
        await storage.createDashboardTeam({ name: t.name, color: palette[i % palette.length], sortOrder: i, shields: 0, rank: null });
        i++;
      }
      broadcast({ type: "dashboard_update" });
      res.json(await storage.getDashboardTeams());
    } catch (error) {
      console.error("Error seeding teams:", error);
      res.status(500).json({ message: "Failed to seed teams" });
    }
  });

  app.post("/api/admin/dashboard/teams", requireAdmin, async (req, res) => {
    try {
      const team = await storage.createDashboardTeam({
        name: String(req.body.name ?? "New Team"),
        color: req.body.color ?? "#f9a826",
        rank: req.body.rank ?? null,
        shields: req.body.shields ?? 0,
        sortOrder: req.body.sortOrder ?? 0,
      });
      broadcast({ type: "dashboard_update" });
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.patch("/api/admin/dashboard/teams/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      const allowed = ["name", "color", "rank", "shields", "sortOrder"];
      const updates: Record<string, unknown> = {};
      for (const key of allowed) if (key in req.body) updates[key] = req.body[key];
      const team = await storage.updateDashboardTeam(id, updates);
      broadcast({ type: "dashboard_update" });
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/admin/dashboard/teams/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
      await storage.deleteDashboardTeam(id);
      broadcast({ type: "dashboard_update" });
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Trigger a Wheel of Destiny challenge on a team.
  app.post("/api/admin/dashboard/challenge", requireAdmin, async (req, res) => {
    try {
      const { teamId, type, durationSeconds, label } = req.body ?? {};
      const teams = await storage.getDashboardTeams();
      const team = teams.find((t) => t.id === Number(teamId));
      if (!team) return res.status(400).json({ message: "Team not found" });
      const state = await storage.getEventState();
      const resolvedLabel = label || CHALLENGE_LABELS[type] || "Challenge";
      const dur = durationSeconds != null ? parseInt(durationSeconds, 10) : null;
      const event = await storage.createDashboardEvent({
        category: "challenge",
        type: type || "custom",
        label: resolvedLabel,
        teamId: team.id,
        teamName: team.name,
        atSeconds: computeElapsed(state),
        durationSeconds: dur && !isNaN(dur) ? dur : null,
        active: true,
      });
      await storage.createFeedEvent({ kind: "challenge", message: `⚡ ${resolvedLabel} hits ${team.name}!`, atSeconds: event.atSeconds });
      broadcast({ type: "dashboard_update" });
      broadcast({ type: "notification", data: { title: "Wheel of Destiny", body: `${resolvedLabel} hits ${team.name}!`, level: "challenge" } });
      res.status(201).json(event);
    } catch (error) {
      console.error("Error triggering challenge:", error);
      res.status(500).json({ message: "Failed to trigger challenge" });
    }
  });

  // Apply a Wheel of Destiny calamity to one or more teams (by name). Drives the
  // dashboard straight from the Wheel: creates a challenge card + feed entry per
  // affected team. "Safe" rounds post an info note instead of a challenge.
  app.post("/api/admin/dashboard/calamity", requireAdmin, async (req, res) => {
    try {
      const { teamNames, type, label, durationSeconds } = req.body ?? {};
      if (!Array.isArray(teamNames) || teamNames.length === 0) {
        return res.status(400).json({ message: "teamNames required" });
      }
      const resolvedLabel = label || CHALLENGE_LABELS[type] || "Challenge";
      const state = await storage.getEventState();
      const atSeconds = computeElapsed(state);
      const d = durationSeconds != null ? parseInt(durationSeconds, 10) : NaN;
      const dur = !isNaN(d) ? d : null;

      // Make sure the dashboard reflects the current rosters before attaching.
      await storage.syncDashboardTeams(await computeDesiredTeamNames());
      const dashTeams = await storage.getDashboardTeams();

      const created: unknown[] = [];
      for (const name of teamNames) {
        if (type === "safe_round") {
          await storage.createFeedEvent({ kind: "info", message: `🛡️ ${name} is safe this round.`, atSeconds });
          continue;
        }
        let team = dashTeams.find(t => t.name === name);
        if (!team) {
          team = await storage.createDashboardTeam({ name: String(name), color: "#f9a826", sortOrder: dashTeams.length, shields: 0, rank: null });
          dashTeams.push(team);
        }
        const event = await storage.createDashboardEvent({
          category: "challenge",
          type: type || "custom",
          label: resolvedLabel,
          teamId: team.id,
          teamName: team.name,
          atSeconds,
          durationSeconds: dur,
          active: true,
        });
        await storage.createFeedEvent({ kind: "challenge", message: `⚡ ${resolvedLabel} hits ${team.name}!`, atSeconds });
        created.push(event);
      }
      broadcast({ type: "dashboard_update" });
      if (type !== "safe_round") {
        broadcast({ type: "notification", data: { title: "Wheel of Destiny", body: `${resolvedLabel} — ${teamNames.join(", ")}`, level: "challenge" } });
      }
      res.status(201).json({ ok: true, created });
    } catch (error) {
      console.error("Error applying calamity:", error);
      res.status(500).json({ message: "Failed to apply calamity" });
    }
  });

  // Launch a side quest (open to all teams).
  app.post("/api/admin/dashboard/side-quest", requireAdmin, async (req, res) => {
    try {
      const { label, reward, durationSeconds } = req.body ?? {};
      if (!label) return res.status(400).json({ message: "Label required" });
      const state = await storage.getEventState();
      const dur = durationSeconds != null ? parseInt(durationSeconds, 10) : null;
      const event = await storage.createDashboardEvent({
        category: "side_quest",
        type: "side_quest",
        label: String(label),
        reward: reward ? String(reward) : null,
        atSeconds: computeElapsed(state),
        durationSeconds: dur && !isNaN(dur) ? dur : null,
        active: true,
      });
      await storage.createFeedEvent({ kind: "side_quest", message: `🎯 Side Quest launched: ${label}${reward ? ` — reward: ${reward}` : ""}`, atSeconds: event.atSeconds });
      broadcast({ type: "dashboard_update" });
      broadcast({ type: "notification", data: { title: "Side Quest", body: String(label), level: "side_quest" } });
      res.status(201).json(event);
    } catch (error) {
      console.error("Error launching side quest:", error);
      res.status(500).json({ message: "Failed to launch side quest" });
    }
  });

  // Resolve / clear an active event card.
  app.post("/api/admin/dashboard/events/:id/resolve", requireAdmin, async (req, res) => {
    try {
      const { resultText } = req.body ?? {};
      const event = await storage.resolveDashboardEvent(req.params.id, resultText);
      if (resultText) {
        await storage.createFeedEvent({ kind: event.category === "side_quest" ? "side_quest" : "challenge", message: `✅ ${event.label}: ${resultText}` });
      }
      broadcast({ type: "dashboard_update" });
      res.json(event);
    } catch (error) {
      console.error("Error resolving event:", error);
      res.status(500).json({ message: "Failed to resolve event" });
    }
  });

  // Post an announcement to the live feed (optionally notify logged-in users).
  app.post("/api/admin/dashboard/feed", requireAdmin, async (req, res) => {
    try {
      const { message, kind, notify } = req.body ?? {};
      if (!message) return res.status(400).json({ message: "Message required" });
      const state = await storage.getEventState();
      const entry = await storage.createFeedEvent({ kind: kind || "announcement", message: String(message), atSeconds: computeElapsed(state) });
      broadcast({ type: "dashboard_update" });
      if (notify) broadcast({ type: "notification", data: { title: "Announcement", body: String(message), level: "announcement" } });
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error posting feed:", error);
      res.status(500).json({ message: "Failed to post feed" });
    }
  });

  // Reset the whole dashboard (timer, teams, events, feed).
  app.post("/api/admin/dashboard/reset-all", requireAdmin, async (_req, res) => {
    try {
      await Promise.all([storage.clearDashboardEvents(), storage.clearFeed()]);
      await storage.updateEventState({ status: "idle", accumulatedSeconds: 0, startedAt: null });
      broadcast({ type: "dashboard_update" });
      res.json({ ok: true });
    } catch (error) {
      console.error("Error resetting dashboard:", error);
      res.status(500).json({ message: "Failed to reset dashboard" });
    }
  });

  // Clear only the wheel outcomes + live feed, leaving the timer untouched.
  // Used when the Wheel of Destiny is reset so the dashboard stops showing
  // stale calamity cards/feed entries.
  app.post("/api/admin/dashboard/clear-outcomes", requireAdmin, async (_req, res) => {
    try {
      await Promise.all([storage.clearDashboardEvents(), storage.clearFeed()]);
      broadcast({ type: "dashboard_update" });
      res.json({ ok: true });
    } catch (error) {
      console.error("Error clearing dashboard outcomes:", error);
      res.status(500).json({ message: "Failed to clear dashboard outcomes" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    const safe = allUsers.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid user id' });
    const allowed = ['userType', 'teamName', 'teammate', 'teammateEmail', 'isAdmin', 'name', 'country', 'shirtSize', 'onboarded', 'shirtPaid', 'paymentMethod'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    if (updates.shirtSize && !SHIRT_SIZES.includes(updates.shirtSize as string)) {
      return res.status(400).json({ message: 'Invalid shirt size' });
    }
    if (updates.paymentMethod && !PAYMENT_METHODS.includes(updates.paymentMethod as string)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    const existing = await storage.getUser(id);
    if (!existing) return res.status(404).json({ message: 'User not found' });
    const updated = await storage.updateUser(id, updates as any);
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    await storage.deleteUser(parseInt(req.params.id));
    res.json({ message: 'User deleted' });
  });

  // Historical onboarding snapshots for a past Viber edition (read-only).
  app.get("/api/admin/onboardings/:edition", requireAdmin, async (req, res) => {
    const edition = parseInt(req.params.edition);
    if (isNaN(edition)) return res.status(400).json({ message: 'Invalid edition' });
    const records = await storage.getOnboardingsByEdition(edition);
    res.json(records);
  });

  // ──────────────────────────────────────────────────────────────────────────

  // ── Discord / NS OAuth ─────────────────────────────────────────────────────

  // Step 1: redirect user to Discord for authorization
  // Returns the Discord OAuth URL so the client can navigate directly (needed for iOS Universal Links)
  app.get("/api/auth/discord/url", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const host = req.get("host");
    const redirectUri = `https://${host}/api/auth/discord/callback`;
    const role = (req.query.role as string) || "audience";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state: role,
    });
    const url = `https://discord.com/oauth2/authorize?${params}`;
    console.log("[Discord OAuth] Returning URL:", url);
    res.json({ url });
  });

  app.get("/api/auth/discord", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const host = req.get("host");
    const redirectUri = `https://${host}/api/auth/discord/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
    });
    console.log("[Discord OAuth] Redirecting with redirect_uri:", redirectUri);
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
  });

  // Step 2: Discord redirects back here with a code
  app.get("/api/auth/discord/callback", async (req, res) => {
    const { code } = req.query as { code?: string };
    if (!code) return res.redirect("/?ns_error=no_code");

    try {
      const host = req.get("host");
      const redirectUri = `https://${host}/api/auth/discord/callback`;
      console.log("[Discord OAuth] Callback using redirect_uri:", redirectUri);

      // Exchange code for access token
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID!,
          client_secret: process.env.DISCORD_CLIENT_SECRET!,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        console.error("Discord token exchange failed:", await tokenRes.text());
        return res.redirect("/?ns_error=token_exchange");
      }
      const tokenData = await tokenRes.json() as { access_token: string };

      // Fetch Discord user info
      const discordUserRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!discordUserRes.ok) {
        console.error("Discord user fetch failed:", await discordUserRes.text());
        return res.redirect("/?ns_error=discord_user");
      }
      const discordUser = await discordUserRes.json() as {
        id: string; username: string; avatar: string | null; email?: string;
      };

      // Verify NS membership
      console.log("[NS Auth] Verifying discordId:", discordUser.id, "username:", discordUser.username);
      const nsRes = await fetch("https://api.ns.com/api/v1/ns-auth/verify/", {
        method: "POST",
        redirect: "manual",
        headers: {
          "X-Api-Key": process.env.NS_AUTH_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ discordId: discordUser.id }),
      });
      const nsRawText = await nsRes.text();
      console.log("[NS Auth] Status:", nsRes.status, "Response:", nsRawText);
      let nsData: { member: boolean; name?: string; email?: string; discordUsername?: string; discordAvatar?: string; userType?: string; };
      try {
        nsData = JSON.parse(nsRawText);
      } catch {
        console.error("[NS Auth] Failed to parse response as JSON");
        return res.redirect("/?ns_error=server_error");
      }

      if (!nsData.member) {
        console.log("[NS Auth] Member check failed. member =", nsData.member, "status =", nsRes.status);
        return res.redirect("/?ns_error=not_member");
      }

      // Find or create the local user account
      let user = await storage.getUserByDiscordId(discordUser.id);

      if (!user) {
        // Try matching by email if NS returned one
        const email = nsData.email || discordUser.email || `${discordUser.id}@discord.ns`;
        user = await storage.getUserByEmail(email);

        if (user) {
          // Link existing account to Discord
          user = await storage.updateUser(user.id, {
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar || undefined,
            nsVerified: true,
          } as any);
        } else {
          // Create brand-new account
          const displayName = nsData.name || discordUser.username;
          user = await storage.createUser({
            name: displayName,
            email,
            password: `discord_${discordUser.id}_${Math.random().toString(36).slice(2)}`,
            userType: "spectator",
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar || undefined,
            nsVerified: true,
          } as any);
        }
      } else {
        // Refresh NS profile on each login
        user = await storage.updateUser(user.id, {
          discordUsername: discordUser.username,
          discordAvatar: discordUser.avatar || undefined,
          nsVerified: true,
        } as any);
      }

      // If the QR/login flow requested competitor role, upgrade userType
      const role = (req.query.state as string) || "audience";
      if (role === "competitor" && user!.userType !== "competitor") {
        user = await storage.updateUser(user!.id, { userType: "competitor" } as any);
      }

      // A competitor returning for a newer edition must onboard again. Their
      // previous edition is preserved in the `onboardings` snapshot table, so we
      // reset the live working copy and advance them to the current edition.
      // Keyed off effective userType (not the OAuth state) so any returning
      // competitor is caught regardless of which login path they came in on.
      if (user!.userType === "competitor" && (user!.edition ?? 4) < CURRENT_EDITION) {
        user = await storage.updateUser(user!.id, {
          edition: CURRENT_EDITION,
          onboarded: false,
          country: null,
          shirtSize: null,
          shirtPaid: false,
          paymentMethod: null,
        } as any);
      }

      // Create session and set cookie, then redirect based on role (state param)
      const sessionId = Math.random().toString(36).substr(2, 9);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createSession(sessionId, user!.id, expiresAt);
      res.cookie("sessionId", sessionId, {
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      if (role === "competitor") {
        res.redirect(user!.onboarded ? "/my-team" : "/onboarding");
      } else {
        res.redirect("/games");
      }
    } catch (err) {
      console.error("Discord OAuth error:", err);
      res.redirect("/?ns_error=server_error");
    }
  });

  // Clear all team assignments
  app.post("/api/admin/clear-teams", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      await Promise.all([
        ...allUsers.map(u => storage.updateUser(u.id, { teamName: null } as any)),
        storage.clearAllTeams(),
      ]);
      res.json({ message: "All team assignments cleared", count: allUsers.length });
    } catch (err) {
      console.error("clear-teams error:", err);
      res.status(500).json({ message: "Failed to clear teams" });
    }
  });

  // Bulk-assign teams from randomizer (clears old assignments first)
  app.post("/api/admin/assign-teams", requireAdmin, async (req, res) => {
    try {
      const { assignments } = req.body as { assignments: { userId: number; teamName: string }[] };
      if (!Array.isArray(assignments)) return res.status(400).json({ message: "assignments must be an array" });

      // Clear all existing team assignments and rename records
      const allUsers = await storage.getAllUsers();
      await Promise.all([
        ...allUsers.map(u => storage.updateUser(u.id, { teamName: null } as any)),
        storage.clearAllTeams(),
      ]);

      // Write new assignments. Only the current session's onboarded competitors are
      // eligible — enforce here so we never trust the caller to scope correctly.
      const eligibleIds = new Set(
        allUsers
          .filter(u => u.userType === "competitor" && u.edition === CURRENT_EDITION && u.onboarded)
          .map(u => u.id),
      );
      const competitorAssignments = assignments.filter(({ userId }) => eligibleIds.has(userId));
      await Promise.all(competitorAssignments.map(({ userId, teamName }) =>
        storage.updateUser(userId, { teamName } as any)
      ));

      console.log(`[assign-teams] Cleared ${allUsers.length} users, assigned ${competitorAssignments.length} competitors`);

      // Reflect on the live dashboard: reconcile teams and announce in the feed.
      await storage.syncDashboardTeams(await computeDesiredTeamNames());
      await storage.createFeedEvent({ kind: "info", message: `🎲 Teams have been assigned — ${competitorAssignments.length} competitors placed.` });
      broadcast({ type: "dashboard_update" });

      res.json({ message: "Teams assigned", count: competitorAssignments.length });
    } catch (err) {
      console.error("assign-teams error:", err);
      res.status(500).json({ message: "Failed to assign teams" });
    }
  });

  app.post("/api/admin/swap-members", requireAdmin, async (req, res) => {
    try {
      const { userIdA, userIdB } = req.body as { userIdA: number; userIdB: number };
      const allUsers = await storage.getAllUsers();
      const userA = allUsers.find(u => u.id === userIdA);
      const userB = allUsers.find(u => u.id === userIdB);
      if (!userA || !userB) return res.status(404).json({ message: "User not found" });
      await storage.updateUser(userIdA, { teamName: userB.teamName } as any);
      await storage.updateUser(userIdB, { teamName: userA.teamName } as any);

      // Reflect on the live dashboard.
      await storage.syncDashboardTeams(await computeDesiredTeamNames());
      await storage.createFeedEvent({ kind: "challenge", message: `🔁 Roster swap: ${userA.name ?? "A member"} ↔ ${userB.name ?? "B member"}.` });
      broadcast({ type: "dashboard_update" });

      res.json({ message: "Members swapped", userIdA, userIdB });
    } catch (err) {
      console.error("swap-members error:", err);
      res.status(500).json({ message: "Failed to swap members" });
    }
  });

  // 3-way rotation: userA → teamB, userB → teamC, userC → teamA
  app.post("/api/admin/rotate-members", requireAdmin, async (req, res) => {
    try {
      const { userIdA, userIdB, userIdC } = req.body as { userIdA: number; userIdB: number; userIdC: number };
      const allUsers = await storage.getAllUsers();
      const userA = allUsers.find(u => u.id === userIdA);
      const userB = allUsers.find(u => u.id === userIdB);
      const userC = allUsers.find(u => u.id === userIdC);
      if (!userA || !userB || !userC) return res.status(404).json({ message: "User not found" });
      // Capture original teams before any writes
      const teamA = userA.teamName;
      const teamB = userB.teamName;
      const teamC = userC.teamName;
      await Promise.all([
        storage.updateUser(userIdA, { teamName: teamB } as any), // A → B's team
        storage.updateUser(userIdB, { teamName: teamC } as any), // B → C's team
        storage.updateUser(userIdC, { teamName: teamA } as any), // C → A's team
      ]);

      // Reflect the Founders' Dispute resolution on the live dashboard.
      await storage.syncDashboardTeams(await computeDesiredTeamNames());
      const dashEvents = await storage.getDashboardEvents();
      for (const ev of dashEvents) {
        if (ev.active && ev.type === "founders_dispute") {
          await storage.resolveDashboardEvent(ev.id, "Members rotated");
        }
      }
      const rotated = [teamA, teamB, teamC].filter(Boolean).join(" → ");
      await storage.createFeedEvent({ kind: "challenge", message: `🔄 Founders' Dispute resolved — members rotated: ${rotated}.` });
      broadcast({ type: "dashboard_update" });

      res.json({ message: "Members rotated", userIdA, userIdB, userIdC });
    } catch (err) {
      console.error("rotate-members error:", err);
      res.status(500).json({ message: "Failed to rotate members" });
    }
  });

  // Returns games submitted by a team (matched by team name as creator)
  app.get("/api/teams/:slug/games", async (req, res) => {
    try {
      const slug = req.params.slug.toLowerCase();
      const allUsers = await storage.getAllUsers();
      const member = allUsers.find(u => u.teamName && teamNameToSlug(u.teamName) === slug);
      if (!member?.teamName) return res.json([]);
      const allGames = await storage.getAllGames();
      const teamGames = allGames.filter(g =>
        g.creator &&
        teamNameToSlug(g.creator) === slug &&
        g.edition === CURRENT_EDITION
      );
      res.json(teamGames);
    } catch (err) {
      console.error("team-games error:", err);
      res.status(500).json({ message: "Failed to fetch team games" });
    }
  });

  // ── Team endpoints ─────────────────────────────────────────────────────────

  // Returns the current user's own record (for my-team page polling)
  app.get("/api/my-team", requireAuth, async (req: any, res) => {
    const { password: _, ...safe } = req.user;
    res.json(safe);
  });

  // Competitor self-onboarding: name, country, shirt size
  app.post("/api/onboarding", requireAuth, async (req: any, res) => {
    if (req.user.userType !== "competitor") {
      return res.status(403).json({ message: "Only competitors can complete onboarding" });
    }
    const { name, country, shirtSize } = req.body;
    if (!name?.trim() || !country?.trim() || !shirtSize?.trim()) {
      return res.status(400).json({ message: "Name, country, and shirt size are required" });
    }
    if (!SHIRT_SIZES.includes(shirtSize)) {
      return res.status(400).json({ message: "Invalid shirt size" });
    }
    const updated = await storage.updateUser(req.user.id, {
      name: name.trim().slice(0, 120),
      country: country.trim().slice(0, 80),
      shirtSize,
      onboarded: true,
    } as any);
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  // Returns all members of a team by slug, with rename lock status
  app.get("/api/teams/:slug", async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const [allUsers, teamRecord] = await Promise.all([
      storage.getAllUsers(),
      storage.getTeamBySlug(slug),
    ]);
    const members = allUsers.filter(u => {
      if (!u.teamName) return false;
      return teamNameToSlug(u.teamName) === slug;
    });
    if (members.length === 0 && !teamRecord) return res.status(404).json({ message: "Team not found" });
    const safe = members.map(({ password: _, ...u }) => u);
    // Use teams table for canonical name when available, else derive from members
    const teamName = teamRecord?.name ?? members[0]?.teamName ?? slug;
    res.json({ slug, teamName, members: safe, nameChanged: teamRecord?.nameChanged ?? false });
  });

  // Rename a team (one-time for members, unlimited for admins)
  app.patch("/api/teams/:slug/rename", requireAuth, async (req: any, res) => {
    const slug = req.params.slug.toLowerCase();
    const { newName } = req.body;
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return res.status(400).json({ message: "New name is required" });
    }
    const trimmed = newName.trim();
    const newSlug = teamNameToSlug(trimmed);
    const isAdmin = req.user?.isAdmin === true;
    const userTeamSlug = req.user?.teamName ? teamNameToSlug(req.user.teamName) : null;

    // Non-admins must be a competitor member of the team
    if (!isAdmin) {
      if (req.user?.userType !== 'competitor') {
        return res.status(403).json({ message: "Only competitors can rename their team" });
      }
      if (userTeamSlug !== slug) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }
      const teamRecord = await storage.getTeamBySlug(slug);
      if (teamRecord?.nameChanged) {
        return res.status(403).json({ message: "This team has already used its one-time rename" });
      }
    }

    // Collision check: reject if new slug already belongs to a different team
    if (newSlug !== slug) {
      const allUsers = await storage.getAllUsers();
      const slugConflict = allUsers.some(u => {
        if (!u.teamName) return false;
        return teamNameToSlug(u.teamName) === newSlug && teamNameToSlug(u.teamName) !== slug;
      });
      if (slugConflict) {
        return res.status(409).json({ message: `A team named "${trimmed}" already exists. Please choose a different name.` });
      }
    }

    try {
      // Capture old team name before renaming so we can update game creators
      const allUsersBefore = await storage.getAllUsers();
      const oldTeamName = allUsersBefore.find(u => u.teamName && teamNameToSlug(u.teamName) === slug)?.teamName;

      const updated = await storage.renameTeam(slug, trimmed, newSlug, isAdmin);

      // Update creator field on any games that used the old team name
      if (oldTeamName) {
        const allGames = await storage.getAllGames();
        const toUpdate = allGames.filter(g => g.creator === oldTeamName);
        await Promise.all(toUpdate.map(g => storage.updateGame(g.id, { creator: trimmed } as any)));
        if (toUpdate.length > 0) {
          console.log(`[rename-team] Updated creator on ${toUpdate.length} game(s): "${oldTeamName}" → "${trimmed}"`);
        }
      }

      res.json({ slug: updated.slug, name: updated.name, nameChanged: updated.nameChanged });
    } catch (err: any) {
      if (err.message?.includes('already used')) return res.status(403).json({ message: err.message });
      if (err.message?.includes('not found')) return res.status(404).json({ message: err.message });
      console.error("rename team error:", err);
      res.status(500).json({ message: "Failed to rename team" });
    }
  });

  // Admin: list all teams
  app.get("/api/admin/teams", requireAdmin, async (req, res) => {
    const allTeams = await storage.getAllTeams();
    res.json(allTeams);
  });

  // ──────────────────────────────────────────────────────────────────────────

  // Mobile connectivity test endpoint
  app.get('/api/mobile-test', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    console.log('=== MOBILE TEST ENDPOINT HIT ===');
    console.log('User Agent:', userAgent);
    console.log('Is mobile:', isMobile);
    console.log('Client IP:', req.ip);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    res.json({ 
      success: true, 
      isMobile, 
      userAgent,
      timestamp: new Date().toISOString(),
      serverWorking: true
    });
  });

  // Add a simple POST test endpoint for mobile debugging
  app.post('/api/mobile-login-test', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    console.log('=== MOBILE LOGIN TEST ENDPOINT HIT ===');
    console.log('Body received:', req.body);
    console.log('User Agent:', userAgent);
    console.log('Is mobile:', isMobile);
    res.json({ 
      received: req.body,
      isMobile, 
      userAgent,
      message: 'Test endpoint working'
    });
  });

  // Public API route for cross-origin access to all apps
  app.get("/api/public-apps", async (req, res) => {
    try {
      // Enable CORS for public access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      const games = await storage.getAllPublicGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching public apps:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Games routes
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.post("/api/games", requireAuth, async (req: any, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);

      // Enforce creator ownership: non-admins can only submit apps for their
      // own assigned team. Admins may submit on behalf of any team.
      const isAdmin = req.user?.isAdmin === true;
      const userTeamSlug = req.user?.teamName ? teamNameToSlug(req.user.teamName) : null;
      const creatorSlug = gameData.creator ? teamNameToSlug(gameData.creator) : null;
      if (!isAdmin) {
        if (!userTeamSlug) {
          return res.status(403).json({ message: "You must be assigned to a team before submitting an app" });
        }
        if (creatorSlug !== userTeamSlug) {
          return res.status(403).json({ message: "You can only submit apps for your own team" });
        }
      }

      // Track which logged-in user submitted the app.
      const gameWithSubmitter = { 
        ...gameData, 
        submitted_by: String(req.user.id),
        edition: CURRENT_EDITION,
      };
      
      // Create new game (allow unlimited uploads per creator)
      const game = await storage.createGame(gameWithSubmitter);
      console.log(`Created new app for creator: ${gameData.creator}`);
      
      // Broadcast new app notification to all connected WebSocket clients
      const wss = (app as any).wss as WebSocketServer;
      if (wss) {
        const notification = {
          type: 'new_app',
          data: {
            creator: game.creator,
            title: game.title,
            thumbnail_url: game.thumbnail_url,
            id: game.id
          }
        };
        
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(notification));
          }
        });
      }
      
      // Return the game with rating info for consistency
      const gameWithRatings = { ...game, avg_rating: 0, rating_count: 0 };
      res.status(201).json({
        ...gameWithRatings,
        message: "App created successfully"
      });
    } catch (error) {
      console.error("Error creating game:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: "Invalid game data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create game" });
      }
    }
  });

  app.patch("/api/games/:gameId", requireAuth, async (req: any, res) => {
    try {
      const { gameId } = req.params;
      const existing = await storage.getGame(gameId);
      if (!existing) return res.status(404).json({ message: "Game not found" });

      const isAdmin = req.user?.isAdmin === true;
      const userTeamSlug = req.user?.teamName ? teamNameToSlug(req.user.teamName) : null;
      const creatorSlug = existing.creator ? teamNameToSlug(existing.creator) : null;

      if (!isAdmin && userTeamSlug !== creatorSlug) {
        return res.status(403).json({ message: "You can only edit your own team's apps" });
      }

      // Only allow editing user-facing fields. Never let clients change
      // immutable metadata like edition, submitted_by, id or created_at.
      const body = req.body ?? {};
      const updates: Partial<{ title: string; description: string; thumbnail_url: string; game_url: string; creator: string }> = {};
      for (const field of ['title', 'description', 'thumbnail_url', 'game_url', 'creator'] as const) {
        if (body[field] !== undefined) updates[field] = body[field];
      }
      const game = await storage.updateGame(gameId, updates);
      res.json(game);
    } catch (err) {
      console.error("update-game error:", err);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  app.post("/api/admin/clear-games", requireAdmin, async (req, res) => {
    try {
      await storage.clearAllGames();
      res.json({ message: "All apps and ratings cleared" });
    } catch (err) {
      console.error("clear-games error:", err);
      res.status(500).json({ message: "Failed to clear apps" });
    }
  });

  const SEED_GAMES = [
    {
      title: "TrumpChat",
      description: "An AI chatbot that responds to everything exactly like Donald Trump would. Bigly responses guaranteed. Built in 60 minutes during Viber #1.",
      thumbnail_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/White_shark.jpg/800px-White_shark.jpg",
      game_url: "https://trumpchat.replit.app",
      creator: "Team Alpha",
    },
  ];

  app.post("/api/admin/seed-games", requireAdmin, async (req, res) => {
    try {
      const created = [];
      for (const seed of SEED_GAMES) {
        const game = await storage.createGame(seed);
        created.push(game);
      }
      res.json({ message: `Seeded ${created.length} app(s)`, games: created });
    } catch (err) {
      console.error("seed-games error:", err);
      res.status(500).json({ message: "Failed to seed apps" });
    }
  });

  // Rate limiting middleware
  const ratingLimiter = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  const MAX_RATINGS_PER_WINDOW = 10; // Max 10 ratings per minute per IP

  // Security middleware for rating protection
  const validateRatingRequest = async (req: any, res: any, next: any) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Rate limiting check
    const limitKey = clientIP;
    const limit = ratingLimiter.get(limitKey);
    
    if (limit) {
      if (now > limit.resetTime) {
        // Reset window
        ratingLimiter.set(limitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
      } else if (limit.count >= MAX_RATINGS_PER_WINDOW) {
        console.log(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({ 
          error: "Too many rating attempts. Please wait before rating again.",
          retryAfter: Math.ceil((limit.resetTime - now) / 1000)
        });
      } else {
        limit.count++;
      }
    } else {
      ratingLimiter.set(limitKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    }

    next();
  };

  app.post("/api/games/:gameId/rate", validateRatingRequest, async (req, res) => {
    try {
      const { gameId } = req.params;
      const { rating, sessionId } = req.body;
      const userAgent = req.get('User-Agent') || '';
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
      
      console.log(`Secure rating request - GameID: ${gameId}, Rating: ${rating}, IP: ${clientIP}`);
      console.log(`Mobile device: ${isMobile}, User-Agent: ${userAgent}`);

      // Validate session ID format (basic check against obvious fakes)
      // Accept UUID format (with hyphens) or simple alphanumeric strings
      if (!sessionId || sessionId.length < 10 || !/^[a-f0-9-_]+$/i.test(sessionId)) {
        console.log('Rating failed: Invalid or suspicious session ID format:', sessionId);
        return res.status(400).json({ error: "Invalid session format" });
      }

      if (!rating || rating < 1 || rating > 5) {
        console.log('Rating failed: Invalid rating value:', rating);
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }

      // Check if user is authenticated to link rating to user account
      let userId = null;
      const authSessionId = req.cookies.sessionId;
      if (authSessionId) {
        const userSession = await storage.getSession(authSessionId);
        if (userSession && userSession.expires_at > new Date()) {
          userId = userSession.user_id;
          console.log(`Authenticated user rating - User ID: ${userId}`);
        }
      }

      // Check if game exists
      const game = await storage.getGame(gameId);
      if (!game) {
        console.log('Rating failed: Game not found:', gameId);
        return res.status(404).json({ error: "Game not found" });
      }

      // Check if user already has a rating for this game (prioritize user-based lookup for authenticated users)
      let existingRating;
      if (userId) {
        existingRating = await storage.getRatingByUserAndGame(userId, gameId);
      } else {
        existingRating = await storage.getRatingBySessionAndGame(sessionId, gameId);
      }
      let isUpdate = !!existingRating;

      // Security: Prevent competitors from rating games
      // This would require checking user authentication and role
      // For now, we'll implement basic session validation
      if (sessionId.startsWith('competitor_')) {
        console.log('Rating blocked: Competitors cannot vote on games');
        return res.status(403).json({ error: "Competitors cannot vote on games" });
      }

      // Enhanced rating data with security fields and user linkage
      const ratingData = { 
        game_id: gameId, 
        session_id: sessionId, 
        user_id: userId ? userId.toString() : null, // Link to authenticated user
        rating,
        ip_address: clientIP,
        user_agent: userAgent
      };
      
      await storage.createOrUpdateRating(ratingData);
      
      console.log(`Rating ${isUpdate ? 'updated' : 'created'} successfully with security data`);
      res.json({ 
        success: true,
        message: isUpdate ? "Rating updated successfully" : "Rating registered successfully"
      });
    } catch (error) {
      console.error("Error rating game:", error);
      res.status(500).json({ 
        error: "Failed to rate game",
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Get user's ratings by session ID (legacy)
  app.get("/api/ratings/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const ratings = await storage.getRatingsBySession(sessionId);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  // Get authenticated user's ratings
  app.get("/api/user/ratings", async (req, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      if (!sessionId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const session = await storage.getSession(sessionId);
      if (!session || session.expires_at < new Date()) {
        return res.status(401).json({ error: "Session expired" });
      }

      const ratings = await storage.getRatingsByUser(session.user_id);
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching user ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  // Mobile diagnostic endpoint
  app.get("/api/mobile-test", (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    res.json({
      mobile: isMobile,
      userAgent,
      timestamp: new Date().toISOString(),
      cookies: req.cookies,
      headers: req.headers
    });
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time notifications on a specific path
  const wss = new WebSocketServer({ noServer: true });
  
  httpServer.on('upgrade', (request, socket, head) => {
    // Only handle WebSocket upgrades for our notifications path
    if (request.url === '/ws/notifications') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
  
  wss.on('connection', (ws) => {
    console.log('New notification WebSocket client connected');
    
    ws.on('error', (error) => {
      console.error('Notification WebSocket error:', error);
    });
    
    ws.on('close', () => {
      console.log('Notification WebSocket client disconnected');
    });
  });

  // Store WebSocket server on app for broadcasting
  (app as any).wss = wss;

  return httpServer;
}
