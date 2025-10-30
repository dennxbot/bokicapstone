-- Add pending_payment status to order_status enum for kiosk functionality
-- This status represents orders that have been placed but payment is pending at cashier

-- Add the new status to the enum
ALTER TYPE order_status ADD VALUE 'pending_payment' BEFORE 'preparing';

-- Update the order status history function to handle the new status
CREATE OR REPLACE FUNCTION create_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history entry if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, changed_by, notes)
        VALUES (
            NEW.id, 
            NEW.status, 
            get_current_user_id(),
            CASE 
                WHEN NEW.status = 'pending' THEN 'Order placed'
                WHEN NEW.status = 'pending_payment' THEN 'Order placed - Payment pending at cashier'
                WHEN NEW.status = 'preparing' THEN 'Order is being prepared'
                WHEN NEW.status = 'ready' THEN 'Order is ready'
                WHEN NEW.status = 'out_for_delivery' THEN 'Order is out for delivery'
                WHEN NEW.status = 'completed' THEN 'Order completed'
                WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
                ELSE 'Status updated'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TYPE order_status IS 'Order status enum: pending (regular orders), pending_payment (kiosk orders awaiting payment), preparing, ready, out_for_delivery, completed, cancelled';