-- Migration: Add calculated_price column to cart_items table
-- This migration safely adds only the missing calculated_price column

-- Add calculated_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' 
        AND column_name = 'calculated_price'
    ) THEN
        ALTER TABLE cart_items 
        ADD COLUMN calculated_price DECIMAL(10,2);
        
        -- Add comment for the new column
        COMMENT ON COLUMN cart_items.calculated_price IS 'Final calculated price including size multiplier';
        
        RAISE NOTICE 'Added calculated_price column to cart_items table';
    ELSE
        RAISE NOTICE 'calculated_price column already exists in cart_items table';
    END IF;
END $$;

-- Update the unique constraint to include size_option_id if not already updated
DO $$
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_items_user_id_food_item_id_key' 
        AND table_name = 'cart_items'
    ) THEN
        ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_food_item_id_key;
        RAISE NOTICE 'Dropped old unique constraint';
    END IF;
    
    -- Add the new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_items_user_food_size_unique' 
        AND table_name = 'cart_items'
    ) THEN
        ALTER TABLE cart_items 
        ADD CONSTRAINT cart_items_user_food_size_unique 
        UNIQUE (user_id, food_item_id, size_option_id);
        
        RAISE NOTICE 'Added new unique constraint including size_option_id';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Create index for better performance if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_cart_items_size_option'
    ) THEN
        CREATE INDEX idx_cart_items_size_option ON cart_items(size_option_id);
        RAISE NOTICE 'Created index on size_option_id';
    ELSE
        RAISE NOTICE 'Index on size_option_id already exists';
    END IF;
END $$;