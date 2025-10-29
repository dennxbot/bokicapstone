-- Fix authentication context for RLS policies
-- This migration updates the get_current_user_role function to work with custom authentication

-- Update the get_current_user_role function to prioritize app context over auth.uid()
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
DECLARE
    app_role text;
    auth_role user_role;
BEGIN
    -- First try to get role from app context (set by set_user_context)
    BEGIN
        app_role := current_setting('app.current_user_role', true);
        IF app_role IS NOT NULL AND app_role != '' THEN
            RETURN app_role::user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to fallback if setting doesn't exist
    END;
    
    -- Fallback to auth.uid() lookup (for Supabase auth users)
    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO auth_role FROM users WHERE id = auth.uid();
        IF auth_role IS NOT NULL THEN
            RETURN auth_role;
        END IF;
    END IF;
    
    -- Default to customer if no role found
    RETURN 'customer'::user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_current_user_id function similarly
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    app_user_id text;
BEGIN
    -- First try to get user ID from app context
    BEGIN
        app_user_id := current_setting('app.current_user_id', true);
        IF app_user_id IS NOT NULL AND app_user_id != '' THEN
            RETURN app_user_id::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Continue to fallback if setting doesn't exist
    END;
    
    -- Fallback to auth.uid()
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update food_item_sizes policies to be more explicit about admin access
DROP POLICY IF EXISTS "Admins can manage food item sizes" ON food_item_sizes;

CREATE POLICY "Admins can manage food item sizes" ON food_item_sizes
    FOR ALL USING (
        get_current_user_role() = 'admin'::user_role
    );

-- Also ensure the size_options policies work correctly
DROP POLICY IF EXISTS "Admins can manage all size options" ON size_options;

CREATE POLICY "Admins can manage all size options" ON size_options
    FOR ALL USING (
        get_current_user_role() = 'admin'::user_role
    );