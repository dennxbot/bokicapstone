
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../hooks/useAuth';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import { supabase } from '../../lib/supabase';
import BottomNavigation from '../../components/feature/BottomNavigation';

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
  delivery_fee: number;
  created_at: string;
  order_items: any[];
};

const OrderConfirmation = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isKioskMode } = useKioskAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const { orders, fetchOrders, getOrderById } = useOrders();

  // Enhanced status configuration with progress tracking
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { 
        icon: 'ri-time-line', 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50', 
        borderColor: 'border-yellow-200',
        label: 'Order Received',
        description: 'Your order has been received and is being processed',
        progress: 25
      },
      preparing: { 
        icon: 'ri-restaurant-line', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50', 
        borderColor: 'border-blue-200',
        label: 'Preparing',
        description: 'Our chefs are preparing your delicious meal',
        progress: 50
      },
      ready: { 
        icon: 'ri-check-line', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        borderColor: 'border-green-200',
        label: 'Ready',
        description: 'Your order is ready for pickup/delivery',
        progress: 75
      },
      out_for_delivery: { 
        icon: 'ri-truck-line', 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50', 
        borderColor: 'border-purple-200',
        label: 'Out for Delivery',
        description: 'Your order is on its way to you',
        progress: 90
      },
      completed: { 
        icon: 'ri-check-double-line', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        borderColor: 'border-green-200',
        label: 'Completed',
        description: 'Order delivered successfully. Enjoy your meal!',
        progress: 100
      },
      cancelled: { 
        icon: 'ri-close-line', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50', 
        borderColor: 'border-red-200',
        label: 'Cancelled',
        description: 'This order has been cancelled',
        progress: 0
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

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

  // Trigger animation after order loads
  useEffect(() => {
    if (order && !loading) {
      const timer = setTimeout(() => setShowAnimation(true), 300);
      return () => clearTimeout(timer);
    }
  }, [order, loading]);

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

  const getTotalAmount = (order: OrderData): number => {
    return getOrderTotal(order);
  };

  const getDeliveryAddress = (order: OrderData): string => {
    if (isLocalStorageOrder(order)) {
      return order.customerInfo?.address || 'No address provided';
    } else {
      return order.customer_address || 'No address provided';
    }
  };

  const getDeliveryFee = (order: OrderData): number => {
    if (isLocalStorageOrder(order)) {
      return getOrderType(order) === 'delivery' ? 50 : 0;
    } else {
      return order.delivery_fee || 0;
    }
  };

  const getSubtotal = (order: OrderData): number => {
    // Subtract delivery fee from total to get subtotal
    return getTotalAmount(order) - getDeliveryFee(order);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-orange-400 mx-auto animate-ping"></div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-gray-800">Loading Your Order</h2>
            <p className="text-gray-600">Fetching your order details...</p>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-8">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <i className="ri-error-warning-line text-4xl text-red-600"></i>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-800">Order Not Found</h2>
            <p className="text-gray-600 leading-relaxed">
              {error || 'We couldn\'t find your order. This might be due to a processing error or the order may not exist.'}
            </p>
            <div className="bg-white rounded-xl p-4 border border-red-100">
              <h3 className="font-semibold text-gray-800 mb-2">What you can do:</h3>
              <ul className="text-sm text-gray-600 space-y-1 text-left">
                <li>• Check if the order ID is correct</li>
                <li>• Try refreshing the page</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>
            <div className="space-y-3 pt-4">
              <Button onClick={() => window.location.reload()} className="w-full bg-orange-600 hover:bg-orange-700">
                <i className="ri-refresh-line mr-2"></i>
                Try Again
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                <i className="ri-home-line mr-2"></i>
                Go Home
              </Button>
            </div>
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
    const statusConfig = getStatusConfig(order.status);

  // Helper functions for status timeline
  const getStatusIcon = (status: string) => {
    const icons = {
      pending: 'ri-time-line',
      preparing: 'ri-restaurant-line',
      ready: 'ri-check-line',
      out_for_delivery: 'ri-truck-line',
      completed: 'ri-check-double-line'
    };
    return icons[status as keyof typeof icons] || 'ri-time-line';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'Received',
      preparing: 'Preparing',
      ready: 'Ready',
      out_for_delivery: 'Delivery',
      completed: 'Completed'
    };
    return labels[status as keyof typeof labels] || 'Pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-yellow-50">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Header Section with Animation */}
        <div className={`bg-white shadow-lg border-b transition-all duration-700 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
                <i className="ri-arrow-left-line mr-2"></i>
                Back to Home
              </Button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono text-sm font-medium text-gray-800">{orderId}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Success Header with Animation */}
          <div className={`text-center transition-all duration-700 delay-200 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                <i className="ri-check-line text-4xl text-white"></i>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
                <i className="ri-restaurant-line text-white text-sm"></i>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3">Order Confirmed!</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Thank you for your order! We're preparing your delicious meal with care.
            </p>
          </div>

          {/* Order Status Timeline */}
          <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-300 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Order Status</h2>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.color} animate-pulse`}>
                <i className={`${statusConfig.icon} mr-2`}></i>
                {statusConfig.label}
              </div>
            </div>
            
            {/* Progress Timeline */}
            <div className="relative">
              <div className="flex justify-between items-center mb-8">
                {['pending', 'preparing', 'ready', 'out_for_delivery', 'completed'].map((status, index) => {
                  const isActive = statusConfig.progress >= (index + 1) * 20;
                  const isCurrent = order.status === status;
                  
                  return (
                    <div key={status} className="flex flex-col items-center relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isActive 
                          ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg scale-110' 
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'animate-pulse ring-4 ring-orange-200' : ''}`}>
                        <i className={`${getStatusIcon(status)} text-lg`}></i>
                      </div>
                      <span className={`text-xs mt-2 font-medium ${isActive ? 'text-orange-600' : 'text-gray-400'}`}>
                        {getStatusLabel(status)}
                      </span>
                      {index < 4 && (
                        <div className={`absolute top-6 left-12 w-16 h-0.5 transition-all duration-500 ${
                          statusConfig.progress > (index + 1) * 20 ? 'bg-orange-400' : 'bg-gray-200'
                        }`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${statusConfig.progress}%` }}
                ></div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-600">{statusConfig.description}</p>
              </div>
            </div>
          </div>

          {/* Desktop Grid Layout for Details */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Order Details */}
            <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-400 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <h3 className="text-xl font-bold mb-4 text-gray-800">Order Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Type:</span>
                  <span className="font-semibold capitalize">{getOrderType(order)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
                     {statusConfig.label}
                   </span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-gray-600">Order Date:</span>
                   <span className="font-semibold">{formatDate(isLocalStorageOrder(order) ? order.createdAt : order.created_at)}</span>
                 </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-semibold capitalize">{getPaymentMethod(order)}</span>
                </div>
                <div className="border-t pt-3 mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>₱{getSubtotal(order).toFixed(2)}</span>
                  </div>
                  {!isKioskMode && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Delivery Fee:</span>
                      <span>{getDeliveryFee(order) > 0 ? `₱${getDeliveryFee(order).toFixed(2)}` : 'Free'}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-orange-600">₱{getTotalAmount(order).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-500 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
              <h3 className="text-xl font-bold mb-4 text-gray-800">Customer Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <p className="font-semibold">{getCustomerName(order)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-semibold">{getCustomerPhone(order)}</p>
                </div>
                {getOrderType(order) === 'delivery' && (
                  <div>
                    <label className="text-sm text-gray-500">Delivery Address</label>
                    <p className="font-semibold">{getDeliveryAddress(order)}</p>
                  </div>
                )}
                {getOrderType(order) === 'pickup' && (
                  <div>
                    <label className="text-sm text-gray-500">Pickup Location</label>
                    <p className="font-semibold">Boki Restaurant</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-600 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <h3 className="text-xl font-bold mb-6 text-gray-800">Order Items</h3>
            <div className="space-y-4">
              {getOrderItems(order).map((item, index) => {
                const itemName = isLocalStorageOrder(order) ? item.name : item.menu_item?.name || 'Unknown Item';
                const itemPrice = isLocalStorageOrder(order) ? item.price : item.menu_item?.price || 0;
                const itemQuantity = item.quantity;
                const itemImage = isLocalStorageOrder(order) ? item.image : item.menu_item?.image;

                return (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {itemImage ? (
                        <img src={itemImage} alt={itemName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="ri-restaurant-line text-gray-400 text-xl"></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{itemName}</h4>
                      <p className="text-sm text-gray-600">Quantity: {itemQuantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">₱{(itemPrice * itemQuantity).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">₱{itemPrice.toFixed(2)} each</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estimated Time */}
          <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg transition-all duration-700 delay-700 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="flex items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mr-6">
                <i className="ri-time-line text-blue-600 text-2xl"></i>
              </div>
              <div>
                <p className="font-bold text-blue-800 text-xl">Estimated {getOrderType(order) === 'delivery' ? 'Delivery' : 'Pickup'} Time</p>
                <p className="text-blue-700 font-semibold text-lg">{estimatedTime}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex space-x-4 transition-all duration-700 delay-800 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <Button
              onClick={() => navigate('/orders')}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <i className="ri-file-list-3-line mr-2"></i>
              View My Orders
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1 border-2 border-gray-300 hover:border-orange-400 text-gray-700 hover:text-orange-600 py-4 rounded-xl font-bold text-lg hover:bg-orange-50 transform hover:scale-105 transition-all duration-200"
            >
              <i className="ri-shopping-cart-line mr-2"></i>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden pb-20">
      {/* Header Section with Animation */}
      <div className={`bg-white shadow-lg border-b transition-all duration-700 ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-bold text-center">Order Confirmed!</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Success Header with Animation */}
        <div className={`text-center transition-all duration-700 delay-200 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <i className="ri-check-line text-3xl text-white"></i>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
              <i className="ri-restaurant-line text-white text-xs"></i>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed Successfully!</h2>
          <p className="text-gray-600 leading-relaxed">
            Thank you for your order! We're preparing your delicious meal with care.
          </p>
        </div>

        {/* Order Status Timeline */}
        <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-300 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Order Status</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.color} animate-pulse`}>
              <i className={`${statusConfig.icon} mr-1`}></i>
              {statusConfig.label}
            </div>
          </div>
          
          {/* Progress Timeline */}
          <div className="relative">
            <div className="flex justify-between items-center mb-6">
              {['pending', 'preparing', 'ready', 'out_for_delivery', 'completed'].map((status, index) => {
                const isActive = statusConfig.progress >= (index + 1) * 20;
                const isCurrent = order.status === status;
                
                return (
                  <div key={status} className="flex flex-col items-center relative flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                      isActive 
                        ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-lg scale-110' 
                        : 'bg-gray-200 text-gray-400'
                    } ${isCurrent ? 'animate-pulse ring-2 ring-orange-200' : ''}`}>
                      <i className={`${getStatusIcon(status)} text-xs`}></i>
                    </div>
                    <span className={`text-xs mt-1 font-medium text-center ${
                      isActive ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      {getStatusLabel(status)}
                    </span>
                    {index < 4 && (
                      <div className={`absolute top-4 left-1/2 w-full h-0.5 transition-all duration-500 ${
                        statusConfig.progress > (index + 1) * 20 ? 'bg-orange-400' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
              <div 
                className="bg-gradient-to-r from-orange-400 to-orange-600 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${statusConfig.progress}%` }}
              ></div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">{statusConfig.description}</p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-400 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h3 className="text-xl font-bold mb-4 text-gray-800">Order Details</h3>
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
        <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-500 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h3 className="text-xl font-bold mb-4 text-gray-800">Order Items</h3>
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
          <div className="border-t pt-2 mt-2 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Subtotal:</p>
              <p className="font-semibold">₱{getSubtotal(order).toFixed(2)}</p>
            </div>
            {!isKioskMode && (
              <div className="flex justify-between items-center">
                <p className="text-gray-600">Delivery Fee:</p>
                <p className="font-semibold">{getDeliveryFee(order) > 0 ? `₱${getDeliveryFee(order).toFixed(2)}` : 'Free'}</p>
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Total</p>
                <p className="text-lg font-bold text-orange-600">₱{getTotalAmount(order).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg transition-all duration-700 delay-600 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <i className="ri-time-line text-blue-600 text-xl"></i>
            </div>
            <div>
              <p className="font-bold text-blue-800 text-lg">Estimated {getOrderType(order) === 'delivery' ? 'Delivery' : 'Pickup'} Time</p>
              <p className="text-blue-700 font-semibold">{estimatedTime}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className={`bg-white rounded-2xl shadow-xl p-6 transition-all duration-700 delay-700 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h3 className="text-xl font-bold mb-4 text-gray-800">Customer Information</h3>
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

        <div className={`space-y-4 transition-all duration-700 delay-800 ${showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <Button
            onClick={() => navigate('/orders')}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <i className="ri-file-list-3-line mr-2"></i>
            View My Orders
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full border-2 border-gray-300 hover:border-orange-400 text-gray-700 hover:text-orange-600 py-4 rounded-xl font-bold text-lg hover:bg-orange-50 transform hover:scale-105 transition-all duration-200"
          >
            <i className="ri-shopping-cart-line mr-2"></i>
            Continue Shopping
          </Button>
        </div>
        </div>
      </div>
      
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default OrderConfirmation;
