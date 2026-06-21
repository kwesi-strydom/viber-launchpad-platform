import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GameCard from '../components/games/GameCard';
import { useGames } from '../hooks/useGames';
import AudienceQrWidget from '@/components/AudienceQrWidget';
import { useAuth } from '@/components/AuthProvider';
import { Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CURRENT_EDITION } from '@shared/schema';

const GamesPage = () => {
  const { games, loading, error, rateGame, ratingInProgress, refreshGames } = useGames();
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEdition, setSelectedEdition] = useState<number>(CURRENT_EDITION);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRateGame = async (gameId: string, rating: number) => {
    if (!isAuthenticated) {
      localStorage.setItem('redirectAfterLogin', '/games');
      toast({
        title: "Login Required",
        description: "Please sign up first, then log in to rate apps",
        variant: "destructive",
      });
      navigate('/signup');
      return;
    }
    
    // Check if user is a spectator (only spectators can rate apps)
    if (isAuthenticated && user?.userType === 'competitor') {
      toast({
        title: "Access Restricted",
        description: "Only spectators can rate apps. Competitors cannot vote on submissions.",
        variant: "destructive",
      });
      return;
    }
    
    await rateGame(gameId, rating);
  };
  
  const filteredGames = games.filter(game => 
    (game.edition ?? 4) === selectedEdition &&
    (game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const editions = [
    { value: CURRENT_EDITION, label: `Viber ${CURRENT_EDITION}` },
    { value: 4, label: 'Viber 4' },
  ];

  const handleRefresh = () => {
    refreshGames();
  };

  return (
    <div className="arena-wrap py-12 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-ink-600 pb-6">
        <div>
          <h1 className="h1">Apps Gallery</h1>
          <div className="flex items-center gap-2 mt-4">
            {editions.map(ed => (
              <button
                key={ed.value}
                onClick={() => setSelectedEdition(ed.value)}
                className={selectedEdition === ed.value ? 'btn btn-solid' : 'btn btn-ghost'}
              >
                {ed.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72 field mb-0">
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-400" size={18} />
          </div>
          <button 
            onClick={handleRefresh}
            className="btn btn-ghost"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-20">
          <div className="h3 uppercase text-ink-300 animate-pulse">Loading apps...</div>
        </div>
      ) : error ? (
        <div className="text-center py-20 card max-w-xl mx-auto">
          <div className="h3 uppercase text-neg mb-4">Failed to load apps</div>
          <p className="body-l">{error}</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-20 card max-w-xl mx-auto">
          <div className="h3 uppercase text-primary mb-4">No apps found</div>
          {searchQuery ? (
            <p className="body-l">Try a different search query.</p>
          ) : (
            <p className="body-l">Be the first to submit an app!</p>
          )}
        </div>
      ) : (
        <div className="arena-grid cols-3 xl:grid-cols-4">
          {filteredGames
            .sort((a, b) => a.title.localeCompare(b.title))
            .map(game => (
              <GameCard 
                key={game.id} 
                game={game}
                onRate={handleRateGame}
                isRating={ratingInProgress?.[game.id] || false}
              />
            ))}
        </div>
      )}
      <AudienceQrWidget />
    </div>
  );
};

export default GamesPage;
