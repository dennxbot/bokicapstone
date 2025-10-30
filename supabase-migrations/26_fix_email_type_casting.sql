-- Migration: Fix email type casting in get_user_ban_history function
-- This fixes the VARCHAR(255) to TEXT type mismatch for the email column

-- Drop and recreate the function with proper email casting
DROP FUNCTION IF EXISTS get_user_ban_history(UUID);

-- Function to get complete ban history for a specific user
CREATE OR REPLACE FUNCTION get_user_ban_history(p_user_id UUID)
RETURNS TABLE (
    ban_id UUID,
    banned_at TIMESTAMP WITH TIME ZONE,
    banned_by UUID,
    banned_by_email TEXT,
    ban_reason TEXT,
    custom_reason TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE,
    ban_duration_days INTEGER,
    ban_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cb.id as ban_id,
        cb.created_at as banned_at,
        cb.banned_by,
        u.email::TEXT as banned_by_email,
        cb.ban_reason::TEXT,
        cb.custom_reason,
        cb.banned_until,
        cb.is_active,
        cb.notes,
        cb.updated_at,
        -- Calculate ban duration in days
        CASE 
            WHEN cb.banned_until IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (cb.banned_until - cb.created_at))::INTEGER
        END as ban_duration_days,
        -- Determine current status
        CASE 
            WHEN cb.is_active = false THEN 'Unbanned/Expired'
            WHEN cb.banned_until IS NULL THEN 'Permanent Ban (Active)'
            WHEN cb.banned_until > NOW() THEN 'Temporary Ban (Active)'
            ELSE 'Expired'
        END as ban_status
    FROM customer_bans cb
    LEFT JOIN users u ON cb.banned_by = u.id
    WHERE cb.user_id = p_user_id
    ORDER BY cb.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION get_user_ban_history(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_ban_history(UUID) IS 'Returns complete ban history for a specific user with proper type casting for all columns';