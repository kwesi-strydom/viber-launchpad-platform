import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, StarHalf } from 'lucide-react';
import { Game } from '@/types';

function teamNameToSlug(name: string): string {
  return name.toLowerCase().replace(/^team\s+/i, '').replace(/\s+/g, '-');
}

interface GameCardProps {
  game: Game;
  onRate: (id: string, rating: number) => void;
  isRating?: boolean;
  userRating?: number; // Individual user's rating for this game
  showUserRating?: boolean; // Whether to show user's rating instead of average
  showEditButton?: boolean; // Whether to show edit button for competitors
  onEdit?: (game: Game) => void; // Callback for edit action
}

const GameCard = ({ game, onRate, isRating = false, userRating, showUserRating = false, showEditButton = false, onEdit }: GameCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  
  const handlePlayNow = () => {
    window.open(game.game_url, '_blank');
  };
  
  const handleRating = (rating: number) => {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    console.log(`Rating clicked: ${rating} stars for game ${game.id} (Mobile: ${isMobile})`);
    onRate(game.id, rating);
  };

  // Generate stars for display
  const renderStars = () => {
    const stars = [];
    // Show user's individual rating if available and requested, otherwise show average
    const baseRating = showUserRating && userRating ? userRating : (game.avg_rating || 0);
    const displayRating = hoverRating !== null ? hoverRating : baseRating;
    
    for (let i = 1; i <= 5; i++) {
      const difference = displayRating - i + 1;
      
      if (difference >= 1) {
        // Full star
        stars.push(
          <Star 
            key={i} 
            className="text-primary cursor-pointer touch-manipulation" 
            fill="currentColor"
            onClick={() => handleRating(i)}
            onMouseEnter={() => setHoverRating(i)}
            onTouchStart={() => setHoverRating(i)}
            style={{ minHeight: '24px', minWidth: '24px' }}
          />
        );
      } else if (difference > 0 && difference < 1) {
        // Half star
        stars.push(
          <StarHalf 
            key={i} 
            className="text-primary cursor-pointer touch-manipulation" 
            fill="currentColor" 
            onClick={() => handleRating(i - 0.5)}
            onMouseEnter={() => setHoverRating(i - 0.5)}
            onTouchStart={() => setHoverRating(i - 0.5)}
            style={{ minHeight: '24px', minWidth: '24px' }}
          />
        );
      } else {
        // Empty star
        stars.push(
          <Star 
            key={i} 
            className="text-ink-500 hover:text-primary cursor-pointer touch-manipulation"
            onClick={() => handleRating(i)}
            onMouseEnter={() => setHoverRating(i)}
            onTouchStart={() => setHoverRating(i)}
            style={{ minHeight: '24px', minWidth: '24px' }}
          />
        );
      }
    }
    
    return stars;
  };

  return (
    <div 
      className="card p-0 flex flex-col h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoverRating(null);
      }}
    >
      <div className="relative overflow-hidden rounded-t-[9px]">
        <img 
          src={game.thumbnail_url || '/placeholder.svg'} 
          alt={game.title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-ink-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xs transition-all duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {showEditButton && onEdit ? (
              <div className="flex flex-col gap-3">
                <button 
                  className="btn btn-primary w-full"
                  onClick={handlePlayNow}
                >
                  Play Now
                </button>
                <button 
                  className="btn btn-solid w-full"
                  onClick={() => onEdit(game)}
                >
                  Edit App
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-primary w-full"
                onClick={handlePlayNow}
              >
                Play Now
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-5 flex-grow flex flex-col">
        <div className="mb-3">
          <h3 className="h3 mb-1 line-clamp-1">{game.title}</h3>
          
          {game.creator && (
            <Link
              to={`/team/${teamNameToSlug(game.creator)}`}
              className="text-xs font-mono text-ink-300 uppercase tracking-wider hover:text-primary transition-colors"
            >
              TEAM {game.creator}
            </Link>
          )}
        </div>
        
        <p className="text-sm text-ink-200 leading-relaxed line-clamp-2 mb-6 flex-grow">
          {game.description}
        </p>
        
        <div className="flex items-center justify-between pt-4 border-t border-ink-600 mt-auto">
          <div 
            className={`flex items-center gap-1 ${isRating ? 'opacity-50 pointer-events-none' : ''}`}
            onMouseLeave={() => setHoverRating(null)}
          >
            {renderStars()}
          </div>
          
          <div className="flex flex-col items-end">
            {showUserRating && userRating ? (
              <>
                <span className="num text-xl font-bold leading-none">{userRating.toFixed(1)}</span>
                <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mt-1">Your Rating</span>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="num text-xl font-bold leading-none text-primary">{game.avg_rating ? game.avg_rating.toFixed(1) : '0.0'}</span>
                </div>
                <span className="text-[10px] font-mono text-ink-400 uppercase tracking-widest mt-1">Rating</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;