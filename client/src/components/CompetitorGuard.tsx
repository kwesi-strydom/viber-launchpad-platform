import { Navigate, useLocation, matchPath } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { teamNameToSlug } from '@/lib/teamUtils';

interface CompetitorGuardProps {
  children: React.ReactNode;
}

interface MyTeamUser {
  teamName?: string;
  userType: string;
  onboarded?: boolean;
}

// Routes everyone (including not-yet-onboarded competitors) may always view.
const PUBLIC_PATHS = ['/dashboard', '/roster', '/winners'];

const CompetitorGuard = ({ children }: CompetitorGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();

  if (PUBLIC_PATHS.includes(location.pathname)) {
    return <>{children}</>;
  }

  const isCompetitor = !!user && user.userType === 'competitor' && !user.isAdmin;

  const { data: myTeamUser, isLoading: teamLoading } = useQuery<MyTeamUser>({
    queryKey: ['/api/my-team'],
    refetchInterval: 3000,
    enabled: isCompetitor,
  });

  if (authLoading || (isCompetitor && teamLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <span className="kicker">Checking clearance</span>
      </div>
    );
  }

  if (isCompetitor) {
    const path = location.pathname;

    // Competitors must complete onboarding before anything else
    if (!myTeamUser?.onboarded) {
      if (path === '/onboarding') return <>{children}</>;
      return <Navigate to="/onboarding" replace />;
    }

    // Already onboarded — don't let them sit on the onboarding page
    if (path === '/onboarding') {
      return <Navigate to="/my-team" replace />;
    }

    if (path === '/my-team') {
      return <>{children}</>;
    }

    if (myTeamUser?.teamName) {
      const ownSlug = teamNameToSlug(myTeamUser.teamName);
      const isOwnTeamPage =
        !!matchPath('/team/:slug', path) && path === `/team/${ownSlug}`;
      const isOwnTeamSettings =
        !!matchPath('/team/:slug/settings', path) &&
        path === `/team/${ownSlug}/settings`;

      const isOwnTeamEdit =
        !!matchPath('/team/:slug/edit/:gameId', path) &&
        path.startsWith(`/team/${ownSlug}/edit/`);

      if (isOwnTeamPage || isOwnTeamSettings || isOwnTeamEdit) {
        return <>{children}</>;
      }
    }

    return <Navigate to="/my-team" replace />;
  }

  return <>{children}</>;
};

export default CompetitorGuard;