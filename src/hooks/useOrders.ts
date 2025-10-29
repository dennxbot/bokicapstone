
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Order {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string | null;
  order_type: 'delivery' | 'pickup';
  payment_method: 'cash' | 'card' | 'online';
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  food_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  size_option_id?: string | null;
  size_name?: string | null;
  size_multiplier?: number | null;
  created_at: string;
  food_items?: {
    name: string;
    image_url: string | null;
  };
}

interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  users?: {
    full_name: string;
  };
}

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  order_status_history?: OrderStatusHistory[];
}

export const useOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);

      // Set user context for RLS if user is authenticated
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            food_items (
              name,
              image_url
            )
          ),
          order_status_history (
            *,
            users (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);

    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchUserOrders = useCallback(async (userId: string) => {
    try {
      // Set user context for RLS
      await supabase.rpc('set_user_context', { 
        user_id: userId, 
        user_role: user?.role || 'customer'
      });

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            food_items (
              name,
              image_url
            )
          ),
          order_status_history (
            *,
            users (
              full_name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'order_status_history' },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: Order['status'], notes?: string) => {
    try {
      // Set user context for RLS
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Add status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status,
          changed_by: user?.id || null,
          notes: notes || `Status changed to ${status}`
        });

      if (historyError) throw historyError;
      
      // Refresh orders
      await fetchOrders();

    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  };

  const getOrderById = async (orderId: string) => {
    try {
      // Set user context for RLS
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            food_items (
              name,
              image_url
            )
          ),
          order_status_history (
            *,
            users (
              full_name
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  };

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => 
      order.created_at.startsWith(today)
    );

    return {
      totalOrders: todayOrders.length,
      totalSales: todayOrders.reduce((sum, order) => sum + order.total_amount, 0),
      pendingOrders: todayOrders.filter(order => order.status === 'pending').length,
      preparingOrders: todayOrders.filter(order => order.status === 'preparing').length,
      readyOrders: todayOrders.filter(order => order.status === 'ready').length,
      outForDeliveryOrders: todayOrders.filter(order => order.status === 'out_for_delivery').length,
      completedOrders: todayOrders.filter(order => order.status === 'completed').length,
      cancelledOrders: todayOrders.filter(order => order.status === 'cancelled').length,
    };
  };

  const getOrdersByStatus = (status: Order['status']) => {
    return orders.filter(order => order.status === status);
  };

  const getOrderStatusHistory = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    return order?.order_status_history || [];
  };

  const getAllOrderStatuses = () => {
    return ['pending', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'] as const;
  };

  return {
    orders,
    isLoading,
    fetchOrders,
    fetchUserOrders,
    updateOrderStatus,
    getOrderById,
    getTodayStats,
    getOrdersByStatus,
    getOrderStatusHistory,
    getAllOrderStatuses,
  };
};
