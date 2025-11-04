
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
  status: 'pending' | 'pending_payment' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  total_amount: number;
  delivery_fee: number;
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

  const updateOrderStatus = async (orderId: string, status: Order['status'], notes?: string, cancellationReason?: string, cancellationNotes?: string) => {
    console.log('🔍 updateOrderStatus called with:', { orderId, status, notes, cancellationReason, cancellationNotes });
    try {
      // Set user context for RLS
      if (user) {
        await supabase.rpc('set_user_context', { 
          user_id: user.id, 
          user_role: user.role 
        });
      }

      // Prepare update data
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      // Include notes in the order record if provided (especially for cancellations)
      if (notes) {
        updateData.notes = notes;
      }

      // Handle cancellation fields for cancelled orders
      if (status === 'cancelled') {
        if (cancellationReason) {
          updateData.cancellation_reason = cancellationReason;
        }
        if (cancellationNotes) {
          updateData.cancellation_notes = cancellationNotes;
        }
      }

      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update(updateData)
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
    // Use business timezone for day boundaries
    const timeZone = 'Asia/Manila';
    const formatDateInTZ = (iso: string) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(iso));

    const manilaToday = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const todayOrders = orders.filter(order => formatDateInTZ(order.created_at) === manilaToday);

    return {
      totalOrders: todayOrders.length,
      totalSales: todayOrders.reduce((sum, order) => sum + order.total_amount, 0),
      pendingOrders: todayOrders.filter(order => order.status === 'pending').length,
      pendingPaymentOrders: todayOrders.filter(order => order.status === 'pending_payment').length,
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
    return ['pending', 'pending_payment', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'] as const;
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
