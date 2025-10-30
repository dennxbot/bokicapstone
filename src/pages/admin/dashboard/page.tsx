
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
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
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
                  Dashboard Overview
                </h1>
                <p className="text-slate-600 mt-1 font-medium">Welcome back! Here's what's happening with your restaurant today.</p>
              </div>
              
              {/* Notification Bell */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-3 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <i className="ri-notification-line text-lg"></i>
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200/50 z-50 max-h-96 overflow-y-auto">
                      <div className="p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                      </div>
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {notifications.slice(0, 5).map((notification, index) => (
                            <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <i className="ri-shopping-bag-line text-orange-600 text-sm"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <i className="ri-notification-off-line text-3xl mb-2"></i>
                          <p>No new notifications</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
                  <p className="text-blue-100 text-xs mt-2">
                    <i className="ri-arrow-up-line mr-1"></i>
                    +12% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className="ri-shopping-bag-line text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">{formatPesoSimple(stats.totalRevenue)}</p>
                  <p className="text-emerald-100 text-xs mt-2">
                    <i className="ri-arrow-up-line mr-1"></i>
                    +8% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className="ri-money-peso-circle-line text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Pending Orders</p>
                  <p className="text-3xl font-bold mt-1">{stats.pendingOrders}</p>
                  <p className="text-amber-100 text-xs mt-2">
                    <i className="ri-time-line mr-1"></i>
                    Needs attention
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className="ri-time-line text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Menu Items</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalMenuItems}</p>
                  <p className="text-purple-100 text-xs mt-2">
                    <i className="ri-restaurant-line mr-1"></i>
                    Active items
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <i className="ri-restaurant-line text-xl"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Today's Orders</h3>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <i className="ri-calendar-line text-blue-600"></i>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.todayOrders}</p>
              <p className="text-sm text-gray-600">
                <span className="text-green-600 font-medium">
                  <i className="ri-arrow-up-line"></i> +15%
                </span> vs yesterday
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Today's Sales</h3>
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <i className="ri-line-chart-line text-emerald-600"></i>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{formatPesoSimple(stats.todaySales)}</p>
              <p className="text-sm text-gray-600">
                <span className="text-green-600 font-medium">
                  <i className="ri-arrow-up-line"></i> +22%
                </span> vs yesterday
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Completed Orders</h3>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <i className="ri-check-line text-green-600"></i>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stats.completedOrders}</p>
              <p className="text-sm text-gray-600">
                <span className="text-green-600 font-medium">
                  <i className="ri-check-line"></i> Excellent
                </span> completion rate
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center mr-3">
                    <i className="ri-flashlight-line text-white text-sm"></i>
                  </div>
                  Quick Actions
                </h2>
                <p className="text-gray-600 text-sm mt-1">Manage your restaurant efficiently</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      title: 'View Orders',
                      description: 'Manage customer orders',
                      icon: 'ri-shopping-bag-line',
                      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
                      path: '/admin/orders'
                    },
                    {
                      title: 'Add Menu Item',
                      description: 'Create new dishes',
                      icon: 'ri-add-line',
                      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
                      path: '/admin/menu'
                    },
                    {
                      title: 'View Reports',
                      description: 'Analytics & insights',
                      icon: 'ri-bar-chart-line',
                      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
                      path: '/admin/reports'
                    },
                    {
                      title: 'Manage Categories',
                      description: 'Organize menu items',
                      icon: 'ri-folder-line',
                      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
                      path: '/admin/categories'
                    }
                  ].map((action, index) => (
                    <button
                      key={index}
                      onClick={() => navigate(action.path)}
                      className="group p-4 border border-gray-200/50 rounded-xl hover:bg-gray-50/50 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg"
                    >
                      <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-all duration-200`}>
                        <i className={`${action.icon} text-white text-lg`}></i>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-800">{action.title}</h3>
                      <p className="text-sm text-gray-600 group-hover:text-gray-700">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Recent Orders */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-time-line text-white text-sm"></i>
                      </div>
                      Recent Orders
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">Latest customer orders</p>
                  </div>
                  <Button
                    onClick={() => navigate('/admin/orders')}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-4 py-2 text-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    View All
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                {recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100/50 hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            #{order.id.slice(-3)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{order.customer_name}</p>
                            <p className="text-sm text-gray-600">{formatPesoSimple(order.total_amount)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="ri-shopping-bag-line text-4xl mb-4 text-gray-300"></i>
                    <p className="font-medium">No recent orders</p>
                    <p className="text-sm">Orders will appear here when customers place them</p>
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
