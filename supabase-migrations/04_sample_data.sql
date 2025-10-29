-- BOKI Food Ordering System - Sample Data
-- This migration inserts sample data for testing and development

-- Insert sample categories
INSERT INTO categories (id, name, description, image_url, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Appetizers', 'Start your meal with our delicious appetizers', 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'Main Courses', 'Hearty and satisfying main dishes', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'Desserts', 'Sweet treats to end your meal', 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400', true),
    ('550e8400-e29b-41d4-a716-446655440004', 'Beverages', 'Refreshing drinks and beverages', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400', true),
    ('550e8400-e29b-41d4-a716-446655440005', 'Salads', 'Fresh and healthy salad options', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', true);

-- Insert sample food items
INSERT INTO food_items (id, name, description, price, image_url, category_id, is_available, is_featured, preparation_time) VALUES
    -- Appetizers
    ('660e8400-e29b-41d4-a716-446655440001', 'Chicken Wings', 'Crispy chicken wings with your choice of sauce', 12.99, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400', '550e8400-e29b-41d4-a716-446655440001', true, true, 15),
    ('660e8400-e29b-41d4-a716-446655440002', 'Mozzarella Sticks', 'Golden fried mozzarella with marinara sauce', 8.99, 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400', '550e8400-e29b-41d4-a716-446655440001', true, false, 10),
    ('660e8400-e29b-41d4-a716-446655440003', 'Loaded Nachos', 'Tortilla chips with cheese, jalapeños, and sour cream', 10.99, 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', '550e8400-e29b-41d4-a716-446655440001', true, true, 12),
    
    -- Main Courses
    ('660e8400-e29b-41d4-a716-446655440004', 'Classic Burger', 'Beef patty with lettuce, tomato, and cheese', 14.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', '550e8400-e29b-41d4-a716-446655440002', true, true, 20),
    ('660e8400-e29b-41d4-a716-446655440005', 'Grilled Chicken', 'Seasoned grilled chicken breast with vegetables', 16.99, 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400', '550e8400-e29b-41d4-a716-446655440002', true, false, 25),
    ('660e8400-e29b-41d4-a716-446655440006', 'Fish and Chips', 'Beer-battered fish with crispy fries', 15.99, 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=400', '550e8400-e29b-41d4-a716-446655440002', true, true, 18),
    ('660e8400-e29b-41d4-a716-446655440007', 'Pasta Carbonara', 'Creamy pasta with bacon and parmesan', 13.99, 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400', '550e8400-e29b-41d4-a716-446655440002', true, false, 15),
    
    -- Desserts
    ('660e8400-e29b-41d4-a716-446655440008', 'Chocolate Cake', 'Rich chocolate cake with chocolate frosting', 6.99, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400', '550e8400-e29b-41d4-a716-446655440003', true, true, 5),
    ('660e8400-e29b-41d4-a716-446655440009', 'Ice Cream Sundae', 'Vanilla ice cream with toppings', 5.99, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', '550e8400-e29b-41d4-a716-446655440003', true, false, 3),
    ('660e8400-e29b-41d4-a716-446655440010', 'Cheesecake', 'New York style cheesecake with berry sauce', 7.99, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400', '550e8400-e29b-41d4-a716-446655440003', true, true, 5),
    
    -- Beverages
    ('660e8400-e29b-41d4-a716-446655440011', 'Fresh Lemonade', 'Freshly squeezed lemonade', 3.99, 'https://images.unsplash.com/photo-1523371683702-af5cd0d447c9?w=400', '550e8400-e29b-41d4-a716-446655440004', true, false, 2),
    ('660e8400-e29b-41d4-a716-446655440012', 'Iced Coffee', 'Cold brew coffee with ice', 4.99, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', '550e8400-e29b-41d4-a716-446655440004', true, true, 3),
    ('660e8400-e29b-41d4-a716-446655440013', 'Soft Drinks', 'Coca-Cola, Pepsi, Sprite, and more', 2.99, 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=400', '550e8400-e29b-41d4-a716-446655440004', true, false, 1),
    
    -- Salads
    ('660e8400-e29b-41d4-a716-446655440014', 'Caesar Salad', 'Romaine lettuce with Caesar dressing and croutons', 9.99, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400', '550e8400-e29b-41d4-a716-446655440005', true, true, 8),
    ('660e8400-e29b-41d4-a716-446655440015', 'Greek Salad', 'Mixed greens with feta cheese and olives', 10.99, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400', '550e8400-e29b-41d4-a716-446655440005', true, false, 10);

-- Insert sample admin user (password: admin123)
INSERT INTO users (id, email, password, full_name, contact_number, address, role) VALUES
    ('770e8400-e29b-41d4-a716-446655440001', 'admin@boki.com', 'admin123', 'BOKI Administrator', '+1234567890', '123 Admin Street, City, State', 'admin');

-- Insert sample customer user (password: customer123)
INSERT INTO users (id, email, password, full_name, contact_number, address, role) VALUES
    ('770e8400-e29b-41d4-a716-446655440002', 'customer@example.com', 'customer123', 'John Doe', '+1987654321', '456 Customer Ave, City, State', 'customer');

-- Insert sample order
INSERT INTO orders (id, user_id, customer_name, customer_email, customer_phone, customer_address, order_type, payment_method, status, total_amount, notes) VALUES
    ('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', 'John Doe', 'customer@example.com', '+1987654321', '456 Customer Ave, City, State', 'delivery', 'cash', 'completed', 29.97, 'Please ring the doorbell');

-- Insert sample order items
INSERT INTO order_items (id, order_id, food_item_id, quantity, unit_price, total_price) VALUES
    ('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440004', 1, 14.99, 14.99),
    ('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 1, 12.99, 12.99),
    ('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440013', 1, 2.99, 2.99);

-- Insert initial order status history
INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES
    ('880e8400-e29b-41d4-a716-446655440001', 'pending', '770e8400-e29b-41d4-a716-446655440002', 'Order placed'),
    ('880e8400-e29b-41d4-a716-446655440001', 'preparing', '770e8400-e29b-41d4-a716-446655440001', 'Order is being prepared'),
    ('880e8400-e29b-41d4-a716-446655440001', 'out_for_delivery', '770e8400-e29b-41d4-a716-446655440001', 'Order is out for delivery'),
    ('880e8400-e29b-41d4-a716-446655440001', 'completed', '770e8400-e29b-41d4-a716-446655440001', 'Order delivered successfully');