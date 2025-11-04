-- Migration 46: Restore foreign key between food_item_sizes and size_options
-- Context: Admin Menu page nests `food_item_sizes(size_option:size_options(...), is_available)`.
-- PostgREST requires a FK `food_item_sizes.size_option_id -> size_options.id` to resolve this relationship.
-- A previous migration appears to have dropped this FK, causing 400 (PGRST200) errors.

DO $$
BEGIN
    RAISE NOTICE 'Checking FK food_item_sizes.size_option_id -> size_options.id...';

    -- If the FK does not exist, create it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'food_item_sizes'
          AND kcu.column_name = 'size_option_id'
          AND ccu.table_name = 'size_options'
          AND ccu.column_name = 'id'
    ) THEN
        -- Clean up any invalid rows to avoid FK creation failure
        RAISE NOTICE 'Cleaning up invalid food_item_sizes rows referencing non-existent size_options...';
        DELETE FROM food_item_sizes fis
        WHERE NOT EXISTS (
            SELECT 1 FROM size_options so WHERE so.id = fis.size_option_id
        );

        RAISE NOTICE 'Creating FK food_item_sizes_size_option_id_fkey...';
        ALTER TABLE food_item_sizes 
        ADD CONSTRAINT food_item_sizes_size_option_id_fkey 
        FOREIGN KEY (size_option_id) REFERENCES size_options(id) ON DELETE CASCADE;
        RAISE NOTICE 'FK created successfully.';
    ELSE
        RAISE NOTICE 'FK already exists; no changes needed.';
    END IF;
END $$;

-- Verify the relationship is visible to PostgREST/Supabase
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name = 'food_item_sizes'
  AND kcu.column_name = 'size_option_id';

DO $$
BEGIN
    RAISE NOTICE 'Migration 46 complete: FK food_item_sizes.size_option_id -> size_options.id ensured.';
END $$;