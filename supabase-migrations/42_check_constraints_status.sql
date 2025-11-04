-- Diagnostic query to check current foreign key constraints
-- This will help us understand what constraints are currently in place

-- Check all foreign key constraints related to size tables
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
  AND (ccu.table_name IN ('size_options', 'food_item_sizes') 
       OR tc.table_name IN ('cart_items', 'order_items', 'kiosk_order_items'))
ORDER BY tc.table_name, tc.constraint_name;

-- Check if there are any cart_items with invalid size_option_id
SELECT 
    'cart_items_invalid_data' as check_type,
    COUNT(*) as count,
    'size_option_id not in food_item_sizes' as issue
FROM cart_items 
WHERE size_option_id IS NOT NULL 
  AND size_option_id NOT IN (SELECT id FROM food_item_sizes);

-- Check if there are any cart_items with size_option_id that exists in size_options but not food_item_sizes
SELECT 
    'cart_items_size_options_mismatch' as check_type,
    COUNT(*) as count,
    'size_option_id in size_options but not in food_item_sizes' as issue
FROM cart_items ci
WHERE ci.size_option_id IS NOT NULL 
  AND ci.size_option_id IN (SELECT id FROM size_options)
  AND ci.size_option_id NOT IN (SELECT id FROM food_item_sizes);

-- Show sample of problematic cart_items
SELECT 
    ci.id,
    ci.user_id,
    ci.food_item_id,
    ci.size_option_id,
    ci.size_name,
    so.name as size_options_name,
    CASE 
        WHEN ci.size_option_id IN (SELECT id FROM food_item_sizes) THEN 'Valid in food_item_sizes'
        WHEN ci.size_option_id IN (SELECT id FROM size_options) THEN 'Only in size_options'
        ELSE 'Not found anywhere'
    END as status
FROM cart_items ci
LEFT JOIN size_options so ON ci.size_option_id = so.id
WHERE ci.size_option_id IS NOT NULL
LIMIT 10;