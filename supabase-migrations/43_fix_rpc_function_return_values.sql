-- Fix the get_food_item_sizes RPC function to return food_item_sizes.id instead of size_options.id
-- This ensures that the frontend gets the correct ID values that match the foreign key constraints

CREATE OR REPLACE FUNCTION get_food_item_sizes(item_id UUID)
RETURNS TABLE (
    size_id UUID,
    size_name VARCHAR(50),
    size_description TEXT,
    price_multiplier DECIMAL(3,2),
    is_available BOOLEAN,
    sort_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fis.id as size_id,  -- Return food_item_sizes.id instead of size_options.id
        so.name as size_name,
        so.description as size_description,
        COALESCE(fis.custom_price_multiplier, so.price_multiplier) as price_multiplier,
        fis.is_available,
        so.sort_order
    FROM size_options so
    INNER JOIN food_item_sizes fis ON so.id = fis.size_option_id
    WHERE fis.food_item_id = item_id
        AND so.is_active = true
        AND fis.is_available = true
    ORDER BY so.sort_order, so.name;
END;
$$ LANGUAGE plpgsql;

-- Test the function to ensure it returns food_item_sizes.id values
DO $$
BEGIN
    RAISE NOTICE 'Testing get_food_item_sizes function...';
    RAISE NOTICE 'Function updated to return food_item_sizes.id instead of size_options.id';
END $$;