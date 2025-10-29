-- Insert Size Data Migration
-- This migration inserts size options and food item sizes data

-- Insert default size options
INSERT INTO size_options (name, description, price_multiplier, sort_order) VALUES
('Small', 'Small portion', 0.8, 1),
('Medium', 'Regular portion', 1.0, 2),
('Large', 'Large portion', 1.3, 3)
ON CONFLICT DO NOTHING;

-- Auto-assign all sizes to all existing food items
INSERT INTO food_item_sizes (food_item_id, size_option_id, is_available)
SELECT 
    fi.id,
    so.id,
    true
FROM food_items fi
CROSS JOIN size_options so
ON CONFLICT (food_item_id, size_option_id) DO NOTHING;