import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { SizeOption, SizeWithPrice } from '../types';

export function useSizes() {
  const { user } = useAuth();
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all active size options
  const fetchSizeOptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('size_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setSizeOptions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch size options');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all size options (including inactive) - for admin use
  const fetchAllSizeOptions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('size_options')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setSizeOptions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch all size options');
    } finally {
      setIsLoading(false);
    }
  };

  // Get available sizes for a specific food item
  const getFoodItemSizes = async (foodItemId: string): Promise<SizeWithPrice[]> => {
    try {
      // First try to get the base price of the food item
      const { data: foodItem, error: foodError } = await supabase
        .from('food_items')
        .select('price')
        .eq('id', foodItemId)
        .single();

      if (foodError) {
        console.error('Error fetching food item:', foodError);
        throw foodError;
      }

      // Try to get sizes using RPC function
      const { data, error } = await supabase.rpc('get_food_item_sizes', {
        item_id: foodItemId
      });

      if (error) {
        console.error('Error calling get_food_item_sizes RPC:', error);
        // Fallback: try to get sizes directly from tables
        const { data: sizesData, error: sizesError } = await supabase
          .from('food_item_sizes')
          .select(`
            size_option_id,
            is_available,
            size_options (
              id,
              name,
              description,
              price_multiplier,
              sort_order
            )
          `)
          .eq('food_item_id', foodItemId)
          .eq('is_available', true);

        if (sizesError) {
          console.error('Error fetching sizes directly:', sizesError);
          throw sizesError;
        }

        // Transform the fallback data
        return (sizesData || []).map((item: any) => ({
          id: item.size_options.id,
          size_option_id: item.size_options.id,
          name: item.size_options.name,
          description: item.size_options.description,
          price_multiplier: item.size_options.price_multiplier,
          calculated_price: Math.round(foodItem.price * item.size_options.price_multiplier * 100) / 100,
          is_available: item.is_available,
          sort_order: item.size_options.sort_order
        })).sort((a, b) => a.sort_order - b.sort_order);
      }

      // Calculate prices for each size (RPC success path)
      return (data || []).map((size: any) => ({
        id: size.size_id,
        size_option_id: size.size_id,
        name: size.size_name,
        description: size.size_description,
        price_multiplier: size.price_multiplier,
        calculated_price: Math.round(foodItem.price * size.price_multiplier * 100) / 100,
        is_available: size.is_available,
        sort_order: size.sort_order
      }));
    } catch (err) {
      console.error('Error fetching food item sizes:', err);
      return [];
    }
  };

  // Create a new size option (admin only)
  const createSizeOption = async (sizeData: Omit<SizeOption, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { data, error } = await supabase
        .from('size_options')
        .insert([sizeData])
        .select()
        .single();

      if (error) throw error;

      // Refresh the size options list
      await fetchAllSizeOptions();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create size option';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update a size option (admin only)
  const updateSizeOption = async (id: string, updates: Partial<SizeOption>) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { data, error } = await supabase
        .from('size_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Refresh the size options list
      await fetchAllSizeOptions();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update size option';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Delete a size option (admin only)
  const deleteSizeOption = async (id: string) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { error } = await supabase
        .from('size_options')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the size options list
      await fetchAllSizeOptions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete size option';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Assign a single size to a food item (admin only)
  const assignSizeToFoodItem = async (foodItemId: string, sizeId: string) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const assignment = {
        food_item_id: foodItemId,
        size_option_id: sizeId,
        is_available: true
      };

      const { error } = await supabase
        .from('food_item_sizes')
        .insert([assignment]);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign size to food item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Remove a size from a food item (admin only)
  const removeSizeFromFoodItem = async (foodItemId: string, sizeId: string) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { error } = await supabase
        .from('food_item_sizes')
        .delete()
        .eq('food_item_id', foodItemId)
        .eq('size_option_id', sizeId);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove size from food item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Assign sizes to a food item (admin only)
  const assignSizesToFoodItem = async (foodItemId: string, sizeIds: string[]) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      // Use upsert approach to handle existing assignments
      // First, mark all existing sizes as unavailable
      await supabase
        .from('food_item_sizes')
        .update({ is_available: false })
        .eq('food_item_id', foodItemId);

      // Then, upsert the selected sizes as available
      if (sizeIds.length > 0) {
        const assignments = sizeIds.map(sizeId => ({
          food_item_id: foodItemId,
          size_option_id: sizeId,
          is_available: true
        }));

        // Use raw SQL with ON CONFLICT to handle duplicates properly
        const { error } = await supabase.rpc('upsert_food_item_sizes', {
          assignments: assignments
        });

        if (error) {
          // Fallback to individual upserts if the RPC function doesn't exist
          for (const assignment of assignments) {
            const { error: upsertError } = await supabase
              .from('food_item_sizes')
              .upsert(assignment, { 
                onConflict: 'food_item_id,size_option_id',
                ignoreDuplicates: false 
              });
            
            if (upsertError) throw upsertError;
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign sizes to food item';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update food item size availability (admin only)
  const updateFoodItemSizeAvailability = async (
    foodItemId: string, 
    sizeId: string, 
    isAvailable: boolean
  ) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { error } = await supabase
        .from('food_item_sizes')
        .update({ is_available: isAvailable })
        .eq('food_item_id', foodItemId)
        .eq('size_option_id', sizeId);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update size availability';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Set custom price multiplier for a specific food item size (admin only)
  const setCustomPriceMultiplier = async (
    foodItemId: string,
    sizeId: string,
    customMultiplier: number | null
  ) => {
    try {
      setError(null);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { error } = await supabase
        .from('food_item_sizes')
        .update({ custom_price_multiplier: customMultiplier })
        .eq('food_item_id', foodItemId)
        .eq('size_option_id', sizeId);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set custom price multiplier';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Calculate price with size
  const calculatePriceWithSize = async (foodItemId: string, sizeId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_item_price_with_size', {
        item_id: foodItemId,
        size_id: sizeId
      });

      if (error) throw error;
      return data || 0;
    } catch (err) {
      console.error('Error calculating price with size:', err);
      return 0;
    }
  };

  useEffect(() => {
    fetchSizeOptions();
  }, []);

  return {
    sizeOptions,
    isLoading,
    error,
    fetchSizeOptions,
    fetchAllSizeOptions,
    getFoodItemSizes,
    createSizeOption,
    updateSizeOption,
    deleteSizeOption,
    assignSizeToFoodItem,
    removeSizeFromFoodItem,
    assignSizesToFoodItem,
    updateFoodItemSizeAvailability,
    setCustomPriceMultiplier,
    calculatePriceWithSize
  };
}