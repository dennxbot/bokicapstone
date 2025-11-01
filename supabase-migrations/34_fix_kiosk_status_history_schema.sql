-- Migration: Fix kiosk_order_status_history table schema issues
-- This migration ensures the table has the correct columns after the status simplification

-- First, check if the old_status and new_status columns exist with the correct type
-- If they don't exist or have wrong type, recreate them

-- Drop and recreate the kiosk_order_status_history table to ensure clean schema
DROP TABLE IF EXISTS kiosk_order_status_history CASCADE;

-- Recreate the table with the correct schema
CREATE TABLE kiosk_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_order_id UUID NOT NULL REFERENCES kiosk_orders(id) ON DELETE CASCADE,
  old_status kiosk_order_status,
  new_status kiosk_order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_kiosk_order_status_history_kiosk_order_id ON kiosk_order_status_history(kiosk_order_id);
CREATE INDEX idx_kiosk_order_status_history_created_at ON kiosk_order_status_history(created_at);

-- Recreate the trigger function for logging status changes
CREATE OR REPLACE FUNCTION log_kiosk_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO kiosk_order_status_history (
      kiosk_order_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      CASE 
        WHEN NEW.status = 'payment_received' THEN 'Payment confirmed by cashier'
        WHEN NEW.status = 'cancelled' THEN 'Order cancelled by cashier'
        ELSE NULL
      END
    );
    
    -- Set completed_at timestamp when order is completed
    IF NEW.status = 'payment_received' THEN
      NEW.updated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_log_kiosk_order_status_change ON kiosk_orders;
CREATE TRIGGER trigger_log_kiosk_order_status_change
  BEFORE UPDATE ON kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_kiosk_order_status_change();

-- Add RLS policies for the status history table
ALTER TABLE kiosk_order_status_history ENABLE ROW LEVEL SECURITY;

-- Policy for kiosk users to view status history
CREATE POLICY "Kiosk users can view status history" ON kiosk_order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'kiosk@boki.com'
    )
  );

-- Policy for admins to manage status history
CREATE POLICY "Admins can manage status history" ON kiosk_order_status_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Policy for system to create status history entries
CREATE POLICY "System can create status history" ON kiosk_order_status_history
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE kiosk_order_status_history IS 'Status change history for kiosk orders with simplified status enum';