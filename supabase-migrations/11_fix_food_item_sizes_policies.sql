-- Fix food_item_sizes RLS policies
-- This migration cleans up conflicting policies and creates proper ones

-- Drop all existing policies on food_item_sizes table
DROP POLICY IF EXISTS "Anyone can view available food item sizes" ON food_item_sizes;
DROP POLICY IF EXISTS "Admins can view all food item sizes" ON food_item_sizes;
DROP POLICY IF EXISTS "Admins can manage food item sizes" ON food_item_sizes;

-- Create clean policies for food_item_sizes
-- Public can view available sizes
CREATE POLICY "Public can view available food item sizes" ON food_item_sizes
    FOR SELECT USING (is_available = true);

-- Admins can do everything
CREATE POLICY "Admins have full access to food item sizes" ON food_item_sizes
    FOR ALL USING (get_current_user_role() = 'admin'::user_role);

-- Also ensure we have the clear_user_context function
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.current_user_role', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;