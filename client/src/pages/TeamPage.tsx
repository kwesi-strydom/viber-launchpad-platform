import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Trophy,
  Settings,
  Upload,
  ExternalLink,
  Gamepad2,
  Loader2,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: number;
  name: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  userType: string;
}

interface TeamData {
  slug: string;
  teamName: string;
  nameChanged: boolean;
  members: TeamMember[];
}

interface TeamGame {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  game_url?: string;
  creator?: string;
  avg_rating: number;
  rating_count: number;
}

interface CurrentUser {
  user: {
    id: number;
    name: string;
    teamName?: string;
    isAdmin?: boolean;
  } | null;
}

function teamNameToSlug(teamName: string): string {
  return teamName
    .toLowerCase()
    .replace(/^team\s+/i, "")
    .replace(/\s+/g, "-");
}

const TeamPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', thumbnail_url: '', game_url: '' });

  const { data: authData } = useQuery<CurrentUser>({
    queryKey: ["/api/auth/user"],
  });
  const currentUser = authData?.user;
  const isAdmin = currentUser?.isAdmin === true;
  const isTeamMember = currentUser?.teamName
    ? teamNameToSlug(currentUser.teamName) === slug
    : false;
  // Admins can manage any team's submissions for testing/support.
  const isMember = isTeamMember || isAdmin;
  const showSettings = isMember;

  const submitMutation = useMutation({
    mutationFn: () => apiRequest('/api/games', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        thumbnail_url: form.thumbnail_url || undefined,
        game_url: form.game_url,
        creator: team?.teamName || currentUser?.teamName || slug,
      }),
    }),
    onSuccess: () => {
      toast({ title: 'App submitted!', description: 'Your app is now live in the gallery.' });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', slug, 'games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      setForm({ title: '', description: '', thumbnail_url: '', game_url: '' });
      setShowForm(false);
    },
    onError: (err: any) => {
      toast({ title: 'Submission failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const {
    data: team,
    isLoading,
    error,
  } = useQuery<TeamData>({
    queryKey: ["/api/teams", slug],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${slug}`);
      if (!res.ok) throw new Error("Team not found");
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !!slug,
  });

  const { data: teamGames = [] } = useQuery<TeamGame[]>({
    queryKey: ["/api/teams", slug, "games"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${slug}/games`);
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 10000,
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Users size={48} className="text-muted-foreground mb-4" />
        <h2 className="h2 text-muted-foreground mb-2">
          Team not found
        </h2>
        <p className="text-muted-foreground small">
          This team doesn't exist or hasn't been assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="arena-wrap py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Trophy size={28} className="text-primary" />
              </div>
              <div>
                <p className="kicker mb-1">Your Team</p>
                <h1 className="h1">{team.teamName}</h1>
              </div>
            </div>
            {showSettings && (
              <Link to={`/team/${slug}/settings`} className="btn btn-ghost btn-sm" title="Team Settings">
                <Settings size={16} />
                <span className="hidden sm:inline">Team Settings</span>
              </Link>
            )}
          </div>

          <div className="arena-stack">
            {team.members.map((member) => (
              <div key={member.id} className="panel p-3 flex items-center gap-4">
                {member.discordAvatar && member.discordId ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${member.discordId}/${member.discordAvatar}.png?size=64`}
                    alt={member.name}
                    className="w-10 h-10 rounded-md object-cover border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-bold leading-none text-foreground">{member.name}</p>
                  {member.discordUsername && (
                    <p className="text-muted-foreground small mt-1">@{member.discordUsername}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isMember && (
            <div className="mt-6 pt-6 border-t border-border">
              {!showForm ? (
                <button onClick={() => setShowForm(true)} className="btn btn-primary w-full">
                  <Upload size={18} />
                  Submit Your App
                </button>
              ) : (
                <div className="arena-stack">
                  <div className="flex items-center justify-between mb-2">
                    <p className="h3">Submit App</p>
                    <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="field">
                    <label>App Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="What's your app called?"
                    />
                  </div>
                  <div className="field">
                    <label>Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Briefly describe what your app does"
                      rows={3}
                    />
                  </div>
                  <div className="field">
                    <label>App URL *</label>
                    <input
                      type="url"
                      value={form.game_url}
                      onChange={e => setForm(f => ({ ...f, game_url: e.target.value }))}
                      placeholder="https://your-app.replit.app"
                    />
                  </div>
                  <div className="field">
                    <label>Thumbnail URL</label>
                    <input
                      type="url"
                      value={form.thumbnail_url}
                      onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                      placeholder="https://example.com/screenshot.png"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost flex-1">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!form.title.trim() || !form.game_url.trim() || submitMutation.isPending}
                      onClick={() => submitMutation.mutate()}
                      className="btn btn-primary flex-1"
                    >
                      {submitMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Upload size={16} /> Submit App</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {teamGames.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Gamepad2 size={24} className="text-primary" />
              <h2 className="h2">
                Submitted App{teamGames.length !== 1 ? "s" : ""}
              </h2>
              <span className="badge badge-fill">{teamGames.length}</span>
            </div>

            <div className="arena-stack">
              {teamGames.map((game) => (
                <div key={game.id} className="card p-4 flex flex-col sm:flex-row gap-4">
                  {game.thumbnail_url ? (
                    <img
                      src={game.thumbnail_url}
                      alt={game.title}
                      className="w-full sm:w-32 h-32 rounded-md object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-full sm:w-32 h-32 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                      <Gamepad2 size={32} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="h3 truncate">{game.title}</h3>
                    {game.description && (
                      <p className="text-muted-foreground small mt-2 line-clamp-2">
                        {game.description}
                      </p>
                    )}
                    <div className="mt-auto pt-4 flex items-center gap-3">
                      {game.game_url && (
                        <a href={game.game_url} target="_blank" rel="noopener noreferrer" className="btn btn-solid btn-sm">
                          <ExternalLink size={14} /> Open App
                        </a>
                      )}
                      {isMember && (
                        <button onClick={() => navigate(`/team/${slug}/edit/${game.id}`)} className="btn btn-ghost btn-sm">
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isMember && teamGames.length === 0 && (
          <div className="panel p-8 text-center border-dashed">
            <Gamepad2 size={32} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-foreground font-bold">No apps submitted yet.</p>
            <p className="text-muted-foreground small mt-1">Hit the button above to submit your first app!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
