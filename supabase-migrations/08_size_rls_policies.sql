-- Size Management RLS Policies Migration
-- This migration adds Row Level Security policies for size-related tables

-- Enable RLS on size-related tables
ALTER TABLE size_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_item_sizes ENABLE ROW LEVEL SECURITY;

-- Size options policies (public read, admin write)
CREATE POLICY "Anyone can view active size options" ON size_options
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all size options" ON size_options
    FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage size options" ON size_options
    FOR ALL USING (get_current_user_role() = 'admin');

-- Food item sizes policies (public read for available sizes, admin write)
CREATE POLICY "Anyone can view available food item sizes" ON food_item_sizes
    FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can view all food item sizes" ON food_item_sizes
    FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage food item sizes" ON food_item_sizes
    FOR ALL USING (get_current_user_role() = 'admin');