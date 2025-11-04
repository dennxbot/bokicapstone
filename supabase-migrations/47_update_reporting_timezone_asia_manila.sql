-- Migration 47: Align reporting and summaries to Asia/Manila timezone
-- This updates reporting functions to use Manila local day boundaries.

-- Update get_order_statistics to use Manila-local dates
CREATE OR REPLACE FUNCTION get_order_statistics(
    start_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Manila')::DATE - INTERVAL '30 days'),
    end_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Manila')::DATE)
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
    WHERE (o.created_at AT TIME ZONE 'Asia/Manila')::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Update get_top_selling_items to use Manila-local dates
CREATE OR REPLACE FUNCTION get_top_selling_items(
    start_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Manila')::DATE - INTERVAL '30 days'),
    end_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Manila')::DATE),
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
    WHERE (o.created_at AT TIME ZONE 'Asia/Manila')::DATE BETWEEN start_date AND end_date
        AND o.status IN ('completed', 'out_for_delivery', 'ready')
    GROUP BY fi.id, fi.name
    ORDER BY total_quantity DESC
    LIMIT item_limit;
END;
$$ LANGUAGE plpgsql;

-- Update get_daily_sales to use Manila-local dates
CREATE OR REPLACE FUNCTION get_daily_sales(
    start_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Manila')::DATE - INTERVAL '30 days'),
    end_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Manila')::DATE)
)
RETURNS TABLE (
    sale_date DATE,
    daily_orders BIGINT,
    daily_sales DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (o.created_at AT TIME ZONE 'Asia/Manila')::DATE as sale_date,
        COUNT(*) as daily_orders,
        COALESCE(SUM(o.total_amount), 0) as daily_sales
    FROM orders o
    WHERE (o.created_at AT TIME ZONE 'Asia/Manila')::DATE BETWEEN start_date AND end_date
        AND o.status IN ('completed', 'out_for_delivery', 'ready')
    GROUP BY (o.created_at AT TIME ZONE 'Asia/Manila')::DATE
    ORDER BY sale_date;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'Reporting functions updated to use Asia/Manila day boundaries.';
END $$;