-- Add delivery_fee column to orders table
-- This migration adds a separate delivery_fee column to track delivery charges

ALTER TABLE orders 
ADD COLUMN delivery_fee DECIMAL(10,2) DEFAULT 0 CHECK (delivery_fee >= 0);

-- Update existing delivery orders to have the standard delivery fee
-- Assuming delivery fee is 50 pesos for delivery orders
UPDATE orders 
SET delivery_fee = 50.00 
WHERE order_type = 'delivery';

-- Update existing pickup orders to have no delivery fee
UPDATE orders 
SET delivery_fee = 0.00 
WHERE order_type = 'pickup';

-- Add comment to document the column
COMMENT ON COLUMN orders.delivery_fee IS 'Delivery fee charged for the order. 0 for pickup orders, typically 50 for delivery orders.';