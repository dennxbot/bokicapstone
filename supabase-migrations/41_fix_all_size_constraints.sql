-- Migration 41: Fix all foreign key constraints referencing size_options
-- This migration will identify and fix all tables that still reference size_options instead of food_item_sizes

-- Step 1: Show all foreign key constraints that reference size_options
DO $$
BEGIN
    RAISE NOTICE 'Current foreign key constraints referencing size_options:';
END $$;

SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'size_options';

-- Step 2: Drop specific foreign key constraints that reference size_options incorrectly
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Get specific foreign key constraints that need to be updated
    -- We only want to drop constraints for cart_items.size_option_id and order_items.size_option_id
    -- NOT kiosk_order_items.size_id which should still reference size_options
    FOR constraint_record IN
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'size_options'
          AND kcu.column_name = 'size_option_id'  -- Only size_option_id columns, not size_id
    LOOP
        RAISE NOTICE 'Dropping constraint % from table %.%', constraint_record.constraint_name, constraint_record.table_name, constraint_record.column_name;
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                      constraint_record.table_name, 
                      constraint_record.constraint_name);
    END LOOP;
END $$;

-- Step 3: Clean up invalid data in order_items
DO $$
BEGIN
    RAISE NOTICE 'Checking for invalid order_items data...';
END $$;

-- Show invalid order_items
SELECT 
    oi.id,
    oi.order_id,
    oi.food_item_id,
    oi.size_option_id,
    oi.size_name,
    'Invalid: size_option_id not in food_item_sizes' as issue
FROM order_items oi
WHERE oi.size_option_id IS NOT NULL 
  AND oi.size_option_id NOT IN (SELECT id FROM food_item_sizes);

-- Delete invalid order_items
DELETE FROM order_items 
WHERE size_option_id IS NOT NULL 
  AND size_option_id NOT IN (SELECT id FROM food_item_sizes);

-- Step 4: Clean up invalid data in cart_items (if any remain)
DO $$
BEGIN
    RAISE NOTICE 'Checking for invalid cart_items data...';
END $$;

-- Show invalid cart_items
SELECT 
    ci.id,
    ci.user_id,
    ci.food_item_id,
    ci.size_option_id,
    'Invalid: size_option_id not in food_item_sizes' as issue
FROM cart_items ci
WHERE ci.size_option_id IS NOT NULL 
  AND ci.size_option_id NOT IN (SELECT id FROM food_item_sizes);

-- Delete invalid cart_items
DELETE FROM cart_items 
WHERE size_option_id IS NOT NULL 
  AND size_option_id NOT IN (SELECT id FROM food_item_sizes);

-- Step 5: Create correct foreign key constraints
DO $$
BEGIN
    RAISE NOTICE 'Creating correct foreign key constraints...';
END $$;

-- Add correct foreign key constraint for cart_items
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_size_option_id_fkey 
FOREIGN KEY (size_option_id) REFERENCES food_item_sizes(id) ON DELETE SET NULL;

-- Add correct foreign key constraint for order_items
ALTER TABLE order_items 
ADD CONSTRAINT order_items_size_option_id_fkey 
FOREIGN KEY (size_option_id) REFERENCES food_item_sizes(id) ON DELETE SET NULL;

-- Step 6: Verify the new constraints
DO $$
BEGIN
    RAISE NOTICE 'New foreign key constraints created:';
END $$;

SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'food_item_sizes'
  AND kcu.column_name = 'size_option_id';

-- Step 7: Test the constraints with a sample query
DO $$
BEGIN
    RAISE NOTICE 'Testing constraints - checking if all size_option_id values are valid...';
END $$;

-- Test cart_items constraint
SELECT 
    'cart_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(size_option_id) as rows_with_size,
    COUNT(CASE WHEN size_option_id IS NOT NULL AND size_option_id IN (SELECT id FROM food_item_sizes) THEN 1 END) as valid_size_refs
FROM cart_items;

-- Test order_items constraint
SELECT 
    'order_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(size_option_id) as rows_with_size,
    COUNT(CASE WHEN size_option_id IS NOT NULL AND size_option_id IN (SELECT id FROM food_item_sizes) THEN 1 END) as valid_size_refs
FROM order_items;

DO $$
BEGIN
    RAISE NOTICE 'Migration 41 completed successfully!';
    RAISE NOTICE 'All foreign key constraints now reference food_item_sizes instead of size_options';
END $$;