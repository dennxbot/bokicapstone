
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { formatPesoSimple } from '../../lib/currency';
import { supabase } from '../../lib/supabase';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { getOrderById } = useOrders();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated (only after loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Don't load order if still checking auth or user not authenticated
    if (authLoading || !user) return;

    const loadOrder = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const orderData = await getOrderById(id);
        setOrder(orderData);
      } catch (error) {
        console.error('Error loading order:', error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();

    // Subscribe to real-time updates for this specific order
    const subscription = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${id}`
        },
        async () => {
          // Reload order data when status changes
          if (id) {
            const updatedOrder = await getOrderById(id);
            setOrder(updatedOrder);
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'order_status_history',
          filter: `order_id=eq.${id}`
        },
        async () => {
          // Reload order data when status history changes
          if (id) {
            const updatedOrder = await getOrderById(id);
            setOrder(updatedOrder);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, user, navigate, getOrderById]);

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed', icon: 'ri-check-line' },
      { key: 'pending_payment', label: 'Payment Pending', icon: 'ri-money-dollar-circle-line' },
      { key: 'preparing', label: 'Preparing', icon: 'ri-restaurant-line' },
      { key: 'ready', label: order?.order_type === 'delivery' ? 'Ready for Delivery' : 'Ready for Pickup', icon: order?.order_type === 'delivery' ? 'ri-truck-line' : 'ri-store-line' },
      { key: 'out_for_delivery', label: order?.order_type === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup', icon: order?.order_type === 'delivery' ? 'ri-truck-line' : 'ri-store-line' },
      { key: 'completed', label: 'Completed', icon: 'ri-check-double-line' }
    ];

    const statusOrder = ['pending', 'pending_payment', 'preparing', 'ready', 'out_for_delivery', 'completed'];
    const currentIndex = statusOrder.indexOf(order?.status || 'pending');

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex
    }));
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
          <button 
            onClick={() => navigate('/orders')}
            className="text-orange-600 hover:text-orange-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => navigate('/orders')} className="mr-4">
              <i className="ri-arrow-left-line text-xl"></i>
            </button>
            <h1 className="text-xl font-bold">Order Details</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">Order #{order.id.slice(-4)}</h2>
              <p className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100 capitalize">
              {order.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Order Status</h3>
          <div className="space-y-4">
            {statusSteps.map((step) => (
              <div key={step.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                  step.completed ? 'bg-green-500 text-white' : 
                  step.active ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  <i className={`${step.icon} text-sm`}></i>
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${step.completed || step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                </div>
                {step.completed && (
                  <i className="ri-check-line text-green-500"></i>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Order Items</h3>
          {order.order_items?.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">{item.food_items?.name || 'Unknown Item'}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Qty: {item.quantity}</span>
                  {item.size_name && (
                    <>
                      <span>•</span>
                      <span>Size: {item.size_name}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="font-semibold">{formatPesoSimple(item.total_price)}</p>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total</p>
              <p className="text-lg font-bold text-orange-600">{formatPesoSimple(order.total_amount)}</p>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Name: </span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            {order.customer_phone && (
              <div>
                <span className="text-gray-600">Contact: </span>
                <span className="font-medium">{order.customer_phone}</span>
              </div>
            )}
            {order.customer_email && (
              <div>
                <span className="text-gray-600">Email: </span>
                <span className="font-medium">{order.customer_email}</span>
              </div>
            )}
            {order.customer_address && (
              <div>
                <span className="text-gray-600">Address: </span>
                <span className="font-medium">{order.customer_address}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Method: </span>
              <span className="font-medium capitalize">{order.order_type}</span>
            </div>
            <div>
              <span className="text-gray-600">Payment: </span>
              <span className="font-medium capitalize">
                {order.payment_method === 'cash' ? 
                  (order.order_type === 'delivery' ? 'Cash on Delivery' : 'Pay on Pickup') : 
                  order.payment_method}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {order.status !== 'completed' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <i className="ri-information-line text-orange-600 mr-3"></i>
              <div>
                <p className="font-semibold text-orange-800">Need Help?</p>
                <p className="text-orange-700 text-sm">Contact us if you have any questions about your order.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
