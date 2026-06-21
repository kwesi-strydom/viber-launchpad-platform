import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Game } from '../types';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useGames() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ratingInProgress, setRatingInProgress] = useState<Record<string, boolean>>({});
  
  // Fetch games query
  const {
    data: games = [],
    isLoading: loading,
    error,
    refetch: refreshGames
  } = useQuery({
    queryKey: ['/api/games'],
    select: (data: Array<Game & { avg_rating: number; rating_count: number }>) => data || []
  });
  
  // Submit game mutation
  const submitGameMutation = useMutation({
    mutationFn: async (gameData: Omit<Game, "id" | "created_at" | "avg_rating" | "rating_count">) => {
      return apiRequest('/api/games', {
        method: 'POST',
        body: JSON.stringify(gameData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      toast({
        title: "Game submitted!",
        description: "Your game has been added to the collection.",
      });
    },
    onError: (error: any) => {
      console.error('Error submitting game:', error);
      toast({
        title: "Error submitting game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rate game mutation with enhanced mobile debugging
  const rateGameMutation = useMutation({
    mutationFn: async ({ gameId, rating, sessionId }: { gameId: string; rating: number; sessionId: string }) => {
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      
      console.log('Rating mutation started:', { gameId, rating, sessionId, isMobile });
      console.log('User agent:', navigator.userAgent);
      
      try {
        const response = await fetch(`/api/games/${gameId}/rate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important for mobile
          body: JSON.stringify({ rating, sessionId }),
        });
        
        console.log('Rating response status:', response.status);
        console.log('Rating response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Rating failed with error:', errorData);
          
          // Create a structured error that prevents unhandled rejections
          const ratingError = new Error(errorData.error || `HTTP ${response.status} error`);
          (ratingError as any).isRatingError = true;
          (ratingError as any).status = response.status;
          throw ratingError;
        }
        
        const data = await response.json();
        console.log('Rating successful:', data);
        
        if (isMobile && data.debug) {
          console.log('Mobile rating debug info:', data.debug);
        }
        
        return data;
      } catch (error) {
        console.error('Rating request failed:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch all related queries immediately
      queryClient.invalidateQueries({ queryKey: ['/api/games'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      
      // Force immediate refetch to ensure UI updates
      queryClient.refetchQueries({ queryKey: ['/api/games'] });
      queryClient.refetchQueries({ queryKey: ['/api/ratings'] });
      
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      console.log('Rating mutation success, mobile:', isMobile);
      console.log('Cache invalidated and refetched');
      
      toast({
        title: "Rating registered!",
        description: "Thanks for rating this game!",
      });
    },
    onError: (error: any) => {
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      console.error('Rating mutation error:', error);
      console.error('Mobile device:', isMobile);
      
      let errorMessage = error.message || "Failed to register rating";
      
      // Handle specific rating errors more gracefully
      if (error.message?.includes('already rated') || error.message?.includes('recently')) {
        errorMessage = "Rating updated! Your latest rating has been registered.";
      } else if (isMobile) {
        errorMessage += " (Mobile: Try refreshing the page or using a different browser)";
      }
      
      toast({
        title: "Rating not registered",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Generate or get session ID for rating
  const getSessionId = () => {
    let sessionId = localStorage.getItem('viber_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('viber_session_id', sessionId);
    }
    return sessionId;
  };

  // Rating function with proper error handling
  const rateGame = async (gameId: string, rating: number) => {
    const sessionId = getSessionId();
    setRatingInProgress(prev => ({ ...prev, [gameId]: true }));
    try {
      await rateGameMutation.mutateAsync({ gameId, rating, sessionId });
    } catch (error) {
      console.log('Rating error handled by mutation error callback');
    } finally {
      setRatingInProgress(prev => { const next = { ...prev }; delete next[gameId]; return next; });
    }
  };

  // Submit game function
  const submitGame = async (gameData: Omit<Game, "id" | "created_at" | "avg_rating" | "rating_count">) => {
    await submitGameMutation.mutateAsync(gameData);
  };

  return {
    games,
    loading,
    error: error?.message || null,
    rateGame,
    ratingInProgress,
    userRatings: {},
    submitGame,
    refreshGames: () => refreshGames()
  };
}
