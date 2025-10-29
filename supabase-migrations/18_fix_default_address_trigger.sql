-- Fix the default address trigger to work with the unique constraint
-- The issue is that the trigger tries to ensure there's always a default,
-- but this conflicts with the unique constraint when switching defaults

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_ensure_single_default_address ON user_addresses;
DROP FUNCTION IF EXISTS ensure_single_default_address();

-- Create a new, improved function that handles default switching properly
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this address as default, unset all other defaults for this user
    IF NEW.is_default = true THEN
        UPDATE user_addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    -- Only auto-set as default if this is an INSERT and no other defaults exist
    -- Don't auto-set on UPDATE to avoid conflicts
    IF TG_OP = 'INSERT' AND NEW.is_default = false THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_addresses 
            WHERE user_id = NEW.user_id AND is_default = true
        ) THEN
            NEW.is_default = true;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_ensure_single_default_address
    BEFORE INSERT OR UPDATE ON user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_address();

-- Create an RPC function for atomic default address switching
CREATE OR REPLACE FUNCTION set_default_address(p_user_id UUID, p_address_id UUID)
RETURNS void AS $$
BEGIN
    -- First, clear all defaults for this user
    UPDATE user_addresses 
    SET is_default = false 
    WHERE user_id = p_user_id;
    
    -- Then set the new default
    UPDATE user_addresses 
    SET is_default = true 
    WHERE user_id = p_user_id AND id = p_address_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;