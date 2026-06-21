
export interface Game {
  id: string;
  created_at: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  game_url: string;
  avg_rating: number;
  rating_count: number;
  creator?: string | null;
  edition?: number | null;
}

export type GameFormData = Omit<Game, "id" | "created_at" | "avg_rating" | "rating_count">;
