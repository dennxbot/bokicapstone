-- BOKI Food Ordering System - Convert Currency to Philippine Peso
-- This migration converts all USD prices to PHP (1 USD = 59 PHP)

-- Update food item prices from USD to PHP
UPDATE food_items SET price = price * 59 WHERE price IS NOT NULL;

-- Update existing order amounts from USD to PHP
UPDATE orders SET total_amount = total_amount * 59 WHERE total_amount IS NOT NULL;

-- Update existing order item prices from USD to PHP
UPDATE order_items SET 
    unit_price = unit_price * 59,
    total_price = total_price * 59 
WHERE unit_price IS NOT NULL AND total_price IS NOT NULL;

-- Insert updated sample data with PHP prices
-- First, delete existing sample data to avoid conflicts
DELETE FROM order_items WHERE order_id = '880e8400-e29b-41d4-a716-446655440001';
DELETE FROM orders WHERE id = '880e8400-e29b-41d4-a716-446655440001';
DELETE FROM food_items WHERE id::text LIKE '660e8400-e29b-41d4-a716-44665544%';

-- Re-insert food items with PHP prices
INSERT INTO food_items (id, name, description, price, image_url, category_id, is_available, is_featured, preparation_time) VALUES
    -- Appetizers (converted to PHP)
    ('660e8400-e29b-41d4-a716-446655440001', 'Chicken Wings', 'Crispy chicken wings with your choice of sauce', 766.41, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400', '550e8400-e29b-41d4-a716-446655440001', true, true, 15),
    ('660e8400-e29b-41d4-a716-446655440002', 'Mozzarella Sticks', 'Golden fried mozzarella with marinara sauce', 530.41, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400', '550e8400-e29b-41d4-a716-446655440001', true, false, 10),
    ('660e8400-e29b-41d4-a716-446655440003', 'Loaded Nachos', 'Tortilla chips with cheese, jalapeños, and sour cream', 648.41, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', '550e8400-e29b-41d4-a716-446655440001', true, true, 12),
    
    -- Main Courses (converted to PHP)
    ('660e8400-e29b-41d4-a716-446655440004', 'Classic Burger', 'Beef patty with lettuce, tomato, and cheese', 884.41, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', '550e8400-e29b-41d4-a716-446655440002', true, true, 20),
    ('660e8400-e29b-41d4-a716-446655440005', 'Grilled Chicken', 'Seasoned grilled chicken breast with vegetables', 1002.41, 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400', '550e8400-e29b-41d4-a716-446655440002', true, false, 25),
    ('660e8400-e29b-41d4-a716-446655440006', 'Fish and Chips', 'Beer-battered fish with crispy fries', 943.41, 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400', '550e8400-e29b-41d4-a716-446655440002', true, true, 18),
    ('660e8400-e29b-41d4-a716-446655440007', 'Pasta Carbonara', 'Creamy pasta with bacon and parmesan', 825.41, 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400', '550e8400-e29b-41d4-a716-446655440002', true, false, 15),
    
    -- Desserts (converted to PHP)
    ('660e8400-e29b-41d4-a716-446655440008', 'Chocolate Cake', 'Rich chocolate cake with chocolate frosting', 412.41, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', '550e8400-e29b-41d4-a716-446655440003', true, true, 5),
    ('660e8400-e29b-41d4-a716-446655440009', 'Ice Cream Sundae', 'Vanilla ice cream with toppings', 353.41, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', '550e8400-e29b-41d4-a716-446655440003', true, false, 3),
    ('660e8400-e29b-41d4-a716-446655440010', 'Cheesecake', 'New York style cheesecake with berry sauce', 471.41, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400', '550e8400-e29b-41d4-a716-446655440003', true, true, 5),
    
    -- Beverages (converted to PHP)
    ('660e8400-e29b-41d4-a716-446655440011', 'Fresh Lemonade', 'Freshly squeezed lemonade', 235.41, 'https://images.unsplash.com/photo-1523371683702-af5cd0d447c9?w=400', '550e8400-e29b-41d4-a716-446655440004', true, false, 2),
    ('660e8400-e29b-41d4-a716-446655440012', 'Iced Coffee', 'Cold brew coffee with ice', 294.41, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', '550e8400-e29b-41d4-a716-446655440004', true, true, 3),
    ('660e8400-e29b-41d4-a716-446655440013', 'Soft Drinks', 'Coca-Cola, Pepsi, Sprite, and more', 176.41, 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400', '550e8400-e29b-41d4-a716-446655440004', true, false, 1),
    
    -- Salads (converted to PHP)
    ('660e8400-e29b-41d4-a716-446655440014', 'Caesar Salad', 'Romaine lettuce with Caesar dressing and croutons', 589.41, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', '550e8400-e29b-41d4-a716-446655440005', true, true, 8),
    ('660e8400-e29b-41d4-a716-446655440015', 'Greek Salad', 'Mixed greens with feta cheese and olives', 648.41, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400', '550e8400-e29b-41d4-a716-446655440005', true, false, 10);

-- Re-insert sample order with PHP amounts
INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, customer_address, order_type, payment_method, status, total_amount, notes) VALUES
    ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'John Doe', 'customer@example.com', '+1987654321', '456 Customer Ave, City, State', 'delivery', 'cash', 'completed', 1768.23, 'Please ring the doorbell');

-- Insert sample order items with PHP prices
INSERT INTO order_items (id, order_id, food_item_id, quantity, unit_price, total_price) VALUES
    ('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', 1, 884.41, 884.41),
    ('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440012', 2, 294.41, 588.82),
    ('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440008', 1, 412.41, 412.41);

-- Insert order status history with PHP amounts
INSERT INTO order_status_history (id, order_id, status, notes, created_at) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'pending', 'Order placed - Total: ₱1,768.23', NOW() - INTERVAL '2 hours'),
    ('aa0e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 'preparing', 'Order confirmed by restaurant', NOW() - INTERVAL '1 hour 45 minutes'),
    ('aa0e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001', 'preparing', 'Kitchen started preparing your order', NOW() - INTERVAL '1 hour 30 minutes'),
    ('aa0e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001', 'ready', 'Order ready for pickup/delivery', NOW() - INTERVAL '30 minutes'),
    ('aa0e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440001', 'completed', 'Order delivered successfully', NOW() - INTERVAL '5 minutes');