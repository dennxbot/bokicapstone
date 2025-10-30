import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type KioskOrderStatus = 
  | 'pending_payment'
  | 'payment_received'
  | 'cancelled';

export interface KioskOrderItem {
  id: string;
  kiosk_order_id: string;
  food_item_id: string;
  size_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  food_item?: {
    name: string;
    image_url?: string;
  };
  size?: {
    name: string;
  };
}

export interface KioskOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  status: KioskOrderStatus;
  order_type: 'delivery' | 'pickup';
  total_amount: number;
  payment_method?: string;
  notes?: string;
  cancellation_reason?: string;
  cancellation_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  items?: KioskOrderItem[];
}

export interface KioskOrderStatusHistory {
  id: string;
  kiosk_order_id: string;
  old_status?: KioskOrderStatus;
  new_status: KioskOrderStatus;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

export interface CreateKioskOrderData {
  customer_name: string;
  customer_phone?: string;
  order_type: 'delivery' | 'pickup';
  total_amount: number;
  payment_method?: string;
  notes?: string;
  items: {
    food_item_id: string;
    size_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string;
  }[];
}

export const useKioskOrders = () => {
  const [orders, setOrders] = useState<KioskOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all kiosk orders
  const fetchKioskOrders = useCallback(async (status?: KioskOrderStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('kiosk_orders')
        .select(`
          *,
          items:kiosk_order_items(
            *,
            food_item:food_items(name, image_url),
            size:size_options(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching kiosk orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch kiosk orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new kiosk order
  const createKioskOrder = useCallback(async (orderData: CreateKioskOrderData): Promise<KioskOrder | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Create the main order
      const { data: orderResult, error: orderError } = await supabase
        .from('kiosk_orders')
        .insert({
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          order_type: orderData.order_type,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method,
          status: 'pending_payment',
          notes: orderData.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        kiosk_order_id: orderResult.id,
        food_item_id: item.food_item_id,
        size_id: item.size_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        special_instructions: item.special_instructions,
      }));

      const { error: itemsError } = await supabase
        .from('kiosk_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Fetch the complete order with items
      const { data: completeOrder, error: fetchError } = await supabase
        .from('kiosk_orders')
        .select(`
          *,
          items:kiosk_order_items(
            *,
            food_item:food_items(name, image_url),
            size:size_options(name)
          )
        `)
        .eq('id', orderResult.id)
        .single();

      if (fetchError) throw fetchError;

      // Update local state
      setOrders(prev => [completeOrder, ...prev]);

      return completeOrder;
    } catch (err) {
      console.error('Error creating kiosk order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create kiosk order');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update kiosk order status
  const updateKioskOrderStatus = useCallback(async (
    orderId: string, 
    newStatus: KioskOrderStatus, 
    notes?: string,
    cancellationReason?: string,
    cancellationNotes?: string
  ): Promise<boolean> => {
    console.log('🔍 updateKioskOrderStatus called with:', { orderId, newStatus, notes, cancellationReason, cancellationNotes });
    console.log('🔍 Call stack:', new Error().stack);
    
    // Add specific check for invalid status
    if (newStatus === 'preparing' as any) {
      console.error('🚨 INVALID STATUS DETECTED: "preparing" is not valid for kiosk orders!');
      console.error('🚨 Order ID:', orderId);
      console.error('🚨 Full call stack:', new Error().stack);
      alert('DEBUGGING: Invalid status "preparing" detected for kiosk order!');
      setError('Invalid status: "preparing" is not valid for kiosk orders');
      return false;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const updateData: any = { status: newStatus };
      
      // Add payment method for payment_received status
      if (newStatus === 'payment_received' && !notes) {
        updateData.payment_method = 'cash'; // Default to cash, can be customized
      }

      // Include notes if provided
      if (notes) {
        updateData.notes = notes;
      }

      // Handle cancellation fields for cancelled orders
      if (newStatus === 'cancelled') {
        if (cancellationReason) {
          updateData.cancellation_reason = cancellationReason;
        }
        if (cancellationNotes) {
          updateData.cancellation_notes = cancellationNotes;
        }
      }

      const { error } = await supabase
        .from('kiosk_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: newStatus, 
              notes: notes || order.notes, 
              cancellation_reason: cancellationReason || order.cancellation_reason,
              cancellation_notes: cancellationNotes || order.cancellation_notes,
              updated_at: new Date().toISOString() 
            }
          : order
      ));

      return true;
    } catch (err) {
      console.error('Error updating kiosk order status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order status');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get order status history
  const getOrderStatusHistory = useCallback(async (orderId: string): Promise<KioskOrderStatusHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('kiosk_order_status_history')
        .select('*')
        .eq('kiosk_order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error fetching order status history:', err);
      return [];
    }
  }, []);

  // Get orders by status
  const getOrdersByStatus = useCallback((status: KioskOrderStatus) => {
    return orders.filter(order => order.status === status);
  }, [orders]);

  // Get pending payment orders (for cashier)
  const getPendingPaymentOrders = useCallback(() => {
    return getOrdersByStatus('pending_payment');
  }, [getOrdersByStatus]);

  // Get active orders (not completed or cancelled)
  const getActiveOrders = useCallback(() => {
    return orders.filter(order => 
      !['completed', 'cancelled'].includes(order.status)
    );
  }, [orders]);

  // Get orders relevant for cashier (pending payment, payment received, and cancelled)
  const getCashierOrders = useCallback(() => {
    return orders.filter(order => 
      ['pending_payment', 'payment_received', 'cancelled'].includes(order.status)
    );
  }, [orders]);

  // Initialize - fetch orders on mount
  useEffect(() => {
    fetchKioskOrders();
  }, [fetchKioskOrders]);

  return {
    orders,
    isLoading,
    error,
    fetchKioskOrders,
    createKioskOrder,
    updateKioskOrderStatus,
    getOrderStatusHistory,
    getOrdersByStatus,
    getPendingPaymentOrders,
    getActiveOrders,
    getCashierOrders,
  };
};