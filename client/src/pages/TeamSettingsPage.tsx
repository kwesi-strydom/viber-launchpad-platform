import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Settings, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TeamData {
  slug: string;
  teamName: string;
  nameChanged: boolean;
  members: Array<{ id: number; name: string; userType: string }>;
}

interface CurrentUser {
  user: {
    id: number;
    name: string;
    teamName?: string;
    isAdmin?: boolean;
    userType: string;
  } | null;
}

function teamNameToSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/^team\s+/i, '').replace(/\s+/g, '-');
}

const TeamSettingsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: team, isLoading: teamLoading } = useQuery<TeamData>({
    queryKey: ['/api/teams', slug],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${slug}`);
      if (!res.ok) throw new Error('Team not found');
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: authData } = useQuery<CurrentUser>({
    queryKey: ['/api/auth/user'],
  });

  const currentUser = authData?.user;
  const isAdmin = currentUser?.isAdmin === true;
  const isMember = currentUser?.teamName
    ? teamNameToSlug(currentUser.teamName) === slug
    : false;

  const renameMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/teams/${slug}/rename`, {
        method: 'PATCH',
        body: JSON.stringify({ newName }),
      }),
    onSuccess: async (data: any) => {
      const newSlug = data.slug;
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'Team renamed successfully!' });
      navigate(`/team/${newSlug}`, { replace: true });
    },
    onError: (err: any) => {
      const msg = err?.message || 'Failed to rename team';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  if (teamLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="h2 text-muted-foreground mb-2">Team not found</h2>
      </div>
    );
  }

  if (!isMember && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Lock size={48} className="text-muted-foreground mb-4" />
        <h2 className="h2 text-muted-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground small">Only team members can view this page.</p>
        <Link to={`/team/${slug}`} className="mt-6 btn btn-ghost">
          <ArrowLeft size={16} /> Back to team
        </Link>
      </div>
    );
  }

  const isLocked = team.nameChanged && !isAdmin;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setShowConfirm(true);
  };

  return (
    <div className="arena-wrap py-12">
      <div className="max-w-lg mx-auto">
        <Link
          to={`/team/${slug}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-sm mb-6 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          Back to team
        </Link>

        <div className="card">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Settings size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="h2 text-foreground">Team Settings</h1>
              <p className="kicker mt-1">{team.teamName}</p>
            </div>
          </div>

          <div>
            <h2 className="h3 mb-4">Rename Team</h2>
            {isLocked ? (
              <div className="panel p-4 flex items-start gap-3">
                <Lock size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Name change locked</p>
                  <p className="text-muted-foreground small mt-1">
                    Your team has already used its one-time rename. The team name cannot be changed again.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground small mb-6">
                  {isAdmin
                    ? 'As an admin, you can rename this team at any time.'
                    : 'Your team can change its name once. This action is final and cannot be undone.'}
                </p>
                <form onSubmit={handleSubmit} className="arena-stack">
                  <div className="field">
                    <label>New team name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder={team.teamName}
                      maxLength={50}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newName.trim() || newName.trim() === team.teamName || renameMutation.isPending}
                    className="btn btn-primary w-full mt-2"
                  >
                    {renameMutation.isPending ? 'Renaming…' : 'Rename Team'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-card border border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="display text-2xl text-primary">
              ARE YOU SURE?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              {isAdmin
                ? `This will rename the team to "${newName.trim()}". The URL will update and all team members will see the new name.`
                : `This is final — your team can only change its name once. The team will be renamed to "${newName.trim()}" and you cannot change it again. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="btn btn-ghost mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => renameMutation.mutate()}
              className="btn btn-primary"
            >
              Confirm Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamSettingsPage;
