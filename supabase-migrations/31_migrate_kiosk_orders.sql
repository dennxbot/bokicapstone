-- Migration: Move existing kiosk orders from orders table to kiosk_orders table
-- This migration identifies kiosk orders and transfers them to the new kiosk_orders table

-- First, insert kiosk orders into the new kiosk_orders table
INSERT INTO kiosk_orders (
  id,
  order_number,
  customer_name,
  customer_phone,
  total_amount,
  payment_method,
  status,
  created_at,
  updated_at
)
SELECT 
  o.id,
  o.order_number,
  o.customer_name,
  o.customer_phone,
  o.total_amount,
  o.payment_method,
  CASE 
    WHEN o.status = 'pending_payment' THEN 'pending_payment'::kiosk_order_status
    WHEN o.status = 'preparing' THEN 'payment_received'::kiosk_order_status
    WHEN o.status = 'ready' THEN 'ready'::kiosk_order_status
    WHEN o.status = 'completed' THEN 'completed'::kiosk_order_status
    WHEN o.status = 'cancelled' THEN 'cancelled'::kiosk_order_status
    ELSE 'pending_payment'::kiosk_order_status
  END,
  o.created_at,
  o.updated_at
FROM orders o
WHERE o.user_id = (SELECT id FROM auth.users WHERE email = 'kiosk@boki.com')
  AND o.order_type = 'pickup'
  AND o.address = 'BOKI Restaurant - Pickup';

-- Insert kiosk order items
INSERT INTO kiosk_order_items (
  kiosk_order_id,
  menu_item_id,
  quantity,
  unit_price,
  total_price,
  customizations
)
SELECT 
  oi.order_id,
  oi.menu_item_id,
  oi.quantity,
  oi.unit_price,
  oi.total_price,
  oi.customizations
FROM order_items oi
WHERE oi.order_id IN (
  SELECT o.id 
  FROM orders o
  WHERE o.user_id = (SELECT id FROM auth.users WHERE email = 'kiosk@boki.com')
    AND o.order_type = 'pickup'
    AND o.address = 'BOKI Restaurant - Pickup'
);

-- Create initial status history for migrated kiosk orders
INSERT INTO kiosk_order_status_history (
  kiosk_order_id,
  old_status,
  new_status,
  changed_by,
  changed_at
)
SELECT 
  ko.id,
  NULL,
  ko.status,
  'system',
  ko.created_at
FROM kiosk_orders ko;

-- Delete the migrated order items from the original table
DELETE FROM order_items 
WHERE order_id IN (
  SELECT o.id 
  FROM orders o
  WHERE o.user_id = (SELECT id FROM auth.users WHERE email = 'kiosk@boki.com')
    AND o.order_type = 'pickup'
    AND o.address = 'BOKI Restaurant - Pickup'
);

-- Delete the migrated orders from the original table
DELETE FROM orders 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kiosk@boki.com')
  AND order_type = 'pickup'
  AND address = 'BOKI Restaurant - Pickup';

-- Add a comment to track the migration
COMMENT ON TABLE kiosk_orders IS 'Separate table for kiosk orders, migrated from orders table on ' || CURRENT_DATE;