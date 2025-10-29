-- Migration: Add size-related columns to cart_items table
-- This migration adds support for storing size information and calculated prices in cart items

-- Add size-related columns to cart_items table
ALTER TABLE cart_items 
ADD COLUMN size_option_id UUID REFERENCES food_item_sizes(id) ON DELETE SET NULL,
ADD COLUMN size_name VARCHAR(100),
ADD COLUMN size_multiplier DECIMAL(3,2),
ADD COLUMN calculated_price DECIMAL(10,2);

-- Update the unique constraint to include size_option_id
-- This allows the same food item with different sizes to be in the cart
ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_food_item_id_key;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_id_food_item_id_size_key 
    UNIQUE(user_id, food_item_id, size_option_id);

-- Add comments for documentation
COMMENT ON COLUMN cart_items.size_option_id IS 'Reference to the selected size option for this cart item';
COMMENT ON COLUMN cart_items.size_name IS 'Name of the selected size (e.g., Small, Medium, Large)';
COMMENT ON COLUMN cart_items.size_multiplier IS 'Price multiplier for the selected size';
COMMENT ON COLUMN cart_items.calculated_price IS 'Final calculated price including size adjustments';

-- Create index for better query performance
CREATE INDEX idx_cart_items_size_option ON cart_items(size_option_id);