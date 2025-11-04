-- Migration: Fix conflicting foreign key constraint for cart_items.size_option_id
-- This migration resolves the conflict between migrations 07 and 15 where size_option_id
-- was defined to reference both size_options(id) and food_item_sizes(id)

-- First, check what constraint currently exists and drop it
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the current foreign key constraint on size_option_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'cart_items' 
        AND kcu.column_name = 'size_option_id'
        AND tc.constraint_type = 'FOREIGN KEY';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE cart_items DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped existing foreign key constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No existing foreign key constraint found on cart_items.size_option_id';
    END IF;
END $$;

-- Add the correct foreign key constraint
-- Based on the code analysis, cart_items.size_option_id should reference food_item_sizes(id)
-- because that's what the application code is using (selectedSize.id from food_item_sizes table)
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_size_option_id_fkey 
FOREIGN KEY (size_option_id) REFERENCES food_item_sizes(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON CONSTRAINT cart_items_size_option_id_fkey ON cart_items IS 
'References food_item_sizes(id) - the specific size configuration for a food item';

-- Verify the constraint was added correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'cart_items' 
            AND kcu.column_name = 'size_option_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'food_item_sizes'
    ) THEN
        RAISE NOTICE 'Successfully created foreign key constraint: cart_items.size_option_id -> food_item_sizes(id)';
    ELSE
        RAISE EXCEPTION 'Failed to create the correct foreign key constraint';
    END IF;
END $$;