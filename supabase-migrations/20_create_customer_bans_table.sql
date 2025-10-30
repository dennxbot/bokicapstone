-- Migration: Create customer_bans table for tracking ban reasons and history
-- This table will work alongside Supabase's built-in banned_until field in auth.users

-- Create enum for ban reasons
CREATE TYPE ban_reason AS ENUM (
    'fake_orders',
    'payment_abuse', 
    'frequent_cancellations',
    'abusive_behavior',
    'multiple_fake_accounts',
    'false_reports',
    'policy_violations',
    'other'
);

-- Create customer_bans table
CREATE TABLE customer_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES users(id), -- Admin who banned the user
    ban_reason ban_reason NOT NULL,
    custom_reason TEXT, -- For 'other' reason type
    banned_until TIMESTAMP WITH TIME ZONE, -- NULL for permanent ban
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_customer_bans_user_id ON customer_bans(user_id);
CREATE INDEX idx_customer_bans_active ON customer_bans(is_active);
CREATE INDEX idx_customer_bans_banned_until ON customer_bans(banned_until);

-- Enable RLS
ALTER TABLE customer_bans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins can view all bans
CREATE POLICY "Admins can view all customer bans" ON customer_bans
    FOR SELECT USING (get_current_user_role() = 'admin');

-- Admins can create bans
CREATE POLICY "Admins can create customer bans" ON customer_bans
    FOR INSERT WITH CHECK (get_current_user_role() = 'admin');

-- Admins can update bans (for unbanning)
CREATE POLICY "Admins can update customer bans" ON customer_bans
    FOR UPDATE USING (get_current_user_role() = 'admin');

-- Function to ban a customer
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
    
    -- Update auth.users banned_until field
    UPDATE auth.users 
    SET banned_until = COALESCE(p_banned_until, '2099-12-31 23:59:59'::timestamp with time zone)
    WHERE id = p_user_id;
END;
$$;

-- Function to unban a customer
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
    
    -- Clear banned_until in auth.users
    UPDATE auth.users 
    SET banned_until = NULL
    WHERE id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION ban_customer(UUID, UUID, ban_reason, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION unban_customer(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE customer_bans IS 'Tracks customer ban history and reasons';
COMMENT ON FUNCTION ban_customer(UUID, UUID, ban_reason, TEXT, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Bans a customer with specified reason and duration';
COMMENT ON FUNCTION unban_customer(UUID, UUID) IS 'Unbans a customer by deactivating all active bans';