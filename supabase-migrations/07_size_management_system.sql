-- Size Management System Migration
-- This migration creates the size management tables and functions

-- Create size_options table
CREATE TABLE size_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (price_multiplier > 0),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food_item_sizes table (junction table)
CREATE TABLE food_item_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    size_option_id UUID NOT NULL REFERENCES size_options(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    custom_price_multiplier DECIMAL(3,2) CHECK (custom_price_multiplier > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(food_item_id, size_option_id)
);

-- Add size-related columns to order_items table
ALTER TABLE order_items ADD COLUMN size_option_id UUID REFERENCES size_options(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN size_name VARCHAR(50);
ALTER TABLE order_items ADD COLUMN size_multiplier DECIMAL(3,2) DEFAULT 1.00;

-- Add size-related columns to cart_items table
ALTER TABLE cart_items ADD COLUMN size_option_id UUID REFERENCES size_options(id) ON DELETE SET NULL;
ALTER TABLE cart_items ADD COLUMN size_name VARCHAR(50);
ALTER TABLE cart_items ADD COLUMN size_multiplier DECIMAL(3,2) DEFAULT 1.00;

-- Update the unique constraint on cart_items to include size
-- First check if the constraint exists before dropping it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_items_user_id_food_item_id_key' 
        AND table_name = 'cart_items'
    ) THEN
        ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_food_item_id_key;
    END IF;
END $$;

ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_food_item_id_size_key 
    UNIQUE(user_id, food_item_id, size_option_id);

-- Create indexes for better performance
CREATE INDEX idx_size_options_active ON size_options(is_active);
CREATE INDEX idx_size_options_sort_order ON size_options(sort_order);
CREATE INDEX idx_food_item_sizes_food_item ON food_item_sizes(food_item_id);
CREATE INDEX idx_food_item_sizes_size_option ON food_item_sizes(size_option_id);
CREATE INDEX idx_food_item_sizes_available ON food_item_sizes(is_available);
CREATE INDEX idx_order_items_size_option ON order_items(size_option_id);
CREATE INDEX idx_cart_items_size_option ON cart_items(size_option_id);

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_size_options_updated_at BEFORE UPDATE ON size_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_item_sizes_updated_at BEFORE UPDATE ON food_item_sizes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get food item sizes with calculated prices
CREATE OR REPLACE FUNCTION get_food_item_sizes(item_id UUID)
RETURNS TABLE (
    size_id UUID,
    size_name VARCHAR(50),
    size_description TEXT,
    price_multiplier DECIMAL(3,2),
    is_available BOOLEAN,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        so.id as size_id,
        so.name as size_name,
        so.description as size_description,
        COALESCE(fis.custom_price_multiplier, so.price_multiplier) as price_multiplier,
        fis.is_available,
        so.sort_order
    FROM size_options so
    INNER JOIN food_item_sizes fis ON so.id = fis.size_option_id
    WHERE fis.food_item_id = item_id
        AND so.is_active = true
        AND fis.is_available = true
    ORDER BY so.sort_order, so.name;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate item price with size
CREATE OR REPLACE FUNCTION calculate_item_price_with_size(item_id UUID, size_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    base_price DECIMAL(10,2);
    multiplier DECIMAL(3,2);
BEGIN
    -- Get base price of the food item
    SELECT price INTO base_price FROM food_items WHERE id = item_id;
    
    -- Get price multiplier (custom or default)
    SELECT COALESCE(fis.custom_price_multiplier, so.price_multiplier) INTO multiplier
    FROM food_item_sizes fis
    INNER JOIN size_options so ON fis.size_option_id = so.id
    WHERE fis.food_item_id = item_id AND fis.size_option_id = size_id;
    
    -- Return calculated price
    RETURN ROUND(base_price * multiplier, 2);
END;
$$ LANGUAGE plpgsql;

-- Insert default size options
INSERT INTO size_options (name, description, price_multiplier, sort_order) VALUES
('Regular', 'Standard size', 1.00, 1),
('Large', 'Larger portion', 1.25, 2),
('Extra Large', 'Biggest size available', 1.50, 3);

-- Auto-assign default size (Regular) to all existing food items
INSERT INTO food_item_sizes (food_item_id, size_option_id, is_available)
SELECT 
    fi.id,
    so.id,
    true
FROM food_items fi
CROSS JOIN size_options so
WHERE so.name = 'Regular'
ON CONFLICT (food_item_id, size_option_id) DO NOTHING;