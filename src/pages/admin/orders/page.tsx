
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { formatPesoSimple } from '../../../lib/currency';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/base/Button';
import AdminSidebar from '../../../components/feature/AdminSidebar';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  order_type: string;
  payment_method: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    size_name?: string;
    food_item: {
      name: string;
    };
  }[];
}

const AdminOrders = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            size_name,
            food_item:food_items (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery':
        return 'text-orange-600 bg-orange-100';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  const getNextStatus = (currentStatus: string, orderType: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'pending_payment':
        return 'preparing'; // After payment is confirmed, start preparing
      case 'preparing':
        return 'ready'; // All orders go to 'ready' first
      case 'ready':
        return orderType === 'delivery' ? 'out_for_delivery' : 'completed';
      case 'out_for_delivery':
        return 'completed';
      default:
        return null;
    }
  };

  const getNextStatusLabel = (currentStatus: string, orderType: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'Start Preparing';
      case 'pending_payment':
        return 'Confirm Payment & Start Preparing';
      case 'preparing':
        return 'Mark as Ready'; // All orders go to 'ready' first
      case 'ready':
        return orderType === 'delivery' ? 'Out for Delivery' : 'Mark Completed';
      case 'out_for_delivery':
        return 'Mark Delivered';
      default:
        return null;
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);

  // Show loading while checking authentication
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-72">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Order Management
                </h1>
                <p className="text-slate-600 mt-1 font-medium">Track and manage all customer orders in real-time</p>
              </div>
              
              {/* Order Stats */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{orders.filter(o => o.status === 'pending').length}</div>
                  <div className="text-xs text-gray-600 font-medium">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'preparing').length}</div>
                  <div className="text-xs text-gray-600 font-medium">Preparing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{orders.filter(o => o.status === 'cancelled').length}</div>
                  <div className="text-xs text-gray-600 font-medium">Cancelled</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Enhanced Filter Tabs */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <i className="ri-filter-line text-white text-sm"></i>
                </div>
                Filter Orders
              </h2>
              <div className="text-sm text-gray-600">
                Showing {filteredOrders.length} of {orders.length} orders
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Orders', icon: 'ri-list-check-line', count: orders.length },
                { key: 'pending', label: 'Pending', icon: 'ri-time-line', count: orders.filter(o => o.status === 'pending').length },
                { key: 'preparing', label: 'Preparing', icon: 'ri-restaurant-line', count: orders.filter(o => o.status === 'preparing').length },
                { key: 'ready', label: 'Ready', icon: 'ri-check-line', count: orders.filter(o => o.status === 'ready').length },
                { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'ri-truck-line', count: orders.filter(o => o.status === 'out_for_delivery').length },
                { key: 'completed', label: 'Completed', icon: 'ri-check-double-line', count: orders.filter(o => o.status === 'completed').length },
                { key: 'cancelled', label: 'Cancelled', icon: 'ri-close-circle-line', count: orders.filter(o => o.status === 'cancelled').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                    filter === tab.key
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100/50 text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 hover:scale-105'
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full font-bold ${
                    filter === tab.key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Orders List */}
          <div className="space-y-6">
            {filteredOrders.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="ri-shopping-bag-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">No orders found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {filter === 'all' 
                    ? 'No orders have been placed yet. Orders will appear here when customers place them.'
                    : `No orders match the "${filter}" status filter. Try selecting a different filter.`
                  }
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                            #{order.id.slice(-3)}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                            <p className="text-sm text-gray-600 font-medium">
                              <i className="ri-user-line mr-1"></i>
                              {order.customer_name} • 
                              <i className="ri-time-line ml-2 mr-1"></i>
                              {getTimeAgo(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-4 py-2 rounded-xl text-sm font-bold capitalize shadow-sm ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{formatPesoSimple(order.total_amount)}</div>
                            <div className="text-xs text-gray-600 font-medium">Total Amount</div>
                          </div>
                        </div>
                      </div>

                      {/* Order Content Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        {/* Items Section */}
                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                            <i className="ri-restaurant-line text-orange-600 mr-2"></i>
                            Order Items
                          </h4>
                          <div className="space-y-2">
                            {order.order_items?.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                                    {item.quantity}
                                  </span>
                                  <div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {item.food_item?.name || 'Unknown Item'}
                                    </span>
                                    {item.size_name && (
                                      <span className="text-xs text-gray-500 ml-1">({item.size_name})</span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">
                                  {formatPesoSimple(item.unit_price * item.quantity)}
                                </span>
                              </div>
                            )) || <p className="text-sm text-gray-500 italic">No items found</p>}
                          </div>
                        </div>

                        {/* Customer Info Section */}
                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                            <i className="ri-user-line text-blue-600 mr-2"></i>
                            Customer Info
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <i className="ri-phone-line text-gray-400 text-sm"></i>
                              <span className="text-sm text-gray-700">{order.customer_phone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <i className="ri-mail-line text-gray-400 text-sm"></i>
                              <span className="text-sm text-gray-700">{order.customer_email}</span>
                            </div>
                            {order.customer_address && (
                              <div className="flex items-start space-x-2">
                                <i className="ri-map-pin-line text-gray-400 text-sm mt-0.5"></i>
                                <span className="text-sm text-gray-700">{order.customer_address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Details Section */}
                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                            <i className="ri-information-line text-purple-600 mr-2"></i>
                            Order Details
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Type:</span>
                              <span className="text-sm font-medium text-gray-900 capitalize flex items-center">
                                <i className={`${order.order_type === 'delivery' ? 'ri-truck-line' : 'ri-store-line'} mr-1`}></i>
                                {order.order_type || 'pickup'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Payment:</span>
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {order.payment_method === 'cash' ?
                                  (order.order_type === 'delivery' ? 'Cash on Delivery' : 'Pay on Pickup') :
                                  order.payment_method || 'Cash'}
                              </span>
                            </div>
                            {order.notes && (
                              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <i className="ri-sticky-note-line text-amber-600 text-sm mt-0.5"></i>
                                  <div>
                                    <span className="text-xs font-medium text-amber-800">Customer Note:</span>
                                    <p className="text-sm text-amber-700 mt-1">{order.notes}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Action Buttons */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="flex flex-col space-y-3 mt-6 lg:mt-0 lg:ml-6 lg:w-48">
                        {getNextStatus(order.status, order.order_type) && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.status, order.order_type)!)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center"
                          >
                            <i className="ri-arrow-right-line mr-2"></i>
                            {getNextStatusLabel(order.status, order.order_type)}
                          </Button>
                        )}
                        
                        {order.status === 'pending' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            variant="outline"
                            className="border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 flex items-center justify-center"
                          >
                            <i className="ri-close-line mr-2"></i>
                            Cancel Order
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
