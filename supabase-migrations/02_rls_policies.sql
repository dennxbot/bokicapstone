-- BOKI Food Ordering System - Row Level Security Policies
-- This migration sets up RLS policies for secure data access

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Create function to get current user context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('app.current_user_id', true))::UUID,
        auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('app.current_user_role', true))::user_role,
        (SELECT role FROM users WHERE id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user context (for use in hooks)
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID, user_role user_role)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, true);
    PERFORM set_config('app.current_user_role', user_role::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = get_current_user_id());

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = get_current_user_id());

CREATE POLICY "Admins can update any user" ON users
    FOR UPDATE USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can create their own account" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Categories table policies (public read, admin write)
CREATE POLICY "Anyone can view active categories" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all categories" ON categories
    FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (get_current_user_role() = 'admin');

-- Food items table policies (public read all items for frontend filtering, admin full access)
CREATE POLICY "Anyone can view all food items" ON food_items
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage food items" ON food_items
    FOR ALL USING (get_current_user_role() = 'admin');

-- Orders table policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (
        user_id = get_current_user_id() OR 
        get_current_user_role() = 'admin'
    );

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (
        user_id = get_current_user_id() OR 
        get_current_user_role() = 'admin'
    );

CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (get_current_user_role() = 'admin');

-- Order items table policies
CREATE POLICY "Users can view their order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = get_current_user_id() OR get_current_user_role() = 'admin')
        )
    );

CREATE POLICY "Users can create order items for their orders" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = get_current_user_id() OR get_current_user_role() = 'admin')
        )
    );

CREATE POLICY "Admins can manage all order items" ON order_items
    FOR ALL USING (get_current_user_role() = 'admin');

-- Cart items table policies
CREATE POLICY "Users can manage their own cart" ON cart_items
    FOR ALL USING (user_id = get_current_user_id());

CREATE POLICY "Admins can view all carts" ON cart_items
    FOR SELECT USING (get_current_user_role() = 'admin');

-- Order status history policies
CREATE POLICY "Users can view their order status history" ON order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_status_history.order_id 
            AND (orders.user_id = get_current_user_id() OR get_current_user_role() = 'admin')
        )
    );

CREATE POLICY "Admins can manage order status history" ON order_status_history
    FOR ALL USING (get_current_user_role() = 'admin');

CREATE POLICY "System can create status history" ON order_status_history
    FOR INSERT WITH CHECK (true);