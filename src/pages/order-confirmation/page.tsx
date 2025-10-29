
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

// Local interface for localStorage order data
interface LocalStorageOrder {
  id: string;
  items: any[];
  total: number;
  customerInfo: any;
  status: string;
  createdAt: string;
}

// Type for the order state (can be either localStorage format or database format)
type OrderData = LocalStorageOrder | {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string | null;
  order_type: 'delivery' | 'pickup';
  payment_method: 'cash' | 'card' | 'online';
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  order_items: any[];
};

const OrderConfirmation = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { orders, fetchOrders, getOrderById } = useOrders();

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, try to get from localStorage
        const lastOrder = localStorage.getItem('lastOrder');
        if (lastOrder) {
          const orderData = JSON.parse(lastOrder) as LocalStorageOrder;
          if (orderData.id === orderId) {
            setOrder(orderData);
            setLoading(false);
            return;
          }
        }

        // Fallback: Try to fetch from database
        if (orderId) {
          try {
            // For order confirmation, we need to fetch the order even without authentication
            // This is like a receipt that should be accessible with just the order ID
            let dbOrder = null;
            
            if (user) {
              // If user is authenticated, use the normal method
              dbOrder = await getOrderById(orderId);
            } else {
              // If not authenticated, we have a problem with RLS policies
              // Let's try to get the current session and see if there's a user
              const { data: { session } } = await supabase.auth.getSession();
              
              if (session?.user) {
                // Try again with session user
                dbOrder = await getOrderById(orderId);
              } else {
                setError('Unable to load order. Please try logging in or check if the order ID is correct.');
              }
            }
            
            if (dbOrder) {
              setOrder(dbOrder);
            } else {
              setError('Order not found. This could be due to a processing error or the order may not have been created successfully.');
            }
          } catch (dbError) {
            console.error('Error calling getOrderById:', dbError);
            setError(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
          }
        } else {
          setError('No order ID provided.');
        }
        
        setLoading(false);

      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order information. Please try again or contact support.');
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId, fetchOrders, orders]);

  // Helper functions to handle both localStorage and database order formats
  const isLocalStorageOrder = (order: OrderData): order is LocalStorageOrder => {
    return 'items' in order && 'customerInfo' in order;
  };

  const getOrderTotal = (order: OrderData): number => {
    return isLocalStorageOrder(order) ? order.total : order.total_amount;
  };

  const getOrderItems = (order: OrderData): any[] => {
    return isLocalStorageOrder(order) ? order.items : order.order_items;
  };

  const getCustomerName = (order: OrderData): string => {
    return isLocalStorageOrder(order) ? order.customerInfo.fullName : order.customer_name;
  };

  const getCustomerPhone = (order: OrderData): string => {
    return isLocalStorageOrder(order) ? order.customerInfo.contactNumber : order.customer_phone;
  };

  const getOrderType = (order: OrderData): 'delivery' | 'pickup' => {
    return isLocalStorageOrder(order) ? order.customerInfo.orderType : order.order_type;
  };

  const getPaymentMethod = (order: OrderData): string => {
    return isLocalStorageOrder(order) ? order.customerInfo.paymentMethod : order.payment_method;
  };

  const getEstimatedTime = (order: OrderData): string => {
    if (isLocalStorageOrder(order)) {
      return order.customerInfo.deliveryMethod === 'delivery' ? '45-60 minutes' : '20-30 minutes';
    } else {
      return order.order_type === 'delivery' ? '45-60 minutes' : '20-30 minutes';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Loading your order...</h2>
          <p className="text-gray-600 mt-2">Checking localStorage and database...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'We couldn\'t find your order. This might be due to a processing error.'}
          </p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const estimatedTime = getEstimatedTime(order);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-center">Order Confirmed!</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-line text-2xl text-green-600"></i>
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Order Placed Successfully!</h2>
          <p className="text-green-700">Thank you for your order. We'll prepare it with care.</p>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Order Details</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">{new Date(isLocalStorageOrder(order) ? order.createdAt : order.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-orange-600 capitalize">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Method:</span>
              <span className="font-medium capitalize">{getOrderType(order)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment:</span>
              <span className="font-medium capitalize">{getPaymentMethod(order) === 'cash' ? 
                (getOrderType(order) === 'delivery' ? 'Cash on Delivery' : 'Pay on Pickup') : 
                getPaymentMethod(order)}</span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Order Items</h3>
          {getOrderItems(order).map((item, index) => {
            // Handle different data structures for localStorage vs database orders
            const itemName = isLocalStorageOrder(order) 
              ? item.name 
              : (item.food_items?.name || 'Unknown Item');
            
            const itemPrice = isLocalStorageOrder(order) 
              ? item.price 
              : item.unit_price;
            
            const itemQuantity = item.quantity;
            const itemSizeName = item.size_name;
            
            return (
              <div key={item.id || index} className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{itemName}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Qty: {itemQuantity}</span>
                    {itemSizeName && (
                      <>
                        <span>•</span>
                        <span>Size: {itemSizeName}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="font-semibold">{formatPesoSimple(itemPrice * itemQuantity)}</p>
              </div>
            );
          })}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total</p>
              <p className="text-lg font-bold text-orange-600">{formatPesoSimple(getOrderTotal(order))}</p>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <i className="ri-time-line text-blue-600 mr-3"></i>
            <div>
              <p className="font-semibold text-blue-800">Estimated {getOrderType(order) === 'delivery' ? 'Delivery' : 'Pickup'} Time</p>
              <p className="text-blue-700">{estimatedTime}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Name: </span>
              <span className="font-medium">{getCustomerName(order)}</span>
            </div>
            <div>
              <span className="text-gray-600">Contact: </span>
              <span className="font-medium">{getCustomerPhone(order)}</span>
            </div>
            {isLocalStorageOrder(order) && order.customerInfo.address && (
              <div>
                <span className="text-gray-600">Address: </span>
                <span className="font-medium">{order.customerInfo.address}</span>
              </div>
            )}
            {!isLocalStorageOrder(order) && order.customer_address && (
              <div>
                <span className="text-gray-600">Address: </span>
                <span className="font-medium">{order.customer_address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/orders')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold whitespace-nowrap"
          >
            View My Orders
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 py-3 rounded-lg font-semibold whitespace-nowrap"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
