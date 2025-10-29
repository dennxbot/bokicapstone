-- Migration: Create atomic set_default_address function
-- This function handles setting a default address atomically to prevent constraint violations

-- Create function to set default address atomically
CREATE OR REPLACE FUNCTION set_default_address(p_user_id UUID, p_address_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Start a transaction block
    -- First, set all addresses for this user to not default
    UPDATE user_addresses 
    SET is_default = false 
    WHERE user_id = p_user_id;
    
    -- Then, set the selected address as default
    UPDATE user_addresses 
    SET is_default = true 
    WHERE id = p_address_id AND user_id = p_user_id;
    
    -- Check if the address was actually updated (exists and belongs to user)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Address not found or does not belong to user';
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_default_address(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION set_default_address(UUID, UUID) IS 'Atomically sets a default address for a user, clearing all other defaults first';