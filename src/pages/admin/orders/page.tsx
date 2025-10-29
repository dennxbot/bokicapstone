
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
      case 'preparing':
        return orderType === 'delivery' ? 'out_for_delivery' : 'ready';
      case 'ready':
        return 'completed';
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
      case 'preparing':
        return orderType === 'delivery' ? 'Out for Delivery' : 'Ready for Pickup';
      case 'ready':
        return 'Mark Completed';
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
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-64">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Manage all customer orders</p>
          </div>
        </div>

        <div className="p-6">
          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex space-x-1">
              {[
                { key: 'all', label: 'All Orders' },
                { key: 'pending', label: 'Pending' },
                { key: 'preparing', label: 'Preparing' },
                { key: 'ready', label: 'Ready' },
                { key: 'out_for_delivery', label: 'Out for Delivery' },
                { key: 'completed', label: 'Completed' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filter === tab.key
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <i className="ri-shopping-bag-line text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No orders found</h3>
                <p className="text-gray-600">No orders match the selected filter.</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">Order #{order.id.slice(-8)}</h3>
                          <p className="text-sm text-gray-600">
                            {order.customer_name} • {getTimeAgo(order.created_at)}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
                          {order.status.replace('-', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Items</h4>
                          <div className="space-y-1">
                            {order.order_items?.map((item, index) => (
                              <div key={index} className="text-sm text-gray-600">
                                <span>{item.quantity}x {item.food_item?.name || 'Unknown Item'}</span>
                                {item.size_name && (
                                  <span className="text-gray-500 ml-1">({item.size_name})</span>
                                )}
                              </div>
                            )) || <p className="text-sm text-gray-500">No items found</p>}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Customer Info</h4>
                          <p className="text-sm text-gray-600">{order.customer_phone}</p>
                          <p className="text-sm text-gray-600">{order.customer_email}</p>
                          {order.customer_address && (
                            <p className="text-sm text-gray-600">{order.customer_address}</p>
                          )}
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                          <p className="text-sm text-gray-600 capitalize">{order.order_type || 'pickup'}</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {order.payment_method === 'cash' ?
                              (order.order_type === 'delivery' ? 'Cash on Delivery' : 'Pay on Pickup') :
                              order.payment_method || 'Cash'}
                          </p>
                          <p className="text-sm font-semibold text-orange-600">{formatPesoSimple(order.total_amount)}</p>
                          {order.notes && (
                            <p className="text-sm text-gray-500 mt-1">Note: {order.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Update Buttons */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="flex flex-wrap gap-2 mt-4 lg:mt-0 lg:ml-6">
                        {getNextStatus(order.status, order.order_type) && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.status, order.order_type)!)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm whitespace-nowrap"
                          >
                            {getNextStatusLabel(order.status, order.order_type)}
                          </Button>
                        )}
                        
                        {order.status === 'pending' && (
                          <Button
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50 px-4 py-2 text-sm whitespace-nowrap"
                          >
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
