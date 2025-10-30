-- Migration: Fix ban/unban functions to work with public.users table instead of auth.users
-- This fixes the issue where the functions were trying to access auth.users which doesn't exist

-- Drop existing functions
DROP FUNCTION IF EXISTS ban_customer(UUID, UUID, ban_reason, TEXT, TIMESTAMP WITH TIME ZONE, TEXT);
DROP FUNCTION IF EXISTS unban_customer(UUID, UUID);

-- Recreate ban_customer function without auth.users dependency
CREATE OR REPLACE FUNCTION ban_customer(
    p_user_id UUID,
    p_banned_by UUID,
    p_ban_reason ban_reason,
    p_custom_reason TEXT DEFAULT NULL,
    p_banned_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deactivate any existing active bans for this user
    UPDATE customer_bans 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Insert new ban record
    INSERT INTO customer_bans (
        user_id, 
        banned_by, 
        ban_reason, 
        custom_reason, 
        banned_until, 
        notes
    ) VALUES (
        p_user_id, 
        p_banned_by, 
        p_ban_reason, 
        p_custom_reason, 
        p_banned_until, 
        p_notes
    );
END;
$$;

-- Recreate unban_customer function without auth.users dependency
CREATE OR REPLACE FUNCTION unban_customer(
    p_user_id UUID,
    p_unbanned_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deactivate all active bans for this user
    UPDATE customer_bans 
    SET is_active = false, updated_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ban_customer(UUID, UUID, ban_reason, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unban_customer(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION ban_customer(UUID, UUID, ban_reason, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Bans a customer with specified reason and duration (fixed for public.users)';
COMMENT ON FUNCTION unban_customer(UUID, UUID) IS 'Unbans a customer by deactivating all active bans (fixed for public.users)';