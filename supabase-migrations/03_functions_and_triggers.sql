-- BOKI Food Ordering System - Functions and Triggers
-- This migration creates functions and triggers for business logic

-- Function to automatically create order status history when order status changes
CREATE OR REPLACE FUNCTION create_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history entry if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, changed_by, notes)
        VALUES (
            NEW.id, 
            NEW.status, 
            get_current_user_id(),
            CASE 
                WHEN NEW.status = 'pending' THEN 'Order placed'
                WHEN NEW.status = 'preparing' THEN 'Order is being prepared'
                WHEN NEW.status = 'ready' THEN 'Order is ready'
                WHEN NEW.status = 'out_for_delivery' THEN 'Order is out for delivery'
                WHEN NEW.status = 'completed' THEN 'Order completed'
                WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
                ELSE 'Status updated'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order status history
CREATE TRIGGER order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_status_history();

-- Function to calculate order total from order items
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(total_price), 0)
    INTO total
    FROM order_items
    WHERE order_id = order_uuid;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to update order total when order items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
DECLARE
    order_uuid UUID;
    new_total DECIMAL(10,2);
BEGIN
    -- Get the order_id from the affected row
    IF TG_OP = 'DELETE' THEN
        order_uuid := OLD.order_id;
    ELSE
        order_uuid := NEW.order_id;
    END IF;
    
    -- Calculate new total
    new_total := calculate_order_total(order_uuid);
    
    -- Update the order total
    UPDATE orders 
    SET total_amount = new_total, updated_at = NOW()
    WHERE id = order_uuid;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers for order total calculation
CREATE TRIGGER order_items_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

-- Function to validate order item total price
CREATE OR REPLACE FUNCTION validate_order_item_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure total_price = unit_price * quantity
    NEW.total_price := NEW.unit_price * NEW.quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order item total validation
CREATE TRIGGER order_item_total_validation_trigger
    BEFORE INSERT OR UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_order_item_total();

-- Function to clean up old cart items (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_cart_items()
RETURNS void AS $$
BEGIN
    DELETE FROM cart_items 
    WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get order statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_order_statistics(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_orders BIGINT,
    total_sales DECIMAL(10,2),
    avg_order_value DECIMAL(10,2),
    pending_orders BIGINT,
    preparing_orders BIGINT,
    ready_orders BIGINT,
    out_for_delivery_orders BIGINT,
    completed_orders BIGINT,
    cancelled_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value,
        COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE o.status = 'preparing') as preparing_orders,
        COUNT(*) FILTER (WHERE o.status = 'ready') as ready_orders,
        COUNT(*) FILTER (WHERE o.status = 'out_for_delivery') as out_for_delivery_orders,
        COUNT(*) FILTER (WHERE o.status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled_orders
    FROM orders o
    WHERE o.created_at::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get top selling items
CREATE OR REPLACE FUNCTION get_top_selling_items(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE,
    item_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    food_item_id UUID,
    food_item_name VARCHAR(255),
    total_quantity BIGINT,
    total_revenue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id as food_item_id,
        fi.name as food_item_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue
    FROM order_items oi
    JOIN food_items fi ON oi.food_item_id = fi.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at::DATE BETWEEN start_date AND end_date
        AND o.status IN ('completed', 'out_for_delivery', 'ready')
    GROUP BY fi.id, fi.name
    ORDER BY total_quantity DESC
    LIMIT item_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily sales data
CREATE OR REPLACE FUNCTION get_daily_sales(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    sale_date DATE,
    daily_orders BIGINT,
    daily_sales DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.created_at::DATE as sale_date,
        COUNT(*) as daily_orders,
        COALESCE(SUM(o.total_amount), 0) as daily_sales
    FROM orders o
    WHERE o.created_at::DATE BETWEEN start_date AND end_date
        AND o.status IN ('completed', 'out_for_delivery', 'ready')
    GROUP BY o.created_at::DATE
    ORDER BY sale_date;
END;
$$ LANGUAGE plpgsql;