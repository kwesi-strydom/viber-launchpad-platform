import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link } from 'react-router-dom';
import {
  Play, Pause, RotateCcw, Square, Plus, Trash2, Shield, Sprout,
  Zap, Target, Megaphone, ExternalLink, Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import type { DashboardSnapshot, DashboardTeam, DashboardEvent } from '@shared/schema';

const CHALLENGE_TYPES = [
  { value: 'founders_dispute', label: "Founders' Dispute" },
  { value: 'server_crash', label: 'Server Crash' },
  { value: 'lawsuit', label: 'Legal Action' },
  { value: 'copyright_strike', label: 'Copyright Strike' },
  { value: 'safe_round', label: 'Safe Round' },
  { value: 'custom', label: 'Custom' },
];

const DashboardAdminPage = () => {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery<DashboardSnapshot>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 5000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });

  const eventMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/event', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });
  const seedMut = useMutation({
    mutationFn: () => apiRequest('/api/admin/dashboard/teams/seed', { method: 'POST' }),
    onSuccess: () => { invalidate(); toast({ title: 'Teams loaded' }); },
    onError: () => toast({ title: 'Seed failed', variant: 'destructive' }),
  });
  const addTeamMut = useMutation({
    mutationFn: (name: string) => apiRequest('/api/admin/dashboard/teams', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: invalidate,
  });
  const updateTeamMut = useMutation({
    mutationFn: (vars: { id: number; data: Partial<DashboardTeam> }) => apiRequest(`/api/admin/dashboard/teams/${vars.id}`, { method: 'PATCH', body: JSON.stringify(vars.data) }),
    onSuccess: invalidate,
  });
  const deleteTeamMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/dashboard/teams/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const challengeMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/challenge', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: 'Challenge triggered' }); },
    onError: () => toast({ title: 'Need a team', variant: 'destructive' }),
  });
  const sideQuestMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/side-quest', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: 'Side quest launched' }); },
    onError: () => toast({ title: 'Need a title', variant: 'destructive' }),
  });
  const resolveMut = useMutation({
    mutationFn: (vars: { id: string; resultText?: string }) => apiRequest(`/api/admin/dashboard/events/${vars.id}/resolve`, { method: 'POST', body: JSON.stringify({ resultText: vars.resultText }) }),
    onSuccess: invalidate,
  });
  const feedMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest('/api/admin/dashboard/feed', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => { invalidate(); toast({ title: 'Posted to feed' }); },
  });
  const resetAllMut = useMutation({
    mutationFn: () => apiRequest('/api/admin/dashboard/reset-all', { method: 'POST' }),
    onSuccess: () => { invalidate(); toast({ title: 'Dashboard reset' }); },
  });
  const resetChallengesMut = useMutation({
    mutationFn: () => apiRequest('/api/admin/dashboard/clear-outcomes', { method: 'POST' }),
    onSuccess: () => { invalidate(); toast({ title: 'All challenges reset' }); },
    onError: () => toast({ title: 'Reset failed', variant: 'destructive' }),
  });

  // form state
  const [newTeam, setNewTeam] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [challengeTeam, setChallengeTeam] = useState<number | ''>('');
  const [challengeType, setChallengeType] = useState('server_crash');
  const [challengeDur, setChallengeDur] = useState<number | ''>(120);
  const [sqLabel, setSqLabel] = useState('');
  const [sqReward, setSqReward] = useState('');
  const [sqDur, setSqDur] = useState<number | ''>(180);
  const [announce, setAnnounce] = useState('');
  const [announceNotify, setAnnounceNotify] = useState(true);

  if (authLoading) return <div className="p-8 text-center text-ink-300">Checking access…</div>;
  if (!user || !user.isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="h2 text-xl text-primary mb-2">Admin only</h1>
        <p className="text-ink-300">You need operator access to control the live dashboard.</p>
      </div>
    );
  }

  const event = data?.event;
  const teams = data?.teams ?? [];
  const activeEvents = (data?.events ?? []).filter((e) => e.active);

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="kicker mb-1">Operator Console</p>
          <h1 className="text-2xl font-extrabold text-foreground">Live Dashboard Control</h1>
        </div>
        <a href="/dashboard" target="_blank" rel="noreferrer" className="btn btn-ghost inline-flex items-center gap-2">
          <ExternalLink size={15} /> Open public dashboard
        </a>
      </div>

      {/* Timer */}
      <section className="card p-5">
        <h2 className="font-bold text-lg text-foreground mb-3">Event Timer</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="btn btn-primary inline-flex items-center gap-2" onClick={() => eventMut.mutate({ action: 'start' })}><Play size={15} /> Start</button>
          <button className="btn inline-flex items-center gap-2" onClick={() => eventMut.mutate({ action: 'pause' })}><Pause size={15} /> Pause</button>
          <button className="btn inline-flex items-center gap-2" onClick={() => eventMut.mutate({ action: 'end' })}><Square size={15} /> End</button>
          <button className="btn btn-ghost inline-flex items-center gap-2" onClick={() => { if (confirm('Reset the timer? This also clears the live feed and all wheel outcomes.')) eventMut.mutate({ action: 'reset' }); }}><RotateCcw size={15} /> Reset timer</button>
          <span className="mono-label ml-auto">Status: {event?.status ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <label className="text-sm text-ink-300">Event length (minutes)</label>
          <input type="number" min={1} max={1440} value={durationMin} onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
            className="w-24 bg-ink-800 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
          <button className="btn btn-ghost" onClick={() => eventMut.mutate({ action: 'set-duration', durationSeconds: durationMin * 60 })}>Set length</button>
        </div>
      </section>

      {/* Teams */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-foreground">Teams</h2>
          <button className="btn btn-ghost inline-flex items-center gap-2" onClick={() => seedMut.mutate()}><Sprout size={15} /> Load from platform teams</button>
        </div>
        <div className="flex flex-col gap-2">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-ink-800 rounded-sm px-3 py-2 flex-wrap">
              <input type="color" value={t.color} onChange={(e) => updateTeamMut.mutate({ id: t.id, data: { color: e.target.value } })}
                className="w-8 h-8 rounded bg-transparent border-0 cursor-pointer p-0" title="Team colour" />
              <span className="font-semibold text-foreground flex-1 min-w-[120px]">{t.name}</span>
              <div className="flex items-center gap-1">
                <span className="mono-label">Rank</span>
                <input type="number" min={1} value={t.rank ?? ''} placeholder="-" onChange={(e) => updateTeamMut.mutate({ id: t.id, data: { rank: e.target.value ? parseInt(e.target.value) : null } })}
                  className="w-14 bg-ink-900 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
              </div>
              <div className="flex items-center gap-1">
                <Shield size={14} className="text-[color:var(--accent)]" />
                <button className="btn btn-ghost px-2 py-0.5" onClick={() => updateTeamMut.mutate({ id: t.id, data: { shields: Math.max(0, t.shields - 1) } })}>−</button>
                <span className="w-5 text-center text-foreground">{t.shields}</span>
                <button className="btn btn-ghost px-2 py-0.5" onClick={() => updateTeamMut.mutate({ id: t.id, data: { shields: t.shields + 1 } })}>+</button>
              </div>
              <button className="btn btn-ghost text-red-400 px-2" onClick={() => deleteTeamMut.mutate(t.id)}><Trash2 size={15} /></button>
            </div>
          ))}
          {teams.length === 0 && <p className="text-sm text-ink-300">No teams yet — load them or add one below.</p>}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="New team name"
            className="flex-1 bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
          <button className="btn btn-primary inline-flex items-center gap-2" disabled={!newTeam.trim()}
            onClick={() => { addTeamMut.mutate(newTeam.trim()); setNewTeam(''); }}><Plus size={15} /> Add</button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Challenge */}
        <section className="card p-5">
          <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2"><Zap size={18} className="text-red-400" /> Trigger Challenge</h2>
          <div className="flex flex-col gap-2">
            <select value={challengeTeam} onChange={(e) => setChallengeTeam(e.target.value ? parseInt(e.target.value) : '')}
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground">
              <option value="">Select team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={challengeType} onChange={(e) => setChallengeType(e.target.value)}
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground">
              {CHALLENGE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-300">Countdown (sec, optional)</label>
              <input type="number" min={0} value={challengeDur} onChange={(e) => setChallengeDur(e.target.value ? parseInt(e.target.value) : '')}
                className="w-24 bg-ink-800 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
            </div>
            <button className="btn btn-primary inline-flex items-center justify-center gap-2" disabled={challengeTeam === ''}
              onClick={() => challengeMut.mutate({ teamId: challengeTeam, type: challengeType, durationSeconds: challengeDur === '' ? null : challengeDur })}>
              <Zap size={15} /> Trigger
            </button>
          </div>
        </section>

        {/* Side quest */}
        <section className="card p-5">
          <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2"><Target size={18} className="text-[color:var(--accent)]" /> Launch Side Quest</h2>
          <div className="flex flex-col gap-2">
            <input value={sqLabel} onChange={(e) => setSqLabel(e.target.value)} placeholder="Side quest title"
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
            <input value={sqReward} onChange={(e) => setSqReward(e.target.value)} placeholder="Reward (e.g. a shield)"
              className="bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-ink-300">Countdown (sec, optional)</label>
              <input type="number" min={0} value={sqDur} onChange={(e) => setSqDur(e.target.value ? parseInt(e.target.value) : '')}
                className="w-24 bg-ink-800 border border-ink-600 rounded-sm px-2 py-1 text-foreground" />
            </div>
            <button className="btn btn-primary inline-flex items-center justify-center gap-2" disabled={!sqLabel.trim()}
              onClick={() => { sideQuestMut.mutate({ label: sqLabel.trim(), reward: sqReward.trim() || null, durationSeconds: sqDur === '' ? null : sqDur }); setSqLabel(''); setSqReward(''); }}>
              <Target size={15} /> Launch
            </button>
          </div>
        </section>
      </div>

      {/* Active events */}
      {activeEvents.length > 0 && (
        <section className="card p-5">
          <h2 className="font-bold text-lg text-foreground mb-3">Active Cards</h2>
          <div className="flex flex-col gap-2">
            {activeEvents.map((ev: DashboardEvent) => (
              <div key={ev.id} className="flex items-center gap-3 bg-ink-800 rounded-sm px-3 py-2">
                <span className="text-xs font-mono uppercase text-ink-400 w-20">{ev.category === 'side_quest' ? 'Side Quest' : 'Challenge'}</span>
                <span className="text-sm text-foreground flex-1">{ev.label}{ev.teamName ? ` → ${ev.teamName}` : ''}</span>
                <button className="btn btn-ghost inline-flex items-center gap-1.5" onClick={() => resolveMut.mutate({ id: ev.id })}>
                  <Check size={14} /> Clear
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Announcement */}
      <section className="card p-5">
        <h2 className="font-bold text-lg text-foreground mb-3 flex items-center gap-2"><Megaphone size={18} className="text-[color:var(--accent)]" /> Announcement</h2>
        <textarea value={announce} onChange={(e) => setAnnounce(e.target.value)} rows={2} placeholder="Post a message to the live feed…"
          className="w-full bg-ink-800 border border-ink-600 rounded-sm px-3 py-2 text-foreground" />
        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-300">
            <input type="checkbox" checked={announceNotify} onChange={(e) => setAnnounceNotify(e.target.checked)} />
            Also notify logged-in users
          </label>
          <button className="btn btn-primary inline-flex items-center gap-2" disabled={!announce.trim()}
            onClick={() => { feedMut.mutate({ message: announce.trim(), kind: 'announcement', notify: announceNotify }); setAnnounce(''); }}>
            <Megaphone size={15} /> Post
          </button>
        </div>
      </section>

      {/* Reset challenges */}
      <section className="card p-5 border-red-500/40">
        <h2 className="font-bold text-lg text-foreground mb-1 flex items-center gap-2"><RotateCcw size={18} className="text-red-400" /> Reset all challenges</h2>
        <p className="text-sm text-ink-300 mb-3">Wipes every challenge, side quest and feed item for this session. The event timer keeps running.</p>
        <button className="btn btn-primary inline-flex items-center gap-2" disabled={resetChallengesMut.isPending}
          onClick={() => { if (confirm('Are you sure you want to reset all challenges? This will erase all the challenges info and feed for this session')) resetChallengesMut.mutate(); }}>
          <RotateCcw size={15} /> Reset all challenges
        </button>
      </section>

      <div className="flex justify-between items-center pt-2">
        <Link to="/admin" className="text-sm text-ink-300 hover:text-foreground">← Back to admin</Link>
        <button className="btn btn-ghost text-red-400 inline-flex items-center gap-2" onClick={() => { if (confirm('Reset timer, clear all events and feed?')) resetAllMut.mutate(); }}>
          <RotateCcw size={15} /> Reset everything
        </button>
      </div>

      {isLoading && <p className="text-center text-ink-400 text-sm">Loading…</p>}
    </div>
  );
};

export default DashboardAdminPage;
