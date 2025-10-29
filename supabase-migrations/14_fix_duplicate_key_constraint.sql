-- Fix Duplicate Key Constraint Migration
-- This migration creates an upsert function to handle duplicate key violations
-- when editing menu item sizes

-- Create upsert function for food_item_sizes to handle duplicate key violations
CREATE OR REPLACE FUNCTION upsert_food_item_sizes(assignments jsonb)
RETURNS void AS $$
DECLARE
    assignment jsonb;
BEGIN
    -- Loop through each assignment in the JSON array
    FOR assignment IN SELECT * FROM jsonb_array_elements(assignments)
    LOOP
        -- Use INSERT ... ON CONFLICT to handle duplicates
        INSERT INTO food_item_sizes (food_item_id, size_option_id, is_available)
        VALUES (
            (assignment->>'food_item_id')::uuid,
            (assignment->>'size_option_id')::uuid,
            (assignment->>'is_available')::boolean
        )
        ON CONFLICT (food_item_id, size_option_id) 
        DO UPDATE SET 
            is_available = EXCLUDED.is_available,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_food_item_sizes(jsonb) TO authenticated;

-- Create a simpler upsert function for single assignments
CREATE OR REPLACE FUNCTION upsert_single_food_item_size(
    p_food_item_id UUID,
    p_size_option_id UUID,
    p_is_available BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
    INSERT INTO food_item_sizes (food_item_id, size_option_id, is_available)
    VALUES (p_food_item_id, p_size_option_id, p_is_available)
    ON CONFLICT (food_item_id, size_option_id) 
    DO UPDATE SET 
        is_available = EXCLUDED.is_available,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_single_food_item_size(UUID, UUID, BOOLEAN) TO authenticated;