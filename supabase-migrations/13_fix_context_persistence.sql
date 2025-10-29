-- Fix context persistence issue
-- The problem is that set_config with 'true' as third parameter makes it transaction-local
-- We need to make it session-local for it to persist across RPC calls

-- Update set_user_context to use session-level configuration
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID, user_role user_role)
RETURNS void AS $$
BEGIN
    -- Use false for session-level configuration instead of transaction-level
    PERFORM set_config('app.current_user_id', user_id::text, false);
    PERFORM set_config('app.current_user_role', user_role::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update clear_user_context to use session-level configuration
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS void AS $$
BEGIN
    -- Use false for session-level configuration
    PERFORM set_config('app.current_user_id', '', false);
    PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function to verify context persistence
CREATE OR REPLACE FUNCTION test_context_persistence()
RETURNS json AS $$
DECLARE
    user_id_setting text;
    user_role_setting text;
    result json;
BEGIN
    -- Try to read the current settings
    BEGIN
        user_id_setting := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
        user_id_setting := 'NOT_SET';
    END;
    
    BEGIN
        user_role_setting := current_setting('app.current_user_role', true);
    EXCEPTION WHEN OTHERS THEN
        user_role_setting := 'NOT_SET';
    END;
    
    -- Return as JSON
    result := json_build_object(
        'user_id_setting', user_id_setting,
        'user_role_setting', user_role_setting,
        'computed_role', get_current_user_role()::text,
        'auth_uid', auth.uid()::text
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;