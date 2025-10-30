-- Migration: Add order_type column to kiosk_orders table
-- This enables kiosk users to choose between dine-in and take-out options

-- Add order_type column to kiosk_orders table
ALTER TABLE kiosk_orders 
ADD COLUMN order_type order_type DEFAULT 'pickup';

-- Update existing kiosk orders to have 'pickup' as default order type
-- (This maintains backward compatibility with existing orders)
UPDATE kiosk_orders 
SET order_type = 'pickup' 
WHERE order_type IS NULL;

-- Make order_type NOT NULL after setting defaults
ALTER TABLE kiosk_orders 
ALTER COLUMN order_type SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN kiosk_orders.order_type IS 'Order type: pickup (take-out) or delivery (dine-in for kiosk context)';

-- Create index for better query performance
CREATE INDEX idx_kiosk_orders_order_type ON kiosk_orders(order_type);