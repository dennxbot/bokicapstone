-- Migration: Fix kiosk order status change trigger to work with simplified enum
-- The trigger function still references old status values that were removed in migration 32

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
    
    -- No longer need completed_at logic since 'completed' status was removed
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the fix
COMMENT ON FUNCTION log_kiosk_order_status_change() IS 'Updated trigger function to work with simplified kiosk_order_status enum (only pending_payment, payment_received, cancelled)';