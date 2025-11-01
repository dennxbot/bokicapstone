import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

interface FavoriteItem {
  id: string;
  user_id: string;
  food_item_id: string;
  created_at: string;
  food_items: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id: string | null;
    is_available: boolean;
    is_featured: boolean;
    preparation_time: number;
    category?: {
      name: string;
    };
  };
}

interface UseFavoritesReturn {
  favorites: FavoriteItem[];
  favoriteFoodItemIds: string[];
  isLoading: boolean;
  error: string | null;
  favoritesCount: number;
  isFavorite: (foodItemId: string) => boolean;
  addToFavorites: (foodItemId: string) => Promise<boolean>;
  removeFromFavorites: (foodItemId: string) => Promise<boolean>;
  toggleFavorite: (foodItemId: string) => Promise<boolean>;
  fetchFavorites: () => Promise<void>;
  clearError: () => void;
}

export const useFavorites = (): UseFavoritesReturn => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state for easier access
  const favoriteFoodItemIds = favorites.map(fav => fav.food_item_id);
  const favoritesCount = favorites.length;

  // Check if a food item is favorited
  const isFavorite = useCallback((foodItemId: string): boolean => {
    return favoriteFoodItemIds.includes(foodItemId);
  }, [favoriteFoodItemIds]);

  // Fetch user's favorites from database
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Set user context for RLS
      await supabase.rpc('set_user_context', {
        user_id: user.id,
        user_role: user.role || 'customer'
      });

      const { data, error: fetchError } = await supabase
        .from('user_favorites')
        .select(`
          *,
          food_items (
            *,
            category:categories(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setFavorites(data || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch favorites');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add item to favorites
  const addToFavorites = useCallback(async (foodItemId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to add favorites');
      return false;
    }

    if (isFavorite(foodItemId)) {
      return true; // Already favorited
    }

    try {
      // Set user context for RLS
      await supabase.rpc('set_user_context', {
        user_id: user.id,
        user_role: user.role || 'customer'
      });

      const { error: insertError } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          food_item_id: foodItemId
        });

      if (insertError) throw insertError;

      // Refresh favorites list
      await fetchFavorites();
      toast.success('Added to favorites');
      return true;
    } catch (err) {
      console.error('Error adding to favorites:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to favorites';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [user, isFavorite, fetchFavorites]);

  // Remove item from favorites
  const removeFromFavorites = useCallback(async (foodItemId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to manage favorites');
      return false;
    }

    if (!isFavorite(foodItemId)) {
      return true; // Already not favorited
    }

    try {
      // Set user context for RLS
      await supabase.rpc('set_user_context', {
        user_id: user.id,
        user_role: user.role || 'customer'
      });

      const { error: deleteError } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('food_item_id', foodItemId);

      if (deleteError) throw deleteError;

      // Refresh favorites list
      await fetchFavorites();
      toast.success('Removed from favorites');
      return true;
    } catch (err) {
      console.error('Error removing from favorites:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove from favorites';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }
  }, [user, isFavorite, fetchFavorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (foodItemId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to manage favorites');
      return false;
    }

    try {
      // Set user context for RLS
      await supabase.rpc('set_user_context', {
        user_id: user.id,
        user_role: user.role || 'customer'
      });

      // Use the database function for atomic toggle
      const { data, error: toggleError } = await supabase
        .rpc('toggle_favorite', {
          p_user_id: user.id,
          p_food_item_id: foodItemId
        });

      if (toggleError) throw toggleError;

      // Refresh favorites list
      await fetchFavorites();
      
      const isNowFavorited = data as boolean;
      toast.success(isNowFavorited ? 'Added to favorites' : 'Removed from favorites');
      return isNowFavorited;
    } catch (err) {
      console.error('Error toggling favorite:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update favorites';
      setError(errorMessage);
      toast.error(errorMessage);
      return isFavorite(foodItemId); // Return current state on error
    }
  }, [user, fetchFavorites, isFavorite]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch favorites when user changes
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Subscribe to real-time updates for favorites
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('user_favorites_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_favorites',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('Real-time favorites update:', payload);
          fetchFavorites(); // Refetch when changes occur
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchFavorites]);

  return {
    favorites,
    favoriteFoodItemIds,
    isLoading,
    error,
    favoritesCount,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    fetchFavorites,
    clearError
  };
};