-- Migration: Add functions to view ban audit trails and history
-- These functions help administrators view complete ban history for users

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
        u.email as banned_by_email,
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

-- Function to get ban statistics for all users (admin overview)
CREATE OR REPLACE FUNCTION get_ban_statistics()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT,
    total_bans INTEGER,
    active_bans INTEGER,
    permanent_bans INTEGER,
    temporary_bans INTEGER,
    last_ban_date TIMESTAMP WITH TIME ZONE,
    current_ban_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email as user_email,
        u.full_name as user_full_name,
        COUNT(cb.id)::INTEGER as total_bans,
        COUNT(CASE WHEN cb.is_active = true THEN 1 END)::INTEGER as active_bans,
        COUNT(CASE WHEN cb.is_active = true AND cb.banned_until IS NULL THEN 1 END)::INTEGER as permanent_bans,
        COUNT(CASE WHEN cb.is_active = true AND cb.banned_until IS NOT NULL THEN 1 END)::INTEGER as temporary_bans,
        MAX(cb.created_at) as last_ban_date,
        CASE 
            WHEN COUNT(CASE WHEN cb.is_active = true THEN 1 END) = 0 THEN 'Not Banned'
            WHEN COUNT(CASE WHEN cb.is_active = true AND cb.banned_until IS NULL THEN 1 END) > 0 THEN 'Permanently Banned'
            WHEN COUNT(CASE WHEN cb.is_active = true AND cb.banned_until > NOW() THEN 1 END) > 0 THEN 'Temporarily Banned'
            ELSE 'Ban Expired'
        END as current_ban_status
    FROM users u
    LEFT JOIN customer_bans cb ON u.id = cb.user_id
    GROUP BY u.id, u.email, u.full_name
    HAVING COUNT(cb.id) > 0  -- Only show users who have been banned at least once
    ORDER BY MAX(cb.created_at) DESC;
END;
$$;

-- Function to get recent ban activity (last 30 days)
CREATE OR REPLACE FUNCTION get_recent_ban_activity(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    ban_id UUID,
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT,
    banned_by UUID,
    banned_by_email TEXT,
    ban_reason ban_reason,
    custom_reason TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    action_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cb.id as ban_id,
        cb.user_id,
        u.email as user_email,
        u.full_name as user_full_name,
        cb.banned_by,
        admin_user.email as banned_by_email,
        cb.ban_reason,
        cb.custom_reason,
        cb.banned_until,
        cb.is_active,
        cb.created_at,
        CASE 
            WHEN cb.is_active = true THEN 'Ban Applied'
            ELSE 'Ban Removed/Expired'
        END as action_type
    FROM customer_bans cb
    LEFT JOIN users u ON cb.user_id = u.id
    LEFT JOIN users admin_user ON cb.banned_by = admin_user.id
    WHERE cb.created_at >= NOW() - INTERVAL '1 day' * p_days
    ORDER BY cb.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_ban_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ban_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_ban_activity(INTEGER) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_user_ban_history(UUID) IS 'Returns complete ban history for a specific user with detailed information';
COMMENT ON FUNCTION get_ban_statistics() IS 'Returns ban statistics overview for all users who have been banned';
COMMENT ON FUNCTION get_recent_ban_activity(INTEGER) IS 'Returns recent ban activity within specified number of days (default 30)';