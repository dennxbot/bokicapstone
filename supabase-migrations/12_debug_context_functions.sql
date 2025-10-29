-- Debug functions to test context mechanism
-- This migration adds helper functions to debug the context setting

-- Function to test config reading directly
CREATE OR REPLACE FUNCTION test_config_reading()
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
        user_id_setting := 'ERROR_READING_ID';
    END;
    
    BEGIN
        user_role_setting := current_setting('app.current_user_role', true);
    EXCEPTION WHEN OTHERS THEN
        user_role_setting := 'ERROR_READING_ROLE';
    END;
    
    -- Return as JSON
    result := json_build_object(
        'user_id_setting', user_id_setting,
        'user_role_setting', user_role_setting,
        'auth_uid', auth.uid()::text
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced set_user_context with logging
CREATE OR REPLACE FUNCTION set_user_context_debug(user_id UUID, user_role user_role)
RETURNS json AS $$
DECLARE
    result json;
    test_read_id text;
    test_read_role text;
BEGIN
    -- Set the context
    PERFORM set_config('app.current_user_id', user_id::text, true);
    PERFORM set_config('app.current_user_role', user_role::text, true);
    
    -- Immediately try to read back
    BEGIN
        test_read_id := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
        test_read_id := 'ERROR_READING_BACK_ID';
    END;
    
    BEGIN
        test_read_role := current_setting('app.current_user_role', true);
    EXCEPTION WHEN OTHERS THEN
        test_read_role := 'ERROR_READING_BACK_ROLE';
    END;
    
    -- Return debug info
    result := json_build_object(
        'set_user_id', user_id::text,
        'set_user_role', user_role::text,
        'read_back_id', test_read_id,
        'read_back_role', test_read_role,
        'success', true
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;