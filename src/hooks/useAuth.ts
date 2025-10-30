
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  contact_number: string | null;
  role: 'customer' | 'admin';
  password: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Set user context for RLS policies
        setUserContext(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Use Supabase Auth for authentication
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return {
          success: false,
          error: 'Invalid email or credentials. Please check your credentials.'
        };
      }

      // Get user profile from custom users table using the authenticated user's ID
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !userProfile) {
        // If no profile exists, create one from auth metadata
        const userData = {
          id: authData.user.id,
          email: authData.user.email!,
          full_name: authData.user.user_metadata?.full_name || 'User',
          contact_number: authData.user.user_metadata?.contact_number || null,
          role: (authData.user.user_metadata?.role as 'customer' | 'admin') || 'customer',
          password: '' // Don't store password in profile
        };

        // Check if user is banned (only for customers) - Use server-side validation
        if (userData.role === 'customer') {
          const { data: banInfo, error: banError } = await supabase
            .rpc('is_user_banned', { p_user_id: userData.id });

          if (!banError && banInfo && banInfo.length > 0 && banInfo[0].is_banned) {
            return {
              success: false,
              error: banInfo[0].ban_message
            };
          }
        }

        // Store user in localStorage and state
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setUser(userData);
        
        // Set user context for RLS policies
        await setUserContext(userData);

        return { success: true, user: userData };
      }

      // Store user profile in localStorage and state
      localStorage.setItem('currentUser', JSON.stringify(userProfile));
      setUser(userProfile);
      
      // Set user context for RLS policies
      await setUserContext(userProfile);

      return { success: true, user: userProfile };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: {
    email: string;
    password: string;
    fullName: string;
    contactNumber: string;
    role?: 'customer' | 'admin';
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName,
            contact_number: userData.contactNumber,
            role: userData.role || 'customer'
          }
        }
      });

      if (authError) {
        return {
          success: false,
          error: authError.message || 'Failed to create account'
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Failed to create account - no user data returned'
        };
      }

      // Create user profile in custom users table
      const newUser = {
        id: authData.user.id,
        email: userData.email,
        full_name: userData.fullName,
        contact_number: userData.contactNumber,
        role: userData.role || 'customer',
        password: '', // Don't store password in profile
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select('id, email, full_name, contact_number, role, created_at')
        .single();

      if (error) {
        console.error('Database error:', error);
        return {
          success: false,
          error: error.message || 'Failed to create user profile'
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Failed to create user profile - no data returned'
        };
      }

      // Create the user object with password for local storage
      const userWithPassword = {
        ...data,
        password: ''
      };

      // Auto login after signup
      localStorage.setItem('currentUser', JSON.stringify(userWithPassword));
      setUser(userWithPassword);
      
      // Set user context for RLS policies
      await setUserContext(userWithPassword);

      return { success: true };
    } catch (error: any) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during signup'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Sign out from Supabase Auth
    await supabase.auth.signOut();
    
    // Clear user context
    try {
      await supabase.rpc('clear_user_context');
    } catch (error) {
      console.error('Error clearing user context:', error);
    }
    
    // Clear local storage and state
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  // Set user context for RLS policies
  const setUserContext = async (user: UserProfile) => {
    try {
      // Set user context for RLS policies
      await supabase.rpc('set_user_context', {
        user_id: user.id,
        user_role: user.role
      });
    } catch (error) {
      console.error('Error setting user context:', error);
    }
  };

  const updateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      // Update localStorage and state
      const updatedUser = { ...user, ...data };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Update profile error:', error);
    }
  };

  return {
    user,
    profile: user,
    isLoading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };
};
