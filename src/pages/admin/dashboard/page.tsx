
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/base/Button';
import { formatPesoSimple } from '../../../lib/currency';
import AdminSidebar from '../../../components/feature/AdminSidebar';
import { notificationService } from '../../../lib/notifications';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalMenuItems: 0,
    todayOrders: 0,
    todaySales: 0,
    completedOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    // Initialize notification service and check permissions
    setupOrderNotifications();
    
    fetchDashboardData();
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  // Set up real-time order notifications
  const setupOrderNotifications = () => {
    // Subscribe to new orders
    const subscription = supabase
      .channel('admin-order-notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        },
        async (payload) => {
          const newOrder = payload.new as any;
          
          // Show push notification for new order
          if (notificationService.isEnabled()) {
            await notificationService.showNewOrderNotification({
              orderId: newOrder.id,
              customerName: newOrder.customer_name,
              totalAmount: parseFloat(newOrder.total_amount),
              orderType: newOrder.order_type
            });
          }

          // Refresh dashboard data
          fetchDashboardData();
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders' 
        },
        async (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Show push notification for status updates (except for new orders)
          if (notificationService.isEnabled() && 
              updatedOrder.status !== oldOrder.status && 
              oldOrder.status !== 'pending') {
            await notificationService.showOrderUpdateNotification({
              orderId: updatedOrder.id,
              customerName: updatedOrder.customer_name,
              status: updatedOrder.status,
              previousStatus: oldOrder.status
            });
          }

          // Refresh dashboard data
          fetchDashboardData();
        }
      )
      .subscribe();

    // Clean up subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch orders data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch food items count
      const { data: foodItems, error: foodItemsError } = await supabase
        .from('food_items')
        .select('id');

      if (foodItemsError) throw foodItemsError;

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders?.filter(order => 
        new Date(order.created_at) >= today
      ) || [];

      const pendingOrders = orders?.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
      ) || [];

      const completedOrders = orders?.filter(order => 
        order.status === 'completed'
      ) || [];

      // Exclude cancelled orders from revenue calculations
      const nonCancelledOrders = orders?.filter(order => order.status !== 'cancelled') || [];
      const totalRevenue = nonCancelledOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || 0), 0
      ) || 0;

      // Exclude cancelled orders from today's sales
      const todayNonCancelledOrders = todayOrders.filter(order => order.status !== 'cancelled');
      const todaySales = todayNonCancelledOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || 0), 0
      );

      setStats({
        totalOrders: orders?.length || 0,
        pendingOrders: pendingOrders.length,
        totalRevenue,
        totalMenuItems: foodItems?.length || 0,
        todayOrders: todayOrders.length,
        todaySales,
        completedOrders: completedOrders.length
      });

      // Set recent orders (last 5)
      setRecentOrders(orders?.slice(0, 5) || []);

      // Generate notifications based on recent orders
      const recentNotifications = orders?.slice(0, 3).map((order, index) => ({
        id: order.id,
        type: order.status === 'pending' ? 'new_order' : 'order_update',
        message: order.status === 'pending' 
          ? `New order #${order.id.slice(-4)} received`
          : `Order #${order.id.slice(-4)} ${order.status}`,
        time: getTimeAgo(order.created_at),
        unread: index < 2
      })) || [];

      setNotifications(recentNotifications);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, unread: false } : notif
    ));
  };

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, unread: false })));
  };

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

  const quickActions = [
    {
      title: 'Point of Sale',
      description: 'Process dine-in and walk-in orders',
      icon: 'ri-cash-line',
      path: '/admin/pos',
      color: 'bg-green-500'
    },
    {
      title: 'Manage Orders',
      description: 'View and update order status',
      icon: 'ri-shopping-bag-line',
      path: '/admin/orders',
      color: 'bg-blue-500'
    },
    {
      title: 'Manage Menu',
      description: 'Add, edit, or remove menu items',
      icon: 'ri-restaurant-line',
      path: '/admin/menu',
      color: 'bg-orange-500'
    },
    {
      title: 'View Reports',
      description: 'Sales and performance analytics',
      icon: 'ri-bar-chart-line',
      path: '/admin/reports',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-64">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user?.full_name || user?.email}</p>
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900"
                >
                  <i className="ri-notification-line text-xl"></i>
                  {notifications.some(n => n.unread) && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        {notifications.some(n => n.unread) && (
                          <button
                            onClick={markAllNotificationsRead}
                            className="text-sm text-orange-600 hover:text-orange-700"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                              notification.unread ? 'bg-orange-50' : ''
                            }`}
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            <div className="flex items-start">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                notification.type === 'new_order' ? 'bg-green-100' : 'bg-blue-100'
                              }`}>
                                <i className={`${
                                  notification.type === 'new_order' ? 'ri-shopping-bag-line text-green-600' : 'ri-refresh-line text-blue-600'
                                } text-sm`}></i>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                                <p className="text-xs text-gray-600">{notification.time}</p>
                              </div>
                              {notification.unread && (
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <i className="ri-notification-off-line text-2xl mb-2"></i>
                          <p className="text-sm">No notifications</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 border-t border-gray-200">
                      <button className="w-full text-center text-sm text-orange-600 hover:text-orange-700">
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}

                {/* Overlay to close dropdown */}
                {showNotifications && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotifications(false)}
                  ></div>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-shopping-bag-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today's Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today's Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPesoSimple(stats.todaySales)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-time-line text-xl text-orange-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-check-line text-xl text-purple-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => navigate(action.path)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                        <i className={`${action.icon} text-white`}></i>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                  <Button
                    onClick={() => navigate('/admin/orders')}
                    variant="outline"
                    className="text-sm px-4 py-2 whitespace-nowrap"
                  >
                    View All
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length > 0 ? (
                        recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-gray-100">
                            <td className="py-3 px-4">#{order.id.slice(-4)}</td>
                            <td className="py-3 px-4">{order.customer_name}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">{formatPesoSimple(parseFloat(order.total_amount))}</td>
                            <td className="py-3 px-4">{getTimeAgo(order.created_at)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No orders found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Notifications Panel */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.unread
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        notification.type === 'new_order' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <i className={`${
                          notification.type === 'new_order' ? 'ri-shopping-bag-line text-green-600' : 'ri-refresh-line text-blue-600'
                        } text-sm`}></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-600">{notification.time}</p>
                      </div>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <i className="ri-notification-off-line text-2xl mb-2"></i>
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
