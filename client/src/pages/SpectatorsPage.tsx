import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useGames } from '../hooks/useGames';
import GameCard from '../components/games/GameCard';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const SpectatorsPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { games, loading, error, rateGame, ratingInProgress, refreshGames } = useGames();
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access your spectator dashboard",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate, toast]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && user.userType !== 'spectator') {
      toast({
        title: "Access Restricted",
        description: "This is the spectator dashboard. Competitors have their own portal.",
        variant: "destructive",
      });
      navigate('/competitors');
    }
  }, [isLoading, isAuthenticated, user, navigate, toast]);

  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    let storedSessionId = localStorage.getItem('viber_session_id');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('viber_session_id', storedSessionId);
    }
    setSessionId(storedSessionId);
  }, []);

  const { data: userRatingsData = [] } = useQuery({
    queryKey: ['/api/user/ratings'],
    queryFn: async () => {
      const response = await fetch('/api/user/ratings', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (sessionId) {
          const fallbackResponse = await fetch(`/api/ratings/${sessionId}`);
          if (fallbackResponse.ok) {
            return fallbackResponse.json();
          }
        }
        throw new Error('Failed to fetch ratings');
      }
      return response.json();
    },
    enabled: !!user
  });

  useEffect(() => {
    const ratingsMap: Record<string, number> = {};
    userRatingsData.forEach((rating: any) => {
      ratingsMap[rating.game_id] = rating.rating;
    });
    setUserRatings(ratingsMap);
  }, [userRatingsData]);

  const handleRateGame = async (gameId: string, rating: number) => {
    try {
      setUserRatings(prev => ({ ...prev, [gameId]: rating }));
      await rateGame(gameId, rating);
      await refreshGames();
      setUserRatings(prev => ({ ...prev, [gameId]: rating }));
      
      toast({
        title: "Rating Updated!",
        description: `You rated this app ${rating} stars`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update rating. Please try again.",
        variant: "destructive",
      });
    }
  };

  const gamesWithUserRatings = games.map(game => ({
    ...game,
    avg_rating: userRatings[game.id] || 0,
    rating_count: userRatings[game.id] ? 1 : 0
  }));

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
            <h1 className="h2">{user?.name}'s Dashboard</h1>
            <p className="kicker mt-1">Spectator Portal</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="h3 mb-2">Your Rated Apps</h2>
        <p className="text-muted-foreground">
          Apps you've rated are shown below with your personal ratings. 
          The ratings shown here are your individual ratings, not the average.
        </p>
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
      ) : gamesWithUserRatings.filter(game => userRatings[game.id]).length === 0 ? (
        <div className="card text-center py-20">
          <div className="h3 mb-4">No rated apps yet</div>
          <p className="text-muted-foreground mb-6">Start rating apps to see them appear in your dashboard!</p>
          <Link to="/games" className="btn btn-primary">
            Rate Some Apps
          </Link>
        </div>
      ) : (
        <div className="arena-grid cols-4 mb-12">
          {gamesWithUserRatings
            .filter(game => userRatings[game.id])
            .map(game => (
              <GameCard 
                key={game.id} 
                game={game}
                onRate={handleRateGame}
                isRating={ratingInProgress?.[game.id] || false}
                userRating={userRatings[game.id]}
                showUserRating={true}
              />
            ))
          }
        </div>
      )}
      
      <div className="text-center pt-8 border-t border-border">
        <h3 className="h3 mb-6">Want to rate more apps?</h3>
        <Link to="/games" className="btn btn-solid">
          Explore Apps
        </Link>
      </div>
    </div>
  );
};

export default SpectatorsPage;
