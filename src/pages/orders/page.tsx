
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOrders } from '../../hooks/useOrders';
import { useBanStatus } from '../../hooks/useBanStatus';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';
import BannedUserWarning from '../../components/feature/BannedUserWarning';

const Orders = () => {
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const { fetchUserOrders } = useOrders();
  const banStatus = useBanStatus();
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'preparing':
        return 'text-blue-600 bg-blue-100';
      case 'ready':
        return 'text-purple-600 bg-purple-100';
      case 'out_for_delivery':
        return 'text-purple-600 bg-purple-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Show loading spinner while checking auth or ban status
  if (isLoading || banStatus.isLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => navigate('/')} className="mr-4 cursor-pointer">
              <i className="ri-arrow-left-line text-xl"></i>
            </button>
            <h1 className="text-xl font-bold">My Orders</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-shopping-bag-line text-3xl text-gray-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Orders Yet</h2>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet. Start browsing our delicious menu!</p>
            <Button onClick={() => navigate('/')} className="cursor-pointer">Browse Menu</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">Order #{order.id.slice(-4)}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {formatStatus(order.status)}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {order.order_items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <span>{item.quantity}x {item.food_items?.name || 'Unknown Item'}</span>
                        {item.size_name && (
                          <span className="text-gray-500 ml-2">({item.size_name})</span>
                        )}
                      </div>
                      <span>{formatPesoSimple(item.total_price)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <div>
                    <p className="font-semibold text-lg">{formatPesoSimple(order.total_amount)}</p>
                    <p className="text-sm text-gray-600 capitalize">{order.order_type}</p>
                  </div>
                  <Button
                    onClick={() => navigate(`/order/${order.id}`)}
                    variant="outline"
                    className="text-sm px-4 py-2 whitespace-nowrap cursor-pointer"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
