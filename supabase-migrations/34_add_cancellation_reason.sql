-- Migration: Add cancellation reason fields to orders and kiosk_orders tables

-- Create enum for cancellation reasons
CREATE TYPE cancellation_reason AS ENUM (
  'unpaid_orders',
  'incorrect_orders',
  'duplicate_transactions',
  'unavailable_items',
  'customer_change_of_mind',
  'cashier_verification_errors',
  'abandoned_transactions',
  'system_or_printer_errors',
  'data_accuracy_issues',
  'wrong_order_paid'
);

-- Add cancellation_reason column to orders table
ALTER TABLE orders 
ADD COLUMN cancellation_reason cancellation_reason,
ADD COLUMN cancellation_notes TEXT;

-- Add cancellation_reason column to kiosk_orders table
ALTER TABLE kiosk_orders 
ADD COLUMN cancellation_reason cancellation_reason,
ADD COLUMN cancellation_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN orders.cancellation_reason IS 'Reason for order cancellation when status is cancelled';
COMMENT ON COLUMN orders.cancellation_notes IS 'Additional notes for order cancellation';
COMMENT ON COLUMN kiosk_orders.cancellation_reason IS 'Reason for order cancellation when status is cancelled';
COMMENT ON COLUMN kiosk_orders.cancellation_notes IS 'Additional notes for order cancellation';

-- Create indexes for better query performance
CREATE INDEX idx_orders_cancellation_reason ON orders(cancellation_reason) WHERE cancellation_reason IS NOT NULL;
CREATE INDEX idx_kiosk_orders_cancellation_reason ON kiosk_orders(cancellation_reason) WHERE cancellation_reason IS NOT NULL;