import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TeamGame {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  game_url?: string;
  creator?: string;
}

const TeamEditGamePage = () => {
  const { slug, gameId } = useParams<{ slug: string; gameId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teamGames, isLoading } = useQuery<TeamGame[]>({
    queryKey: ['/api/teams', slug, 'games'],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${slug}/games`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!slug,
  });

  const game = teamGames?.find(g => g.id === gameId);

  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    game_url: '',
    creator: '',
  });

  useEffect(() => {
    if (game) {
      setForm({
        title: game.title || '',
        description: game.description || '',
        thumbnail_url: game.thumbnail_url || '',
        game_url: game.game_url || '',
        creator: game.creator || '',
      });
    }
  }, [game]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(`/api/games/${gameId}`, { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast({ title: 'App updated!', description: 'Your changes have been saved.' });
      queryClient.invalidateQueries({ queryKey: ['/api/teams', slug, 'games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      navigate(`/team/${slug}`);
    },
    onError: () => {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    },
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: 'Missing title', description: 'Please enter a title for your app.', variant: 'destructive' });
      return;
    }
    if (!form.game_url.trim()) {
      toast({ title: 'Missing app URL', description: 'Please enter the URL to your app.', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!game && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-muted-foreground text-lg mb-4">App not found.</p>
        <button onClick={() => navigate(`/team/${slug}`)} className="btn btn-ghost">
          <ArrowLeft size={16} /> Back to team
        </button>
      </div>
    );
  }

  return (
    <div className="arena-wrap py-12">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/team/${slug}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-bold text-sm"
        >
          <ArrowLeft size={16} />
          BACK TO TEAM
        </button>

        <div className="card">
          <h1 className="h2 mb-8">Edit App</h1>

          <form onSubmit={handleSubmit} className="arena-stack">
            <div className="field">
              <label>App Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="What's your app called?"
                required
              />
            </div>

            <div className="field">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Briefly describe what your app does"
                rows={4}
              />
            </div>

            <div className="field">
              <label>App URL *</label>
              <input
                type="url"
                name="game_url"
                value={form.game_url}
                onChange={handleChange}
                placeholder="https://your-app.replit.app"
                required
              />
            </div>

            <div className="field">
              <label>Thumbnail URL</label>
              <input
                type="url"
                name="thumbnail_url"
                value={form.thumbnail_url}
                onChange={handleChange}
                placeholder="https://example.com/screenshot.png"
              />
            </div>

            {form.thumbnail_url && (
              <div className="mt-2">
                <p className="mono-label mb-2">Thumbnail preview</p>
                <img
                  src={form.thumbnail_url}
                  alt="Thumbnail preview"
                  className="w-40 h-28 object-cover rounded-md border border-border"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}

            <div className="flex gap-3 pt-6 mt-2 border-t border-border">
              <button
                type="button"
                onClick={() => navigate(`/team/${slug}`)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {saveMutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamEditGamePage;
