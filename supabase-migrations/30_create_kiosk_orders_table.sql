-- Create kiosk-specific order status enum
CREATE TYPE kiosk_order_status AS ENUM (
  'pending_payment',    -- Order placed, awaiting payment at cashier
  'payment_received',   -- Payment confirmed by cashier
  'preparing',          -- Being prepared in kitchen
  'ready',             -- Ready for pickup
  'completed',         -- Order completed/picked up
  'cancelled'          -- Order cancelled
);

-- Create kiosk_orders table
CREATE TABLE kiosk_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  status kiosk_order_status NOT NULL DEFAULT 'pending_payment',
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes for performance
  CONSTRAINT kiosk_orders_total_amount_positive CHECK (total_amount > 0)
);

-- Create kiosk_order_items table for order line items
CREATE TABLE kiosk_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_order_id UUID NOT NULL REFERENCES kiosk_orders(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES food_items(id),
  size_id UUID REFERENCES size_options(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT kiosk_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT kiosk_order_items_unit_price_positive CHECK (unit_price > 0),
  CONSTRAINT kiosk_order_items_total_price_positive CHECK (total_price > 0)
);

-- Create kiosk_order_status_history table for audit trail
CREATE TABLE kiosk_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_order_id UUID NOT NULL REFERENCES kiosk_orders(id) ON DELETE CASCADE,
  old_status kiosk_order_status,
  new_status kiosk_order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_kiosk_orders_status ON kiosk_orders(status);
CREATE INDEX idx_kiosk_orders_created_at ON kiosk_orders(created_at);
CREATE INDEX idx_kiosk_orders_order_number ON kiosk_orders(order_number);
CREATE INDEX idx_kiosk_order_items_kiosk_order_id ON kiosk_order_items(kiosk_order_id);
CREATE INDEX idx_kiosk_order_status_history_kiosk_order_id ON kiosk_order_status_history(kiosk_order_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_kiosk_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kiosk_orders_updated_at
  BEFORE UPDATE ON kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_kiosk_orders_updated_at();

-- Create trigger to log status changes
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
        WHEN NEW.status = 'preparing' THEN 'Order sent to kitchen'
        WHEN NEW.status = 'ready' THEN 'Order ready for pickup'
        WHEN NEW.status = 'completed' THEN 'Order completed'
        ELSE NULL
      END
    );
    
    -- Set completed_at timestamp when order is completed
    IF NEW.status = 'completed' THEN
      NEW.completed_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_kiosk_order_status_change
  BEFORE UPDATE ON kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_kiosk_order_status_change();

-- Create function to generate kiosk order numbers
CREATE OR REPLACE FUNCTION generate_kiosk_order_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  sequence_part TEXT;
  next_number INTEGER;
BEGIN
  -- Get current date in YYMMDD format
  date_part := TO_CHAR(NOW(), 'YYMMDD');
  
  -- Get the next sequence number for today
  SELECT COALESCE(MAX(CAST(RIGHT(order_number, 3) AS INTEGER)), 0) + 1
  INTO next_number
  FROM kiosk_orders
  WHERE order_number LIKE 'KS' || date_part || '%';
  
  -- Format sequence number with leading zeros
  sequence_part := LPAD(next_number::TEXT, 3, '0');
  
  -- Return formatted order number (e.g., KS240101001)
  RETURN 'KS' || date_part || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_kiosk_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_kiosk_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_kiosk_order_number
  BEFORE INSERT ON kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_kiosk_order_number();