import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useGames } from '../hooks/useGames';
import GameCard from '../components/games/GameCard';
import { useToast } from '@/hooks/use-toast';
import { User, Plus } from 'lucide-react';

const CompetitorsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { games, loading, error } = useGames();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEditGame = (game: any) => {
    navigate('/my-team');
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access your competitor dashboard",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      if (user?.userType !== 'competitor') {
        toast({
          title: "Access Restricted",
          description: "This is the competitor dashboard. Spectators have their own portal.",
          variant: "destructive",
        });
        navigate('/spectators');
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, navigate, toast]);

  const userSubmittedGames = games.filter(game => {
    const teamName = user?.teamName;
    const userName = user?.name;
    
    return game.creator === teamName || 
           game.creator === userName ||
           game.creator === `Team ${teamName}` ||
           game.creator === `Team ${userName}`;
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="arena-wrap py-16 text-center">
        <div className="kicker animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="arena-wrap py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User size={24} />
          </div>
          <div>
            <h1 className="h2">
              {user?.teamName ? `${user.teamName}'s Dashboard` : `${user?.name}'s Dashboard`}
            </h1>
            <p className="kicker mt-1">
              {user?.teamName ? `Team: ${user.teamName}` : 'Competitor Portal'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div>
          <h2 className="h3">Your Submitted Apps</h2>
          <p className="text-muted-foreground mt-1">
            Apps you've submitted to the championship are shown below.
          </p>
        </div>
        
        <Link to="/my-team" className="btn btn-primary mt-4 md:mt-0">
          <Plus size={16} />
          Submit App
        </Link>
      </div>
      
      {loading ? (
        <div className="text-center py-20">
          <div className="kicker animate-pulse text-primary">Loading apps...</div>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="kicker text-destructive mb-4">Failed to load apps</div>
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : userSubmittedGames.length === 0 ? (
        <div className="card text-center py-20">
          <div className="h3 mb-2">No apps submitted yet</div>
          <p className="text-muted-foreground">Ready to showcase your 60-minute creation?</p>
        </div>
      ) : (
        <div className="arena-grid cols-4">
          {userSubmittedGames
            .sort((a, b) => a.title.localeCompare(b.title))
            .map(game => (
              <GameCard 
                key={game.id} 
                game={game}
                onRate={() => {}}
                isRating={false}
                showEditButton={true}
                onEdit={handleEditGame}
              />
            ))
          }
        </div>
      )}
    </div>
  );
};

export default CompetitorsPage;
