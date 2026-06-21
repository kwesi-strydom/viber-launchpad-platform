import { useGames } from '../hooks/useGames';
import { Link } from 'react-router-dom';
import { Star, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { CURRENT_EDITION } from '@shared/schema';

const LeaderboardPage = () => {
  const { user } = useAuth();
  const { games, loading, error, refreshGames } = useGames();

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] arena-wrap">
        <p className="body-l uppercase tracking-wide">Admin access required.</p>
      </div>
    );
  }
  
  // Get top 10 games for the current edition - backend already sorts by the
  // leaderboard formula, so filtering by edition preserves the ranking order.
  const topGames = games
    .filter((game) => (game.edition ?? 4) === CURRENT_EDITION)
    .slice(0, 10);

  const handleRefresh = () => {
    refreshGames();
  };

  // Helper function to render stars based on rating
  const renderRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} size={16} className="text-primary" fill="currentColor" />);
    }
    
    // Half star if needed
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative inline-block" style={{ width: '16px', height: '16px' }}>
          <Star size={16} className="text-ink-500" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star size={16} className="text-primary" fill="currentColor" />
          </div>
        </div>
      );
    }
    
    // Empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={16} className="text-ink-500" />);
    }
    
    return (
      <div className="flex items-center gap-1">
        {stars}
        <span className="ml-2 num text-primary font-bold">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="arena-wrap py-12 min-h-screen">
      <div className="flex justify-between items-center mb-12 border-b border-ink-600 pb-6">
        <h1 className="h1 flex items-center gap-4">
          <Trophy className="text-primary w-10 h-10" />
          Leaderboard
        </h1>
        <button 
          onClick={handleRefresh}
          className="btn btn-ghost"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-20">
          <div className="h3 uppercase text-ink-300 animate-pulse">Loading leaderboard...</div>
        </div>
      ) : error ? (
        <div className="text-center py-20 card max-w-xl mx-auto">
          <div className="h3 uppercase text-neg mb-4">Failed to load leaderboard</div>
          <p className="body-l">{error}</p>
        </div>
      ) : topGames.length === 0 ? (
        <div className="text-center py-20 card max-w-xl mx-auto">
          <div className="h3 uppercase text-primary mb-4">No apps yet!</div>
          <p className="body-l">Be the first to submit an app.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="leaderboard">
            {topGames.map((game, index) => (
              <div 
                key={game.id} 
                className={`lb-row ${index === 0 ? 'lead' : ''}`}
              >
                <div className="lb-pos">
                  {index + 1}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-md overflow-hidden bg-ink-700 border border-ink-600 shrink-0">
                    <img 
                      src={game.thumbnail_url || '/placeholder.svg'} 
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <a 
                      href={game.game_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`lb-name text-lg transition-colors hover:text-primary ${index === 0 ? 'text-ink-900' : 'text-ink-100'}`}
                    >
                      {game.title}
                    </a>
                    <div className="text-sm font-ui mt-0.5 line-clamp-1 max-w-md" style={{ color: index === 0 ? 'var(--ink-800)' : 'var(--ink-300)' }}>
                      {game.description}
                    </div>
                    {game.creator && (
                      <div className={`mono-label mt-1.5 ${index === 0 ? '!text-ink-800' : ''}`}>
                        Team {game.creator}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  {renderRatingStars(game.avg_rating || 0)}
                  <div className={`text-xs mt-1.5 num ${index === 0 ? 'text-ink-800' : 'text-ink-300'}`}>
                    {game.rating_count || 0} VOTES
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Link to="/games" className="btn btn-solid">
              View All Apps
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
