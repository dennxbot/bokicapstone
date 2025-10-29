-- Migration: Remove address field from users table
-- This migration removes the deprecated address field from the users table
-- since we now use the user_addresses table for address management

-- Remove the address column from users table
ALTER TABLE users DROP COLUMN IF EXISTS address;

-- Add comment for documentation
COMMENT ON TABLE users IS 'User profiles without address field - addresses are now managed in user_addresses table';