-- Migration: Verify and fix the cart_items.size_option_id constraint
    -- This migration checks the current constraint and ensures it points to food_item_sizes

    -- First, let's see what constraints currently exist
    DO $$
    DECLARE
        constraint_info RECORD;
    BEGIN
        RAISE NOTICE 'Current foreign key constraints on cart_items.size_option_id:';
        
        FOR constraint_info IN
            SELECT 
                tc.constraint_name,
                ccu.table_name as referenced_table,
                ccu.column_name as referenced_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'cart_items' 
                AND kcu.column_name = 'size_option_id'
                AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
            RAISE NOTICE 'Constraint: % -> %.%', 
                constraint_info.constraint_name, 
                constraint_info.referenced_table, 
                constraint_info.referenced_column;
        END LOOP;
    END $$;

    -- Drop ALL existing foreign key constraints on size_option_id
    DO $$
    DECLARE
        constraint_name TEXT;
    BEGIN
        FOR constraint_name IN
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'cart_items' 
                AND kcu.column_name = 'size_option_id'
                AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
            EXECUTE 'ALTER TABLE cart_items DROP CONSTRAINT ' || constraint_name;
            RAISE NOTICE 'Dropped constraint: %', constraint_name;
        END LOOP;
    END $$;

    -- Add the correct constraint
ALTER TABLE cart_items 
ADD CONSTRAINT cart_items_size_option_id_fkey 
FOREIGN KEY (size_option_id) REFERENCES food_item_sizes(id) ON DELETE SET NULL;

DO $$
BEGIN
    RAISE NOTICE 'Added new constraint: cart_items_size_option_id_fkey -> food_item_sizes(id)';
END $$;

    -- Verify the new constraint
    DO $$
    DECLARE
        constraint_exists BOOLEAN;
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'cart_items' 
                AND kcu.column_name = 'size_option_id'
                AND tc.constraint_type = 'FOREIGN KEY'
                AND ccu.table_name = 'food_item_sizes'
                AND ccu.column_name = 'id'
        ) INTO constraint_exists;
        
        IF constraint_exists THEN
            RAISE NOTICE 'SUCCESS: Foreign key constraint now correctly references food_item_sizes(id)';
        ELSE
            RAISE EXCEPTION 'FAILED: Could not create the correct foreign key constraint';
        END IF;
    END $$;