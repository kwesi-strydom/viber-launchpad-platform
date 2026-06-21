import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { teamNameToSlug } from '@/lib/teamUtils';

interface SafeUser {
  id: number;
  name: string;
  discordUsername?: string;
  discordAvatar?: string;
  teamName?: string;
  userType: string;
}

const MyTeamPage = () => {
  const navigate = useNavigate();

  const { data: user, isLoading, error } = useQuery<SafeUser>({
    queryKey: ['/api/my-team'],
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (user?.teamName) {
      navigate(`/team/${teamNameToSlug(user.teamName)}`, { replace: true });
    }
  }, [user?.teamName, navigate]);

  if (error) {
    navigate('/login?role=competitor', { replace: true });
    return null;
  }

  return (
    <div className="arena-wrap flex flex-col items-center justify-center min-h-[70vh] text-center">
      <div className="card max-w-md w-full p-10 relative">
        <div className="absolute top-4 right-4">
          <span className="badge badge-live">Live</span>
        </div>

        <div className="flex justify-center mb-8 mt-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Users size={28} />
          </div>
        </div>

        <h1 className="h2 mb-4">
          Waiting for Team Assignment
        </h1>

        {isLoading ? (
          <p className="text-muted-foreground mb-6">Loading your profile…</p>
        ) : (
          <>
            <p className="text-foreground font-bold mb-2">
              Hey, {user?.name || user?.discordUsername}!
            </p>
            <p className="text-muted-foreground mb-8">
              You haven't been assigned to a team yet. This page will automatically redirect you as soon as the admin assigns your team — no need to refresh.
            </p>
          </>
        )}

        <div className="mono-label text-primary flex items-center justify-center gap-2 mb-2">
          Checking assignment...
        </div>
        <p className="text-muted-foreground text-xs">Updates every 3 seconds</p>
      </div>
    </div>
  );
};

export default MyTeamPage;
