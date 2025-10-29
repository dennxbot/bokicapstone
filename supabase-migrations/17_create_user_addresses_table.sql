-- Migration: Create user_addresses table for multiple address management
-- This migration creates a new table to store multiple addresses per user

-- Create user_addresses table
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL, -- e.g., 'Home', 'Work', 'Office'
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Philippines',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_default ON user_addresses(user_id, is_default) WHERE is_default = true;

-- Add constraint to ensure only one default address per user
CREATE UNIQUE INDEX idx_user_addresses_one_default 
ON user_addresses(user_id) 
WHERE is_default = true;

-- Add comments for documentation
COMMENT ON TABLE user_addresses IS 'Stores multiple addresses for each user';
COMMENT ON COLUMN user_addresses.label IS 'User-friendly label for the address (Home, Work, etc.)';
COMMENT ON COLUMN user_addresses.is_default IS 'Whether this is the default address for the user';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_addresses_updated_at
    BEFORE UPDATE ON user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_user_addresses_updated_at();

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this address as default, unset all other defaults for this user
    IF NEW.is_default = true THEN
        UPDATE user_addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    -- If this is the user's first address, make it default
    IF NOT EXISTS (
        SELECT 1 FROM user_addresses 
        WHERE user_id = NEW.user_id AND is_default = true AND id != NEW.id
    ) THEN
        NEW.is_default = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_address
    BEFORE INSERT OR UPDATE ON user_addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_address();

-- Enable Row Level Security
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_addresses table
-- Users can view their own addresses
CREATE POLICY "Users can view their own addresses" ON user_addresses
    FOR SELECT USING (user_id = get_current_user_id());

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses" ON user_addresses
    FOR SELECT USING (get_current_user_role() = 'admin');

-- Users can insert their own addresses
CREATE POLICY "Users can create their own addresses" ON user_addresses
    FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Admins can insert addresses for any user
CREATE POLICY "Admins can create addresses for any user" ON user_addresses
    FOR INSERT WITH CHECK (get_current_user_role() = 'admin');

-- Users can update their own addresses
CREATE POLICY "Users can update their own addresses" ON user_addresses
    FOR UPDATE USING (user_id = get_current_user_id());

-- Admins can update any address
CREATE POLICY "Admins can update any address" ON user_addresses
    FOR UPDATE USING (get_current_user_role() = 'admin');

-- Users can delete their own addresses
CREATE POLICY "Users can delete their own addresses" ON user_addresses
    FOR DELETE USING (user_id = get_current_user_id());

-- Admins can delete any address
CREATE POLICY "Admins can delete any address" ON user_addresses
    FOR DELETE USING (get_current_user_role() = 'admin');