-- Add order_number field to orders table for kiosk functionality
-- This allows kiosk orders to have human-readable order numbers for cashier processing

ALTER TABLE orders 
ADD COLUMN order_number VARCHAR(20) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Add comment for documentation
COMMENT ON COLUMN orders.order_number IS 'Human-readable order number for kiosk orders (e.g., K001, K002)';