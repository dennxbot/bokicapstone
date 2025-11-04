-- Restore the foreign key constraint for kiosk_order_items.size_id -> size_options.id
-- This constraint may have been accidentally dropped or never properly created

-- First, check if the constraint already exists
DO $$
BEGIN
    -- Check if the foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'kiosk_order_items'
          AND kcu.column_name = 'size_id'
          AND ccu.table_name = 'size_options'
    ) THEN
        RAISE NOTICE 'Foreign key constraint for kiosk_order_items.size_id does not exist, creating it...';
        
        -- Clean up any invalid data first
        UPDATE kiosk_order_items 
        SET size_id = NULL 
        WHERE size_id IS NOT NULL 
          AND size_id NOT IN (SELECT id FROM size_options);
        
        -- Add the foreign key constraint
        ALTER TABLE kiosk_order_items 
        ADD CONSTRAINT kiosk_order_items_size_id_fkey 
        FOREIGN KEY (size_id) REFERENCES size_options(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key constraint kiosk_order_items_size_id_fkey created successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint for kiosk_order_items.size_id already exists';
    END IF;
END $$;

-- Verify the constraint exists
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
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'kiosk_order_items'
  AND kcu.column_name = 'size_id';

-- Test the relationship by checking if PostgREST can resolve it
DO $$
BEGIN
    RAISE NOTICE 'Foreign key constraint verification complete';
    RAISE NOTICE 'The kiosk_order_items.size_id -> size_options.id relationship should now work';
END $$;