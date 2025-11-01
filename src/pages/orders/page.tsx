
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useBanStatus } from '../../hooks/useBanStatus';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import { formatPesoSimple } from '../../lib/currency';
import BottomNavigation from '../../components/feature/BottomNavigation';
import BannedUserWarning from '../../components/feature/BannedUserWarning';
import Button from '../../components/base/Button';

export default function Orders() {
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const { fetchUserOrders } = useOrders();
  const banStatus = useBanStatus();
  const { isKioskMode } = useKioskAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');

  // Redirect to menu if in kiosk mode
  useEffect(() => {
    if (isKioskMode) {
      navigate('/menu', { replace: true });
      return;
    }
  }, [isKioskMode, navigate]);

  useEffect(() => {
    // Don't redirect if still loading auth state
    if (isLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch real orders from database
    const loadUserOrders = async () => {
      try {
        setOrdersLoading(true);
        const userOrders = await fetchUserOrders(user.id);
        setOrders(userOrders);
      } catch (error) {
        console.error('Error loading user orders:', error);
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    loadUserOrders();
  }, [user, navigate, isLoading, fetchUserOrders]);

  // Enhanced status configuration with icons and descriptions
  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
        icon: 'ri-time-line',
        description: 'Order received and being processed',
        progress: 20
      },
      preparing: {
        color: 'text-blue-700 bg-blue-100 border-blue-200',
        icon: 'ri-restaurant-2-line',
        description: 'Your order is being prepared',
        progress: 50
      },
      ready: {
        color: 'text-purple-700 bg-purple-100 border-purple-200',
        icon: 'ri-check-double-line',
        description: 'Order is ready for pickup/delivery',
        progress: 80
      },
      out_for_delivery: {
        color: 'text-indigo-700 bg-indigo-100 border-indigo-200',
        icon: 'ri-truck-line',
        description: 'Order is on the way to you',
        progress: 90
      },
      completed: {
        color: 'text-green-700 bg-green-100 border-green-200',
        icon: 'ri-check-line',
        description: 'Order completed successfully',
        progress: 100
      },
      cancelled: {
        color: 'text-red-700 bg-red-100 border-red-200',
        icon: 'ri-close-line',
        description: 'Order has been cancelled',
        progress: 0
      }
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Filter and sort orders
  const filteredAndSortedOrders = orders
    .filter(order => filterStatus === 'all' || order.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount':
          return b.total_amount - a.total_amount;
        default:
          return 0;
      }
    });

  // Show loading spinner while checking auth or ban status
  if (isLoading || banStatus.isLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Orders</h2>
          <p className="text-gray-600">Please wait while we fetch your order history...</p>
        </div>
      </div>
    );
  }

  // Show banned user warning if user is banned
  if (banStatus.isBanned) {
    return (
      <BannedUserWarning
        banReason={banStatus.banReason!}
        customReason={banStatus.customReason}
        bannedUntil={banStatus.bannedUntil}
        banMessage={banStatus.banMessage}
        onLogout={logout}
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-20 lg:pb-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 mr-4 group"
              >
                <i className="ri-arrow-left-line text-xl group-hover:transform group-hover:-translate-x-1 transition-transform duration-300"></i>
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 animate-fade-in">
                  My Orders
                </h1>
                <p className="text-orange-100 animate-fade-in">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'} • Track your order history
                </p>
              </div>
            </div>
            
            {/* Order Stats */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{orders.filter(o => o.status === 'completed').length}</div>
                <div className="text-xs text-orange-100">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{orders.filter(o => ['pending', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length}</div>
                <div className="text-xs text-orange-100">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {orders.length === 0 ? (
          /* Enhanced Empty State */
          <div className="text-center py-16 sm:py-20">
            <div className="max-w-md mx-auto">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
                <i className="ri-shopping-bag-line text-5xl text-orange-600"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">
                No Orders Yet
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed animate-fade-in">
                You haven't placed any orders yet. Start browsing our delicious menu and place your first order!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                <Button
                  onClick={() => navigate('/menu')}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg font-semibold"
                >
                  <i className="ri-restaurant-line mr-3"></i>
                  Browse Menu
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
                >
                  <i className="ri-home-line mr-3"></i>
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Enhanced Filters and Sorting */}
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Filter by Status */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Filter by Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'pending', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                            filterStatus === status
                              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {status === 'all' ? 'All Orders' : formatStatus(status)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div className="lg:w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Sort by</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="amount">Highest Amount</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Orders List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedOrders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Order Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            Order #{order.id.slice(-6)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })} at {new Date(order.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        {/* Enhanced Status Badge */}
                        <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${statusConfig.color} flex items-center gap-2`}>
                          <i className={`${statusConfig.icon} text-sm`}></i>
                          {formatStatus(order.status)}
                        </div>
                      </div>

                      {/* Status Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <span>Order Progress</span>
                          <span>{statusConfig.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              order.status === 'cancelled' 
                                ? 'bg-red-500' 
                                : 'bg-gradient-to-r from-orange-500 to-red-500'
                            }`}
                            style={{ width: `${statusConfig.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{statusConfig.description}</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="px-6 pb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <i className="ri-restaurant-line text-orange-500"></i>
                        Order Items ({order.order_items?.length || 0})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {order.order_items?.map((item: any, itemIndex: number) => (
                          <div key={itemIndex} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-3">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {item.quantity}x {item.food_items?.name || 'Unknown Item'}
                              </div>
                              {item.size_name && (
                                <div className="text-gray-500 text-xs">Size: {item.size_name}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-orange-600">
                                {formatPesoSimple(item.total_price)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatPesoSimple(item.unit_price)} each
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Footer */}
                    <div className="bg-gray-50 px-4 sm:px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                            {formatPesoSimple(order.total_amount)}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <i className={`${order.order_type === 'delivery' ? 'ri-truck-line' : 'ri-store-2-line'} text-orange-500`}></i>
                            {order.order_type === 'delivery' ? 'Delivery' : 'Pickup'}
                          </div>
                        </div>
                        
                        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
                          <Button
                            onClick={() => navigate(`/order/${order.id}`)}
                            variant="outline"
                            className="text-sm px-3 sm:px-4 py-2 border-orange-300 text-orange-600 hover:bg-orange-50 flex-1 sm:flex-none whitespace-nowrap"
                          >
                            <i className="ri-eye-line mr-1 sm:mr-2"></i>
                            <span className="hidden xs:inline">View Details</span>
                            <span className="xs:hidden">Details</span>
                          </Button>
                          
                          {order.status === 'completed' && (
                            <Button
                              onClick={() => navigate('/menu')}
                              className="text-sm px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex-1 sm:flex-none whitespace-nowrap"
                            >
                              <i className="ri-repeat-line mr-1 sm:mr-2"></i>
                              Reorder
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* No Results Message */}
            {filteredAndSortedOrders.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-search-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Orders Found</h3>
                <p className="text-gray-600 mb-4">
                  No orders match your current filter criteria.
                </p>
                <Button
                  onClick={() => setFilterStatus('all')}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}
