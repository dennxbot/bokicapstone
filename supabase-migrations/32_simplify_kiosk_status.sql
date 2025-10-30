-- Migration: Simplify kiosk order status enum to only essential statuses
-- Remove unnecessary statuses and keep only: pending_payment, payment_received, cancelled

-- First, update any existing orders with complex statuses to simpler ones
UPDATE kiosk_orders 
SET status = 'payment_received'::kiosk_order_status 
WHERE status IN ('preparing', 'ready', 'completed');

-- Create a new simplified enum
CREATE TYPE kiosk_order_status_simple AS ENUM (
  'pending_payment',
  'payment_received', 
  'cancelled'
);

-- Add a new column with the simplified enum
ALTER TABLE kiosk_orders ADD COLUMN new_status kiosk_order_status_simple;

-- Migrate existing data to the new simplified status
UPDATE kiosk_orders 
SET new_status = CASE 
  WHEN status = 'pending_payment' THEN 'pending_payment'::kiosk_order_status_simple
  WHEN status IN ('payment_received', 'preparing', 'ready', 'completed') THEN 'payment_received'::kiosk_order_status_simple
  WHEN status = 'cancelled' THEN 'cancelled'::kiosk_order_status_simple
  ELSE 'pending_payment'::kiosk_order_status_simple
END;

-- Make the new column not null
ALTER TABLE kiosk_orders ALTER COLUMN new_status SET NOT NULL;

-- Drop the old status column
ALTER TABLE kiosk_orders DROP COLUMN status;

-- Rename the new column to status
ALTER TABLE kiosk_orders RENAME COLUMN new_status TO status;

-- Handle the status history table before dropping the enum
-- First, create temporary text columns to preserve the data
ALTER TABLE kiosk_order_status_history 
ADD COLUMN temp_old_status_text TEXT,
ADD COLUMN temp_new_status_text TEXT;

-- Copy the existing enum values to text columns
UPDATE kiosk_order_status_history 
SET temp_old_status_text = old_status::text,
    temp_new_status_text = new_status::text;

-- Drop the old enum type (CASCADE will handle dependent columns)
DROP TYPE kiosk_order_status CASCADE;

-- Rename the new enum type
ALTER TYPE kiosk_order_status_simple RENAME TO kiosk_order_status;

-- Re-add the status history table columns with the new simplified enum
ALTER TABLE kiosk_order_status_history 
ADD COLUMN old_status kiosk_order_status,
ADD COLUMN new_status kiosk_order_status;

-- Update the new columns with simplified status values from the text columns
UPDATE kiosk_order_status_history 
SET old_status = CASE 
  WHEN temp_old_status_text IN ('preparing', 'ready', 'completed') THEN 'payment_received'::kiosk_order_status
  WHEN temp_old_status_text = 'pending_payment' THEN 'pending_payment'::kiosk_order_status
  WHEN temp_old_status_text = 'cancelled' THEN 'cancelled'::kiosk_order_status
  ELSE 'pending_payment'::kiosk_order_status
END,
new_status = CASE 
  WHEN temp_new_status_text IN ('preparing', 'ready', 'completed') THEN 'payment_received'::kiosk_order_status
  WHEN temp_new_status_text = 'pending_payment' THEN 'pending_payment'::kiosk_order_status
  WHEN temp_new_status_text = 'cancelled' THEN 'cancelled'::kiosk_order_status
  ELSE 'pending_payment'::kiosk_order_status
END;

-- Drop the temporary text columns
ALTER TABLE kiosk_order_status_history 
DROP COLUMN temp_old_status_text,
DROP COLUMN temp_new_status_text;

-- Add comment explaining the simplification
COMMENT ON TYPE kiosk_order_status IS 'Simplified kiosk order status: pending_payment -> payment_received or cancelled';