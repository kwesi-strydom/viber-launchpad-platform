import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Radio, Shield, Zap, Scale, Copyright, Users, Target, Trophy,
  Activity, Clock, Megaphone, Rocket, TrendingUp, Flag,
} from 'lucide-react';
import type { DashboardSnapshot, DashboardTeam, DashboardEvent, FeedEvent, EventState } from '@shared/schema';

// ── helpers ──────────────────────────────────────────────────────────────────

function computeElapsed(event: EventState, now: number) {
  let elapsed = event.accumulatedSeconds;
  if (event.status === 'running' && event.startedAt) {
    elapsed += Math.floor((now - new Date(event.startedAt).getTime()) / 1000);
  }
  return Math.max(0, Math.min(elapsed, event.durationSeconds));
}

function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function fmtTimeOfDay(date: string | Date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CHALLENGE_ICONS: Record<string, typeof Zap> = {
  founders_dispute: Users,
  server_crash: Zap,
  lawsuit: Scale,
  copyright_strike: Copyright,
  safe_round: Shield,
  side_quest: Target,
  custom: Activity,
};

function challengeIcon(type: string) {
  return CHALLENGE_ICONS[type] ?? Activity;
}

const FEED_ACCENT: Record<string, string> = {
  challenge: 'text-red-400',
  side_quest: 'text-[color:var(--accent)]',
  deploy: 'text-emerald-400',
  market: 'text-cyan-400',
  announcement: 'text-[color:var(--accent)]',
  info: 'text-ink-300',
};

// ── page ─────────────────────────────────────────────────────────────────────

const DashboardPage = () => {
  const { data, isLoading } = useQuery<DashboardSnapshot>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 5000,
  });

  // Tick every second so timers and countdowns animate smoothly.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Radio size={32} className="animate-pulse text-[color:var(--accent)]" />
        <span className="kicker">Connecting to the arena…</span>
      </div>
    );
  }

  const { event, teams, events, feed } = data;
  const elapsed = computeElapsed(event, now);
  const remaining = event.durationSeconds - elapsed;
  const pct = event.durationSeconds > 0 ? Math.min(100, (elapsed / event.durationSeconds) * 100) : 0;
  const isLive = event.status === 'running';

  const activeChallenges = events.filter((e) => e.active && e.category === 'challenge');
  const activeSideQuests = events.filter((e) => e.active && e.category === 'side_quest');

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 flex flex-col gap-5">
      {/* Hero timer */}
      <HeroTimer event={event} remaining={remaining} elapsed={elapsed} pct={pct} isLive={isLive} events={events} />

      {/* Quest Timeline + Prediction Market */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <QuestTimeline teams={teams} events={events} durationSeconds={event.durationSeconds} elapsedPct={pct} />
        </div>
        <div className="lg:col-span-1">
          <PredictionMarket />
        </div>
      </div>

      {/* Active Event Cards */}
      <ActiveEventCards challenges={activeChallenges} sideQuests={activeSideQuests} now={now} />

      {/* Live Feed */}
      <LiveFeed feed={feed} />
    </div>
  );
};

// ── hero timer ───────────────────────────────────────────────────────────────

const HeroTimer = ({ event, remaining, elapsed, pct, isLive, events }: {
  event: EventState; remaining: number; elapsed: number; pct: number; isLive: boolean; events: DashboardEvent[];
}) => {
  const duration = event.durationSeconds;
  const overtime = remaining <= 0 && event.status !== 'idle';

  const headline =
    event.status === 'idle' ? 'Ready to battle?' :
    event.status === 'ended' ? 'Time’s up!' :
    event.status === 'paused' ? 'Battle paused' :
    'Battle in progress';
  const subline =
    event.status === 'idle' ? 'The clock starts when the operator hits go.' :
    event.status === 'ended' ? 'Builders, down tools — final standings below.' :
    'Ship fast. Survive the Wheel. Claim the crown.';

  // How many segments to slice the competition timeline into (≈10-min blocks).
  const segCount = duration >= 1200 ? Math.min(12, Math.max(4, Math.round(duration / 600))) : 6;

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.13]"
        style={{ background: 'radial-gradient(circle at 50% -25%, var(--accent), transparent 60%)' }} />
      <div className="relative px-5 pt-6 pb-6 flex flex-col items-center text-center">
        <div className="w-full flex items-center justify-between mb-1">
          <p className="kicker">Viber Live Arena</p>
          {isLive ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-red-600 text-white text-xs font-mono uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Live
            </span>
          ) : (
            <span className="mono-label">{event.status}</span>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{headline}</h2>
        <p className="text-sm text-ink-300">{subline}</p>

        {/* giant clock */}
        <div className="font-mono font-black tabular-nums leading-[0.85] select-none my-2"
          style={{
            fontSize: 'clamp(5rem, 17vw, 12rem)',
            color: overtime ? '#ef4444' : 'var(--ink-000, #fff)',
            textShadow: isLive ? '0 0 55px var(--accent-soft), 0 0 16px var(--accent-soft)' : 'none',
          }}>
          {fmtClock(remaining)}
        </div>
        <p className="mono-label mb-6">{overtime ? 'Overtime' : 'Time left'}</p>

        {/* competition timeline */}
        <GlobalTimeline duration={duration} pct={pct} elapsed={elapsed} events={events} segCount={segCount} status={event.status} />
      </div>
    </div>
  );
};

const GlobalTimeline = ({ duration, pct, elapsed, events, segCount, status }: {
  duration: number; pct: number; elapsed: number; events: DashboardEvent[]; segCount: number; status: string;
}) => {
  const [openCluster, setOpenCluster] = useState<number | null>(null);

  // Only reveal events the clock has actually reached — they appear live as they happen.
  const revealed = events
    .filter((e) => e.atSeconds >= 0 && e.atSeconds <= elapsed + 1)
    .sort((a, b) => a.atSeconds - b.atSeconds);

  // Group events that fired at the same moment (e.g. one Wheel spin hitting several teams)
  // into a single marker so they don't overlap into an unreadable pile.
  const clusters = Array.from(
    revealed.reduce((map, ev) => {
      const arr = map.get(ev.atSeconds) ?? [];
      arr.push(ev);
      map.set(ev.atSeconds, arr);
      return map;
    }, new Map<number, DashboardEvent[]>()).entries()
  ).map(([atSeconds, items]) => ({ atSeconds, items }));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-xs font-mono text-ink-400">0:00</span>
        <span className="mono-label">Competition timeline</span>
        <span className="text-xs font-mono text-ink-400">{fmtClock(duration)}</span>
      </div>

      {/* Wrapper is overflow-visible so marker popovers can escape above the bar. */}
      <div className="relative">
        <div className="relative h-16 rounded-md bg-ink-800 border border-ink-600 overflow-hidden">
          {/* segment dividers */}
          {Array.from({ length: Math.max(0, segCount - 1) }).map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-ink-700"
              style={{ left: `${((i + 1) / segCount) * 100}%` }} />
          ))}
          {/* elapsed fill */}
          <div className="absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-soft), var(--accent))', opacity: 0.5 }} />
          {/* finish flag */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-ink-300">
            <Flag size={16} />
          </div>
          {/* playhead */}
          {status !== 'idle' && (
            <div className="absolute top-0 bottom-0 z-20 transition-[left] duration-1000 ease-linear" style={{ left: `${pct}%` }}>
              <div className="absolute inset-y-0 -translate-x-1/2 w-0.5 bg-foreground/90" />
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-foreground ring-4 ring-[color:var(--accent-soft)]" />
            </div>
          )}
        </div>

        {/* interactive event markers (overlay so popovers aren't clipped) */}
        {clusters.map(({ atSeconds, items }) => {
          const left = duration > 0 ? Math.min(100, (atSeconds / duration) * 100) : 0;
          const isChallenge = items.some((m) => m.category === 'challenge');
          const Icon = challengeIcon(items[0].type);
          const isOpen = openCluster === atSeconds;
          // Keep the popover on-screen near the edges of the bar.
          const align = left < 14 ? 'left' : left > 86 ? 'right' : 'center';
          const popPos =
            align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
          return (
            <div key={atSeconds} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 group"
              style={{ left: `${left}%` }}>
              <button type="button"
                onClick={() => setOpenCluster(isOpen ? null : atSeconds)}
                aria-label={`${items.length} event${items.length > 1 ? 's' : ''} at ${fmtClock(atSeconds)}`}
                className={`relative w-9 h-9 rounded-full ring-2 ring-ink-900 flex items-center justify-center shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-[color:var(--accent)] ${isOpen ? 'scale-110' : ''} ${isChallenge ? 'bg-red-600' : 'bg-[color:var(--accent)]'}`}>
                <Icon size={18} className={isChallenge ? 'text-white' : 'text-[color:var(--accent-ink,#0a0b0d)]'} />
                {items.length > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ink-900 border border-ink-500 text-[10px] font-mono font-bold text-ink-100 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </button>

              {/* popover — visible on hover, or pinned on click (good for touch/big screens) */}
              <div className={`absolute bottom-full mb-2 ${popPos} z-40 w-max max-w-[18rem] rounded-md bg-ink-900 border border-ink-600 shadow-xl px-3 py-2 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none'}`}>
                <div className="mono-label mb-1 text-ink-400">{fmtClock(atSeconds)} in</div>
                <ul className="flex flex-col gap-1">
                  {items.map((m) => {
                    const MIcon = challengeIcon(m.type);
                    const mChallenge = m.category === 'challenge';
                    return (
                      <li key={m.id} className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${mChallenge ? 'bg-red-600' : 'bg-[color:var(--accent)]'}`}>
                          <MIcon size={9} className={mChallenge ? 'text-white' : 'text-[color:var(--accent-ink,#0a0b0d)]'} />
                        </span>
                        <span className="text-[11px] font-mono text-ink-100 whitespace-nowrap">
                          {m.label}{m.teamName ? ` · ${m.teamName}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-ink-400 text-center">
        {clusters.length === 0 ? 'No challenges yet — they appear here as the Wheel strikes.' : 'Hover or tap a marker to see what struck.'}
      </p>
    </div>
  );
};

// ── quest timeline ───────────────────────────────────────────────────────────

const QuestTimeline = ({ teams, events, durationSeconds, elapsedPct }: { teams: DashboardTeam[]; events: DashboardEvent[]; durationSeconds: number; elapsedPct: number }) => {
  const ranked = [...teams].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="card p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-[color:var(--accent)]" />
        <h2 className="font-bold text-lg text-foreground">Quest Timeline</h2>
        <span className="mono-label ml-auto">{teams.length} teams</span>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-ink-300 py-8 text-center">No teams on the board yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {ranked.map((team) => {
            const markers = events.filter((e) => e.category === 'challenge' && e.teamId === team.id);
            return (
              <div key={team.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  {team.rank != null && (
                    <span className="text-xs font-mono font-bold text-ink-400 w-6">#{team.rank}</span>
                  )}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: team.color }} />
                  <span className="text-sm font-semibold text-foreground truncate">{team.name}</span>
                  <span className="flex items-center gap-0.5 ml-auto">
                    {Array.from({ length: team.shields }).map((_, i) => (
                      <Shield key={i} size={13} className="text-[color:var(--accent)]" fill="currentColor" />
                    ))}
                  </span>
                </div>
                <div className="relative h-5 rounded-sm bg-ink-800 overflow-hidden">
                  {/* fill by elapsed event time */}
                  <div className="absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear opacity-80"
                    style={{ width: `${elapsedPct}%`, background: `linear-gradient(90deg, ${team.color}33, ${team.color})` }} />
                  {/* challenge markers */}
                  {markers.map((m) => {
                    const left = durationSeconds > 0 ? Math.min(100, (m.atSeconds / durationSeconds) * 100) : 0;
                    const Icon = challengeIcon(m.type);
                    return (
                      <div key={m.id} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
                        style={{ left: `${left}%` }}>
                        <div className="w-4 h-4 rounded-full bg-red-600 ring-2 ring-ink-900 flex items-center justify-center shadow">
                          <Icon size={9} className="text-white" />
                        </div>
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink-900 border border-ink-600 px-2 py-1 text-[10px] text-ink-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── prediction market (reserved for Mathis) ──────────────────────────────────

const PredictionMarket = () => (
  <div className="card p-5 h-full flex flex-col">
    <div className="flex items-center gap-2 mb-4">
      <TrendingUp size={18} className="text-cyan-400" />
      <h2 className="font-bold text-lg text-foreground">Prediction Market</h2>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-ink-600 rounded-sm py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center">
        <TrendingUp size={22} className="text-ink-400" />
      </div>
      <p className="text-sm font-semibold text-ink-200">Coming soon</p>
      <p className="text-xs text-ink-400 max-w-[220px]">Place your bets on who ships, who survives the Wheel, and who takes the crown.</p>
    </div>
  </div>
);

// ── active event cards ───────────────────────────────────────────────────────

const ActiveEventCards = ({ challenges, sideQuests, now }: { challenges: DashboardEvent[]; sideQuests: DashboardEvent[]; now: number }) => {
  if (challenges.length === 0 && sideQuests.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {challenges.map((c) => <EventCard key={c.id} ev={c} now={now} kind="challenge" />)}
      {sideQuests.map((q) => <EventCard key={q.id} ev={q} now={now} kind="side_quest" />)}
    </div>
  );
};

const EventCard = ({ ev, now, kind }: { ev: DashboardEvent; now: number; kind: 'challenge' | 'side_quest' }) => {
  const Icon = challengeIcon(ev.type);
  let countdown: number | null = null;
  if (ev.durationSeconds) {
    const endsAt = new Date(ev.createdAt).getTime() + ev.durationSeconds * 1000;
    countdown = Math.max(0, Math.floor((endsAt - now) / 1000));
  }
  const isChallenge = kind === 'challenge';
  return (
    <div className={`card p-5 relative overflow-hidden border ${isChallenge ? 'border-red-600/60' : 'border-[color:var(--accent)]/60'}`}>
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle at 100% 0%, ${isChallenge ? '#ef4444' : 'var(--accent)'}, transparent 60%)` }} />
      <div className="relative flex items-start gap-4">
        <div className={`w-11 h-11 rounded-sm flex items-center justify-center shrink-0 ${isChallenge ? 'bg-red-600' : 'bg-[color:var(--accent)]'}`}>
          <Icon size={20} className={isChallenge ? 'text-white' : 'text-[color:var(--accent-ink,#0a0b0d)]'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="mono-label mb-0.5">{isChallenge ? 'Wheel of Destiny' : 'Side Quest'}</p>
          <p className="font-bold text-foreground leading-snug">{ev.label}</p>
          {ev.teamName && <p className="text-sm text-ink-300 mt-0.5">Target: <span className="text-foreground font-semibold">{ev.teamName}</span></p>}
          {ev.reward && <p className="text-sm text-ink-300 mt-0.5">Reward: <span className="text-[color:var(--accent)] font-semibold">{ev.reward}</span></p>}
        </div>
        {countdown != null && (
          <div className="text-right shrink-0">
            <p className="mono-label mb-0.5">Ends in</p>
            <p className="font-mono font-bold text-2xl tabular-nums text-foreground">{fmtClock(countdown)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── live feed ────────────────────────────────────────────────────────────────

const FEED_ICON: Record<string, typeof Activity> = {
  challenge: Zap,
  side_quest: Target,
  deploy: Rocket,
  market: TrendingUp,
  announcement: Megaphone,
  info: Activity,
};

const LiveFeed = ({ feed }: { feed: FeedEvent[] }) => (
  <div className="card p-5">
    <div className="flex items-center gap-2 mb-4">
      <Clock size={18} className="text-[color:var(--accent)]" />
      <h2 className="font-bold text-lg text-foreground">Live Feed</h2>
    </div>
    {feed.length === 0 ? (
      <p className="text-sm text-ink-300 py-6 text-center">Nothing has happened yet. Stay tuned.</p>
    ) : (
      <div className="flex flex-col divide-y divide-ink-700 max-h-[340px] overflow-y-auto">
        {feed.map((f) => {
          const Icon = FEED_ICON[f.kind] ?? Activity;
          return (
            <div key={f.id} className="flex items-center gap-3 py-2.5">
              <Icon size={15} className={`shrink-0 ${FEED_ACCENT[f.kind] ?? 'text-ink-300'}`} />
              <p className="text-sm text-ink-100 flex-1">{f.message}</p>
              <span className="text-xs font-mono text-ink-400 shrink-0 tabular-nums">{fmtTimeOfDay(f.createdAt)}</span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default DashboardPage;
