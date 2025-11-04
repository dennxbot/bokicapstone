-- Test the kiosk_order_items -> size_options relationship
-- This will help verify that PostgREST can resolve the foreign key relationship

-- Show current foreign key constraints for kiosk_order_items
SELECT 
    'Current kiosk_order_items constraints:' as info,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'kiosk_order_items';

-- Test if we can join kiosk_order_items with size_options
SELECT 
    'Test join result:' as info,
    COUNT(*) as total_kiosk_items,
    COUNT(so.id) as items_with_size,
    COUNT(CASE WHEN koi.size_id IS NOT NULL AND so.id IS NULL THEN 1 END) as invalid_size_refs
FROM kiosk_order_items koi
LEFT JOIN size_options so ON koi.size_id = so.id;

-- Show sample data to verify the relationship
SELECT 
    'Sample kiosk_order_items with sizes:' as info,
    koi.id as kiosk_item_id,
    koi.size_id,
    so.name as size_name,
    CASE 
        WHEN koi.size_id IS NULL THEN 'No size'
        WHEN so.id IS NOT NULL THEN 'Valid size reference'
        ELSE 'Invalid size reference'
    END as status
FROM kiosk_order_items koi
LEFT JOIN size_options so ON koi.size_id = so.id
LIMIT 5;

-- Notify about PostgREST schema cache
DO $$
BEGIN
    RAISE NOTICE '=== IMPORTANT ===';
    RAISE NOTICE 'After running this migration, you may need to reload PostgREST schema cache';
    RAISE NOTICE 'In Supabase dashboard, go to Settings > API > Schema cache and click "Reload schema"';
    RAISE NOTICE 'Or the cache will automatically refresh within a few minutes';
END $$;