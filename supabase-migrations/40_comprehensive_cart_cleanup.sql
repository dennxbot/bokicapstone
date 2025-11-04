-- Migration: Comprehensive cleanup of invalid cart_items data
-- This migration identifies and removes cart_items with invalid size_option_id values

-- Step 1: Check current constraint status
DO $$
DECLARE
    constraint_info RECORD;
    constraint_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== CURRENT CONSTRAINT STATUS ===';
    
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
        constraint_count := constraint_count + 1;
    END LOOP;
    
    IF constraint_count = 0 THEN
        RAISE NOTICE 'No foreign key constraints found on cart_items.size_option_id';
    END IF;
END $$;

-- Step 2: Identify invalid cart_items
DO $$
DECLARE
    invalid_count INTEGER;
    invalid_record RECORD;
BEGIN
    RAISE NOTICE '=== IDENTIFYING INVALID CART ITEMS ===';
    
    -- Count invalid entries
    SELECT COUNT(*) INTO invalid_count
    FROM cart_items ci
    WHERE ci.size_option_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM food_item_sizes fis 
            WHERE fis.id = ci.size_option_id
        );
    
    RAISE NOTICE 'Found % invalid cart_items with non-existent size_option_id', invalid_count;
    
    -- Show details of invalid entries (limit to 10 for readability)
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Details of invalid entries (showing up to 10):';
        FOR invalid_record IN
            SELECT ci.id, ci.user_id, ci.food_item_id, ci.size_option_id, ci.created_at
            FROM cart_items ci
            WHERE ci.size_option_id IS NOT NULL 
                AND NOT EXISTS (
                    SELECT 1 FROM food_item_sizes fis 
                    WHERE fis.id = ci.size_option_id
                )
            ORDER BY ci.created_at DESC
            LIMIT 10
        LOOP
            RAISE NOTICE 'Cart Item ID: %, User: %, Food Item: %, Invalid Size Option ID: %, Created: %',
                invalid_record.id,
                invalid_record.user_id,
                invalid_record.food_item_id,
                invalid_record.size_option_id,
                invalid_record.created_at;
        END LOOP;
    END IF;
END $$;

-- Step 3: Clean up invalid cart_items
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '=== CLEANING UP INVALID CART ITEMS ===';
    
    -- Delete cart_items with invalid size_option_id
    WITH deleted_items AS (
        DELETE FROM cart_items 
        WHERE size_option_id IS NOT NULL 
            AND NOT EXISTS (
                SELECT 1 FROM food_item_sizes fis 
                WHERE fis.id = size_option_id
            )
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted_items;
    
    RAISE NOTICE 'Deleted % invalid cart_items', deleted_count;
END $$;

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_invalid INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFYING CLEANUP ===';
    
    SELECT COUNT(*) INTO remaining_invalid
    FROM cart_items ci
    WHERE ci.size_option_id IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM food_item_sizes fis 
            WHERE fis.id = ci.size_option_id
        );
    
    IF remaining_invalid = 0 THEN
        RAISE NOTICE 'SUCCESS: All invalid cart_items have been cleaned up';
    ELSE
        RAISE NOTICE 'WARNING: % invalid cart_items still remain', remaining_invalid;
    END IF;
END $$;

-- Step 5: Test constraint by attempting a sample operation
DO $$
BEGIN
    RAISE NOTICE '=== TESTING CONSTRAINT ===';
    
    -- Try to insert a cart_item with a non-existent size_option_id (should fail)
    BEGIN
        INSERT INTO cart_items (user_id, food_item_id, size_option_id, quantity)
        VALUES (
            (SELECT id FROM auth.users LIMIT 1),
            (SELECT id FROM food_items LIMIT 1),
            '00000000-0000-0000-0000-000000000000'::uuid,
            1
        );
        
        -- If we get here, the constraint is not working
        RAISE NOTICE 'ERROR: Constraint is not working - invalid insert succeeded';
        
        -- Clean up the test insert
        DELETE FROM cart_items WHERE size_option_id = '00000000-0000-0000-0000-000000000000'::uuid;
        
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'SUCCESS: Foreign key constraint is working correctly';
    END;
END $$;