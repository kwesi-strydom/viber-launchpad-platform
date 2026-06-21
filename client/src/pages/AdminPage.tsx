import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link } from 'react-router-dom';
import { Trash2, Edit2, Check, X, Shield, Zap, QrCode, Lock, Unlock, ExternalLink, UserX, Database, Sprout, Users, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, OnboardingRecord } from '@shared/schema';
import { COUNTRIES, SHIRT_SIZES, countryFlag } from '@/lib/countries';

type SafeUser = Omit<User, 'password'>;

const CURRENT_EDITION = 5;

interface OnboardingRow {
  key: string;
  id: number;
  name: string;
  email: string;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  country: string | null;
  shirtSize: string | null;
  paymentMethod: string | null;
  shirtPaid: boolean | null;
  onboarded: boolean | null;
  readOnly: boolean;
}

interface TeamMember {
  id: number;
  name: string;
  discordId: string | null;
  discordAvatar: string | null;
}

interface AdminTeam {
  id: number;
  slug: string;
  name: string;
  nameChanged: boolean;
  memberCount: number;
  members: TeamMember[];
}

const AdminPage = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'users' | 'teams' | 'onboarding' | 'tools'>('users');
  const [search, setSearch] = useState('');
  const [editionFilter, setEditionFilter] = useState(5);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SafeUser>>({});
  const [renamingSlug, setRenamingSlug] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { data: currentUser } = useQuery<{ user: SafeUser }>({ queryKey: ['/api/auth/user'] });
  const { data: users = [], isLoading } = useQuery<SafeUser[]>({ queryKey: ['/api/admin/users'] });
  const { data: adminTeams = [], isLoading: teamsLoading } = useQuery<AdminTeam[]>({
    queryKey: ['/api/admin/teams'],
    enabled: tab === 'teams',
  });
  const { data: pastOnboardings = [], isLoading: pastLoading } = useQuery<OnboardingRecord[]>({
    queryKey: [`/api/admin/onboardings/${editionFilter}`],
    enabled: tab === 'onboarding' && editionFilter !== CURRENT_EDITION,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<SafeUser> }) =>
      apiRequest(`/api/admin/users/${vars.id}`, { method: 'PATCH', body: JSON.stringify(vars.data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }); setEditingId(null); },
    onError: () => toast({ title: 'Update failed', variant: 'destructive' }),
  });

  const adminRenameMutation = useMutation({
    mutationFn: (vars: { slug: string; newName: string }) =>
      apiRequest(`/api/teams/${vars.slug}/rename`, { method: 'PATCH', body: JSON.stringify({ newName: vars.newName }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setRenamingSlug(null);
      setRenameValue('');
      toast({ title: 'Team renamed successfully' });
    },
    onError: (err: any) => toast({ title: err?.message || 'Rename failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }),
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const clearTeamsMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/clear-teams', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teams'] });
      toast({ title: 'All team assignments cleared' });
    },
    onError: () => toast({ title: 'Failed to clear teams', variant: 'destructive' }),
  });

  const clearGamesMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/clear-games', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({ title: 'All apps and ratings cleared' });
    },
    onError: () => toast({ title: 'Failed to clear apps', variant: 'destructive' }),
  });

  const seedGamesMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/seed-games', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({ title: 'Seed app added successfully' });
    },
    onError: () => toast({ title: 'Failed to seed apps', variant: 'destructive' }),
  });

  if (!currentUser?.user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center card">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="h2 text-primary mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.discordUsername || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.teamName || '').toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (user: SafeUser) => {
    setEditingId(user.id);
    setEditForm({ userType: user.userType, teamName: user.teamName || '', teammate: user.teammate || '', isAdmin: user.isAdmin });
  };

  const saveEdit = (id: number) => updateMutation.mutate({ id, data: editForm });

  const competitors = users.filter(u => u.userType === 'competitor');
  const spectators = users.filter(u => u.userType === 'spectator');

  return (
    <div className="arena-wrap py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="h1 text-primary">Admin</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['users', 'teams', 'onboarding', 'tools'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}>
            {t === 'users' ? 'Users' : t === 'teams' ? 'Teams' : t === 'onboarding' ? 'Onboarding' : 'Tools'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="arena-grid cols-3 mb-6">
            <div className="stat">
              <div className="stat-label flex items-center gap-2"><Users className="w-4 h-4"/> Competitors</div>
              <div className="stat-value">{competitors.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label flex items-center gap-2"><Eye className="w-4 h-4"/> Spectators</div>
              <div className="stat-value">{spectators.length}</div>
            </div>
            <div className="stat">
              <div className="stat-label flex items-center gap-2"><Users className="w-4 h-4"/> Total</div>
              <div className="stat-value">{users.length}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="field flex-1">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, Discord, or team…"
              />
            </div>
            <button
              onClick={() => { if (confirm('Clear all team assignments for every user?')) clearTeamsMutation.mutate(); }}
              disabled={clearTeamsMutation.isPending}
              className="btn btn-ghost text-destructive border-destructive hover:bg-destructive/10"
            >
              <UserX className="h-4 w-4" />
              {clearTeamsMutation.isPending ? 'Clearing…' : 'Clear Teams'}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-20">Loading users…</div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Team</th>
                      <th className="px-4 py-3">Flags</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => {
                      const isEditing = editingId === user.id;
                      return (
                        <tr key={user.id} className="border-b border-border hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {user.discordAvatar ? (
                                <img src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png?size=32`}
                                  className="h-8 w-8 rounded-sm" alt="" />
                              ) : (
                                <div className="h-8 w-8 rounded-sm bg-card border border-border flex items-center justify-center text-xs text-muted-foreground">
                                  {user.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-foreground font-bold">{user.name}</div>
                                <div className="text-muted-foreground text-xs font-mono">{user.discordUsername ? `@${user.discordUsername}` : user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select value={editForm.userType || ''} onChange={e => setEditForm(f => ({ ...f, userType: e.target.value }))}
                                className="bg-card border border-border rounded px-2 py-1 text-foreground text-sm font-mono">
                                <option value="spectator">Spectator</option>
                                <option value="competitor">Competitor</option>
                              </select>
                            ) : (
                              <span className={`badge ${user.userType === 'competitor' ? 'badge-fill' : ''}`}>
                                {user.userType}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input value={editForm.teamName || ''} onChange={e => setEditForm(f => ({ ...f, teamName: e.target.value }))}
                                placeholder="Team name"
                                className="bg-card border border-border rounded px-2 py-1 text-foreground text-sm w-32 font-mono" />
                            ) : (
                              user.teamName ? (
                                <span className="badge">{user.teamName}</span>
                              ) : <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {user.nsVerified && <span className="badge">NS</span>}
                              {user.isAdmin && <span className="badge">Admin</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={() => saveEdit(user.id)} className="p-2 rounded bg-card hover:bg-primary/20 text-primary transition-colors">
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground transition-colors">
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEdit(user)} className="p-2 rounded bg-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => { if (confirm(`Delete ${user.name}?`)) deleteMutation.mutate(user.id); }}
                                    className="p-2 rounded bg-card hover:bg-destructive/20 text-destructive transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center text-muted-foreground py-10">No users match your search.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'teams' && (
        <div>
          {teamsLoading ? (
            <div className="text-center text-muted-foreground py-20">Loading teams…</div>
          ) : adminTeams.length === 0 ? (
            <div className="text-center text-muted-foreground py-20">No teams found. Assign teams to competitors first.</div>
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                      <th className="px-4 py-3">Team Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">Members</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminTeams.map((team) => {
                      const isRenaming = renamingSlug === team.slug;
                      return (
                        <tr key={team.slug} className="border-b border-border hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-foreground font-bold">{team.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono text-sm">{team.slug}</span>
                              <Link to={`/team/${team.slug}`} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {team.members.length === 0 ? (
                              <span className="text-muted-foreground text-sm">No members</span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                {team.members.map(m => (
                                  <div key={m.id} className="flex items-center gap-2">
                                    {m.discordId && m.discordAvatar ? (
                                      <img
                                        src={`https://cdn.discordapp.com/avatars/${m.discordId}/${m.discordAvatar}.png?size=32`}
                                        alt={m.name}
                                        className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                        {m.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-foreground text-sm whitespace-nowrap">{m.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {team.nameChanged ? (
                              <div className="flex items-center gap-1.5">
                                <Lock className="h-4 w-4 text-primary" />
                                <span className="text-primary text-xs font-bold uppercase">Locked</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Unlock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground text-xs font-bold uppercase">Open</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {isRenaming ? (
                                <>
                                  <input
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    placeholder="New name"
                                    className="bg-card border border-border rounded px-2 py-1 text-foreground text-sm font-mono w-32"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && renameValue.trim()) adminRenameMutation.mutate({ slug: team.slug, newName: renameValue });
                                      if (e.key === 'Escape') { setRenamingSlug(null); setRenameValue(''); }
                                    }}
                                  />
                                  <button
                                    onClick={() => { if (renameValue.trim()) adminRenameMutation.mutate({ slug: team.slug, newName: renameValue }); }}
                                    disabled={!renameValue.trim() || adminRenameMutation.isPending}
                                    className="p-2 rounded bg-card text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => { setRenamingSlug(null); setRenameValue(''); }} className="p-2 rounded bg-card text-muted-foreground hover:bg-white/10 transition-colors">
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { setRenamingSlug(team.slug); setRenameValue(team.name); }}
                                  className="btn btn-sm btn-ghost"
                                >
                                  <Edit2 className="h-3 w-3" /> Rename
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'onboarding' && (() => {
        const isPast = editionFilter !== CURRENT_EDITION;
        const liveRows: OnboardingRow[] = competitors
          .filter(u => (u.edition ?? CURRENT_EDITION) === editionFilter)
          .map(u => ({
            key: `live-${u.id}`, id: u.id, name: u.name, email: u.email,
            discordId: u.discordId, discordUsername: u.discordUsername, discordAvatar: u.discordAvatar,
            country: u.country, shirtSize: u.shirtSize, paymentMethod: u.paymentMethod,
            shirtPaid: u.shirtPaid, onboarded: u.onboarded, readOnly: false,
          }));
        const pastRows: OnboardingRow[] = pastOnboardings.map(o => ({
          key: `past-${o.id}`, id: o.userId, name: o.name || '—', email: o.email || '',
          discordId: o.discordId, discordUsername: o.discordUsername, discordAvatar: o.discordAvatar,
          country: o.country, shirtSize: o.shirtSize, paymentMethod: o.paymentMethod,
          shirtPaid: o.shirtPaid, onboarded: o.onboarded, readOnly: true,
        }));
        const editionRows = isPast ? pastRows : liveRows;
        const onboardingFiltered = editionRows.filter(r =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.country || '').toLowerCase().includes(search.toLowerCase()) ||
          (r.discordUsername || '').toLowerCase().includes(search.toLowerCase())
        );
        const completed = editionRows.filter(r => r.onboarded).length;
        const paidCount = editionRows.filter(r => r.shirtPaid).length;
        const outstanding = (completed - paidCount) * 25;
        const rowsLoading = isPast ? pastLoading : isLoading;
        return (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="mono-label">Viber Edition:</span>
              <div className="flex gap-2">
                {[5, 4].map(ed => (
                  <button key={ed} onClick={() => setEditionFilter(ed)}
                    className={`btn btn-sm ${editionFilter === ed ? 'btn-primary' : 'btn-ghost'}`}>
                    Viber {ed}{ed === 5 ? ' (Current)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="arena-grid cols-3 mb-6">
              <div className="stat">
                <div className="stat-label">Onboarded</div>
                <div className="stat-value">{completed}<span className="text-muted-foreground text-2xl">/{editionRows.length}</span></div>
              </div>
              <div className="stat">
                <div className="stat-label">Shirts Paid</div>
                <div className="stat-value text-pos">{paidCount}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Outstanding</div>
                <div className="stat-value text-neg">${outstanding}</div>
              </div>
            </div>

            {isPast && (
              <div className="card border-primary/50 bg-primary/10 text-primary flex items-center gap-3 mb-6">
                <Lock className="h-5 w-5" />
                <span>Viewing the <strong>Viber {editionFilter}</strong> historical roster — read only.</span>
              </div>
            )}

            <div className="field mb-6">
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search competitors by name, country, or Discord…"
              />
            </div>

            {rowsLoading ? (
              <div className="text-center text-muted-foreground py-20">Loading competitors…</div>
            ) : onboardingFiltered.length === 0 ? (
              <div className="text-center text-muted-foreground py-20">No competitors found.</div>
            ) : (
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase mono-label">
                        <th className="px-4 py-3">Competitor</th>
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">Shirt Size</th>
                        <th className="px-4 py-3">Payment Method</th>
                        <th className="px-4 py-3">Shirt ($25)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onboardingFiltered.map((row) => (
                        <tr key={row.key} className="border-b border-border hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {row.discordAvatar ? (
                                <img src={`https://cdn.discordapp.com/avatars/${row.discordId}/${row.discordAvatar}.png?size=32`}
                                  className="h-8 w-8 rounded-sm" alt="" />
                              ) : (
                                <div className="h-8 w-8 rounded-sm bg-card border border-border flex items-center justify-center text-xs text-muted-foreground">
                                  {row.name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-foreground font-bold flex items-center gap-2">
                                  {row.name}
                                  {!row.onboarded && <span className="badge">Pending</span>}
                                </div>
                                <div className="text-muted-foreground text-xs font-mono">{row.discordUsername ? `@${row.discordUsername}` : row.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className="text-muted-foreground text-sm font-mono">{row.country ? `${countryFlag(row.country)} ${row.country}` : '—'}</span>
                            ) : (
                              <select
                                value={row.country || ''}
                                onChange={e => updateMutation.mutate({ id: row.id, data: { country: e.target.value } })}
                                className="bg-card border border-border rounded px-2 py-2 text-foreground text-sm font-mono max-w-[10rem] outline-none focus:border-primary"
                              >
                                <option value="">— {countryFlag(row.country)}</option>
                                {COUNTRIES.map(c => (
                                  <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className="text-muted-foreground text-sm font-mono">{row.shirtSize || '—'}</span>
                            ) : (
                              <select
                                value={row.shirtSize || ''}
                                onChange={e => updateMutation.mutate({ id: row.id, data: { shirtSize: e.target.value } })}
                                className="bg-card border border-border rounded px-2 py-2 text-foreground text-sm font-mono outline-none focus:border-primary"
                              >
                                <option value="">—</option>
                                {SHIRT_SIZES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className="text-muted-foreground text-sm font-mono">{row.paymentMethod === 'cash' ? 'Cash' : row.paymentMethod === 'crypto' ? 'Crypto' : '—'}</span>
                            ) : (
                              <select
                                value={row.paymentMethod || ''}
                                onChange={e => updateMutation.mutate({ id: row.id, data: { paymentMethod: e.target.value } })}
                                className="bg-card border border-border rounded px-2 py-2 text-foreground text-sm font-mono outline-none focus:border-primary"
                              >
                                <option value="">—</option>
                                <option value="cash">Cash</option>
                                <option value="crypto">Crypto</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.readOnly ? (
                              <span className={`badge ${row.shirtPaid ? 'badge-pos' : 'badge-neg'}`}>
                                {row.shirtPaid ? 'Paid' : 'Not Paid'}
                              </span>
                            ) : (
                              <button
                                onClick={() => updateMutation.mutate({ id: row.id, data: { shirtPaid: !row.shirtPaid } })}
                                className={`badge cursor-pointer hover:opacity-80 transition-opacity ${row.shirtPaid ? 'badge-pos bg-pos/10' : 'badge-neg bg-neg/10'}`}
                              >
                                {row.shirtPaid ? 'Paid' : 'Not Paid'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {tab === 'tools' && (
        <div className="arena-grid cols-2">
          <div className="card flex flex-col items-start gap-4">
            <Database className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <h3 className="h3 mb-2">Clear All Apps</h3>
              <p className="text-muted-foreground text-sm mb-6">Delete every submitted app and all ratings. Use before a new competition round.</p>
              <button
                onClick={() => { if (confirm('Delete ALL apps and ratings? This cannot be undone.')) clearGamesMutation.mutate(); }}
                disabled={clearGamesMutation.isPending}
                className="btn border border-destructive text-destructive bg-destructive/10 hover:bg-destructive hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
                {clearGamesMutation.isPending ? 'Clearing…' : 'Clear All Apps'}
              </button>
            </div>
          </div>

          <div className="card flex flex-col items-start gap-4">
            <Sprout className="h-8 w-8 text-pos" />
            <div className="flex-1">
              <h3 className="h3 mb-2">Populate Seed App</h3>
              <p className="text-muted-foreground text-sm mb-6">Add a sample TrumpChat app to demonstrate the gallery. Good for testing before submissions come in.</p>
              <button
                onClick={() => seedGamesMutation.mutate()}
                disabled={seedGamesMutation.isPending}
                className="btn border border-pos text-pos bg-pos/10 hover:bg-pos hover:text-white"
              >
                <Sprout className="h-4 w-4" />
                {seedGamesMutation.isPending ? 'Seeding…' : 'Add Seed App'}
              </button>
            </div>
          </div>

          <Link to="/admin/team-randomizer" className="card hover:border-primary transition-all group block">
            <Zap className="h-8 w-8 text-primary mb-4" />
            <h3 className="h3 mb-2 group-hover:text-primary transition-colors">Team Randomizer</h3>
            <p className="text-muted-foreground text-sm mb-6">Randomly assign competitors into teams with a live animated reveal. Perfect for projecting during the hackathon.</p>
            <span className="mono-label text-primary">Open →</span>
          </Link>

          <Link to="/admin/wheel-of-destiny" className="card hover:border-primary transition-all group block">
            <div className="h-8 w-8 flex items-center justify-center border-2 border-primary rounded-full mb-4">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
            </div>
            <h3 className="h3 mb-2 group-hover:text-primary transition-colors">Wheel of Destiny</h3>
            <p className="text-muted-foreground text-sm mb-6">Spin the wheel to assign calamities to teams — Founders Dispute, Server Crash, Lawsuit and more.</p>
            <span className="mono-label text-primary">Open →</span>
          </Link>

          <Link to="/admin/qr-codes" className="card hover:border-primary transition-all group block">
            <QrCode className="h-8 w-8 text-primary mb-4" />
            <h3 className="h3 mb-2 group-hover:text-primary transition-colors">QR Codes</h3>
            <p className="text-muted-foreground text-sm mb-6">Download QR codes for competitors and audience members to scan at the event.</p>
            <span className="mono-label text-primary">Open →</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
