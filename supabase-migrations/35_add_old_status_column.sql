-- Migration: Add old_status column to kiosk_order_status_history table
-- This fixes the missing old_status column error

-- Check if the column doesn't exist and add it
DO $$ 
BEGIN
    -- Add old_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kiosk_order_status_history' 
        AND column_name = 'old_status'
    ) THEN
        ALTER TABLE kiosk_order_status_history 
        ADD COLUMN old_status kiosk_order_status;
        
        RAISE NOTICE 'Added old_status column to kiosk_order_status_history table';
    ELSE
        RAISE NOTICE 'old_status column already exists in kiosk_order_status_history table';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN kiosk_order_status_history.old_status IS 'Previous status before the change (can be NULL for initial status)';