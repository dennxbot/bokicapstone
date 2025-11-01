-- Migration: Create user_favorites table for storing user's favorite food items
-- This migration creates a table to store which food items users have marked as favorites

-- Create user_favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_food_item_id ON user_favorites(food_item_id);

-- Create unique constraint to prevent duplicate favorites
CREATE UNIQUE INDEX idx_user_favorites_unique 
ON user_favorites(user_id, food_item_id);

-- Add comments for documentation
COMMENT ON TABLE user_favorites IS 'Stores user favorite food items';
COMMENT ON COLUMN user_favorites.user_id IS 'Reference to the user who favorited the item';
COMMENT ON COLUMN user_favorites.food_item_id IS 'Reference to the favorited food item';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_favorites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_favorites_updated_at
    BEFORE UPDATE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_user_favorites_updated_at();

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_favorites table
-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites" ON user_favorites
    FOR SELECT USING (user_id = get_current_user_id());

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites" ON user_favorites
    FOR SELECT USING (get_current_user_role() = 'admin');

-- Users can add their own favorites
CREATE POLICY "Users can add their own favorites" ON user_favorites
    FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- Admins can add favorites for any user
CREATE POLICY "Admins can add favorites for any user" ON user_favorites
    FOR INSERT WITH CHECK (get_current_user_role() = 'admin');

-- Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites" ON user_favorites
    FOR DELETE USING (user_id = get_current_user_id());

-- Admins can remove any favorites
CREATE POLICY "Admins can remove any favorites" ON user_favorites
    FOR DELETE USING (get_current_user_role() = 'admin');

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(
    p_user_id UUID,
    p_food_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = p_user_id AND food_item_id = p_food_item_id
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- Remove from favorites
        DELETE FROM user_favorites 
        WHERE user_id = p_user_id AND food_item_id = p_food_item_id;
        RETURN FALSE; -- Removed from favorites
    ELSE
        -- Add to favorites
        INSERT INTO user_favorites (user_id, food_item_id)
        VALUES (p_user_id, p_food_item_id);
        RETURN TRUE; -- Added to favorites
    END IF;
END;
$$;

-- Function to check if item is favorited by user
CREATE OR REPLACE FUNCTION is_favorite(
    p_user_id UUID,
    p_food_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM user_favorites 
        WHERE user_id = p_user_id AND food_item_id = p_food_item_id
    );
END;
$$;

-- Function to get user's favorites count
CREATE OR REPLACE FUNCTION get_user_favorites_count(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM user_favorites 
        WHERE user_id = p_user_id
    );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION toggle_favorite(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_favorite(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorites_count(UUID) TO authenticated;