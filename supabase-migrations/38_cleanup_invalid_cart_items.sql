-- Migration: Clean up invalid cart_items data
-- This migration removes cart items with invalid size_option_id references
-- that don't exist in the food_item_sizes table

-- First, let's see what invalid data we have
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM cart_items ci
    WHERE ci.size_option_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM food_item_sizes fis 
        WHERE fis.id = ci.size_option_id
    );
    
    RAISE NOTICE 'Found % cart items with invalid size_option_id references', invalid_count;
END $$;

-- Clean up invalid cart items
-- Option 1: Delete cart items with invalid size references
DELETE FROM cart_items 
WHERE size_option_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM food_item_sizes 
    WHERE id = cart_items.size_option_id
);

-- Log the cleanup
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count FROM cart_items;
    RAISE NOTICE 'Cleanup complete. Remaining cart items: %', remaining_count;
    
    -- Verify no invalid references remain
    SELECT COUNT(*) INTO remaining_count
    FROM cart_items ci
    WHERE ci.size_option_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 FROM food_item_sizes fis 
        WHERE fis.id = ci.size_option_id
    );
    
    IF remaining_count = 0 THEN
        RAISE NOTICE 'All invalid references have been cleaned up successfully';
    ELSE
        RAISE EXCEPTION 'Still have % invalid references after cleanup', remaining_count;
    END IF;
END $$;