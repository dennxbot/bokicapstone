-- Migration: Add server-side ban validation to prevent client-side time manipulation
-- This ensures ban checking uses PostgreSQL's NOW() function instead of client-side Date()

-- Function to check if a user is currently banned (server-side validation)
CREATE OR REPLACE FUNCTION is_user_banned(p_user_id UUID)
RETURNS TABLE (
    is_banned BOOLEAN,
    ban_reason ban_reason,
    custom_reason TEXT,
    banned_until TIMESTAMP WITH TIME ZONE,
    ban_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ban_record RECORD;
    reason_text TEXT;
    message TEXT;
BEGIN
    -- Get active ban information
    SELECT cb.ban_reason, cb.custom_reason, cb.banned_until, cb.is_active
    INTO ban_record
    FROM customer_bans cb
    WHERE cb.user_id = p_user_id 
      AND cb.is_active = true
    ORDER BY cb.created_at DESC
    LIMIT 1;
    
    -- If no active ban record found
    IF NOT FOUND OR ban_record.is_active = false THEN
        RETURN QUERY SELECT false, NULL::ban_reason, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Check if ban is still active using server time (PostgreSQL NOW())
    IF ban_record.banned_until IS NULL OR ban_record.banned_until > NOW() THEN
        -- User is still banned - Format ban reason
        IF ban_record.ban_reason = 'other' AND ban_record.custom_reason IS NOT NULL THEN
            reason_text := ban_record.custom_reason;
        ELSE
            reason_text := CASE ban_record.ban_reason
                WHEN 'fake_orders' THEN 'Placing fake orders'
                WHEN 'payment_abuse' THEN 'Payment system abuse'
                WHEN 'frequent_cancellations' THEN 'Frequent order cancellations'
                WHEN 'abusive_behavior' THEN 'Abusive behavior towards staff'
                WHEN 'multiple_fake_accounts' THEN 'Creating multiple fake accounts'
                WHEN 'false_reports' THEN 'False reports or scams'
                WHEN 'policy_violations' THEN 'Policy violations'
                ELSE ban_record.ban_reason::TEXT
            END;
        END IF;
        
        -- Create ban message
        IF ban_record.banned_until IS NULL THEN
            message := 'Your account has been permanently suspended due to: ' || reason_text || '. Please contact support if you believe this is an error.';
        ELSE
            message := 'Your account is temporarily suspended until ' || 
                      TO_CHAR(ban_record.banned_until AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS UTC') || 
                      ' due to: ' || reason_text || '. Please try again after the ban period expires.';
        END IF;
        
        RETURN QUERY SELECT true, ban_record.ban_reason, ban_record.custom_reason, ban_record.banned_until, message;
    ELSE
        -- Ban has expired, deactivate it
        UPDATE customer_bans 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = p_user_id AND is_active = true;
        
        RETURN QUERY SELECT false, NULL::ban_reason, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::TEXT;
    END IF;
END;
$$;

-- Function to get current server time (for client verification)
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT NOW();
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_banned(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_server_time() TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_user_banned(UUID) IS 'Server-side ban validation using PostgreSQL NOW() to prevent client-side time manipulation';
COMMENT ON FUNCTION get_server_time() IS 'Returns current server time for client verification and synchronization';