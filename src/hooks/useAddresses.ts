import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_line_1: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressData {
  label: string;
  address_line_1: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_default?: boolean;
}

export interface UpdateAddressData extends Partial<CreateAddressData> {
  id: string;
}

export const useAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to set user context for RLS policies
  const setUserContext = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase.rpc('set_user_context', {
        user_id: user.id,
        user_role: user.role
      });
    } catch (error) {
      console.error('Error setting user context:', error);
    }
  }, [user]);

  // Load user addresses
  const loadAddresses = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Set user context for RLS policies
      await setUserContext();

      const { data, error: fetchError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAddresses(data || []);
    } catch (err) {
      console.error('Error loading addresses:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load addresses';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user, setUserContext]);

  // Create new address
  const createAddress = useCallback(async (addressData: CreateAddressData): Promise<UserAddress> => {
    if (!user) {
      throw new Error('User must be logged in to create address');
    }

    try {
      setError(null);

      // Set user context for RLS policies
      await setUserContext();

      // The database trigger will automatically handle default address logic
      const { data, error: createError } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          label: addressData.label,
          address_line_1: addressData.address_line_1,
          address_line_2: addressData.address_line_2,
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.postal_code,
          country: addressData.country || 'Philippines',
          is_default: addressData.is_default || false,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Reload addresses to get updated list
      await loadAddresses();
      
      return data;
    } catch (err) {
      console.error('Error creating address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user, loadAddresses, setUserContext]);

  // Update existing address
  const updateAddress = useCallback(async (addressData: UpdateAddressData): Promise<UserAddress> => {
    if (!user) {
      throw new Error('User must be logged in to update address');
    }

    try {
      setError(null);

      // Set user context for RLS policies
      await setUserContext();

      // The database trigger will automatically handle default address logic
      const { data, error: updateError } = await supabase
        .from('user_addresses')
        .update({
          label: addressData.label,
          address_line_1: addressData.address_line_1,
          address_line_2: addressData.address_line_2,
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.postal_code,
          country: addressData.country,
          is_default: addressData.is_default,
        })
        .eq('id', addressData.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Reload addresses to get updated list
      await loadAddresses();
      
      return data;
    } catch (err) {
      console.error('Error updating address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user, loadAddresses, setUserContext]);

  // Delete address
  const deleteAddress = useCallback(async (addressId: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to delete address');
    }

    try {
      setError(null);

      // Set user context for RLS policies
      await setUserContext();

      const { error: deleteError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw deleteError;
      }

      // Reload addresses to get updated list
      await loadAddresses();
    } catch (err) {
      console.error('Error deleting address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user, loadAddresses, setUserContext]);

  // Set default address
  const setDefaultAddress = useCallback(async (addressId: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be logged in to set default address');
    }

    try {
      setError(null);

      // Set user context for RLS policies
      await setUserContext();

      // Get all addresses to understand current state
      const { data: allAddresses } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id);

      if (!allAddresses) {
        throw new Error('Could not fetch addresses');
      }

      const targetAddress = allAddresses.find(addr => addr.id === addressId);
      if (!targetAddress) {
        throw new Error('Target address not found');
      }

      // If target is already default, nothing to do
      if (targetAddress.is_default) {
        return;
      }

      // SOLUTION: Use the RPC function if available, otherwise use a workaround
      // First try the RPC function
      const { error: rpcError } = await supabase.rpc('set_default_address', {
        p_user_id: user.id,
        p_address_id: addressId
      });

      if (!rpcError) {
        // RPC function worked, we're done
        await loadAddresses();
        return;
      }

      // RPC function failed, use workaround approach
      console.log('RPC function not available, using workaround approach');

      // Workaround: Update addresses one by one in the correct order
      // First, update all OTHER addresses to false (excluding target)
      const otherAddresses = allAddresses.filter(addr => addr.id !== addressId);
      
      for (const addr of otherAddresses) {
        if (addr.is_default) {
          const { error: clearError } = await supabase
            .from('user_addresses')
            .update({ is_default: false })
            .eq('id', addr.id)
            .eq('user_id', user.id);

          if (clearError) {
            console.error('Error clearing default for address:', addr.id, clearError);
            // Continue with other addresses even if one fails
          }
          
          // Small delay to let the database process
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Now set the target as default
      const { error: updateError } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Reload addresses to get updated list
      await loadAddresses();
    } catch (err) {
      console.error('Error setting default address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user, loadAddresses, setUserContext]);

  // Get default address
  const getDefaultAddress = useCallback((): UserAddress | null => {
    return addresses.find(addr => addr.is_default) || null;
  }, [addresses]);

  // Format address for display
  const formatAddress = useCallback((address: UserAddress): string => {
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.postal_code,
    ].filter(Boolean);
    
    return parts.join(', ');
  }, []);

  // Load addresses when user changes
  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  return {
    addresses,
    isLoading,
    error,
    loadAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    getDefaultAddress,
    formatAddress,
  };
};