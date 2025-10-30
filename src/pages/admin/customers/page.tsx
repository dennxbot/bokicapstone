
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { formatPesoSimple } from '../../../lib/currency';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/base/Button';
import AdminSidebar from '../../../components/feature/AdminSidebar';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  created_at: string;
}

interface CustomerOrder {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  order_items: {
    food_item: {
      name: string;
    };
    quantity: number;
    size_name?: string;
  }[];
}

const AdminCustomers = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [showCustomerOrders, setShowCustomerOrders] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchCustomers();
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Fetch all users with their order statistics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch orders for each user to calculate statistics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_amount, created_at, status');

      if (ordersError) throw ordersError;

      // Calculate customer statistics
      const customersWithStats = users?.map(user => {
        const userOrders = orders?.filter(order => order.user_id === user.id) || [];
        const totalOrders = userOrders.length;
        const totalSpent = userOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
        const lastOrder = userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          contact_number: user.contact_number || 'N/A',
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder ? lastOrder.created_at : user.created_at,
          created_at: user.created_at
        };
      }) || [];

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerOrders = async (customer: Customer) => {
    try {
      setSelectedCustomer(customer);
      
      // Fetch customer's orders with order items and food item details
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          total_amount,
          status,
          order_items (
            quantity,
            size_name,
            food_item:food_items (
              name
            )
          )
        `)
        .eq('user_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCustomerOrders((orders as unknown as CustomerOrder[]) || []);
      setShowCustomerOrders(true);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Show loading while checking authentication
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
        <AdminSidebar />
        
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Customers</h3>
            <p className="text-gray-600">Please wait while we fetch your data...</p>
          </div>
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
                  Customer Management
                </h1>
                <p className="text-slate-600 mt-1 font-medium">View and manage customer information and order history</p>
              </div>
              
              {!showCustomerOrders && (
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
                    <div className="text-xs text-gray-600 font-medium">Total Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {customers.reduce((sum, customer) => sum + customer.totalOrders, 0)}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPesoSimple(customers.reduce((sum, customer) => sum + customer.totalSpent, 0))}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Total Revenue</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showCustomerOrders && selectedCustomer ? (
          <div className="p-8">
            {/* Customer Orders View */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                      <i className="ri-user-line text-white text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.full_name}'s Orders</h2>
                      <p className="text-gray-600 font-medium">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowCustomerOrders(false)}
                    variant="outline"
                    className="bg-gray-50 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 px-6 py-3 font-semibold rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <i className="ri-arrow-left-line mr-2"></i>
                    Back to Customers
                  </Button>
                </div>
              </div>

              <div className="p-8">
                {customerOrders.length > 0 ? (
                  <div className="space-y-6">
                    {customerOrders.map((order) => (
                      <div key={order.id} className="bg-white/50 border border-gray-200/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-bold text-gray-900">Order #{order.id.slice(-8)}</h3>
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-xl border capitalize ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-4 flex items-center">
                              <i className="ri-calendar-line mr-2"></i>
                              {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                            </p>
                            
                            <div className="bg-gray-50/50 rounded-xl p-4">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <i className="ri-restaurant-line text-orange-600 mr-2"></i>
                                Order Items
                              </h4>
                              <div className="space-y-2">
                                {order.order_items?.map((item, index) => (
                                  <div key={index} className="flex items-center justify-between bg-white/50 rounded-lg p-3">
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                        <span className="text-orange-600 font-bold text-sm">{item.quantity}</span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">{item.food_item?.name || 'Unknown Item'}</p>
                                        {item.size_name && (
                                          <p className="text-xs text-gray-500">Size: {item.size_name}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right ml-6">
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200/50">
                              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                              <p className="text-2xl font-bold text-orange-600">{formatPesoSimple(order.total_amount)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <i className="ri-shopping-bag-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">No Orders Found</h3>
                    <p className="text-gray-600">This customer hasn't placed any orders yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {/* Enhanced Customer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                    <i className="ri-user-line text-2xl text-white"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Customers</p>
                    <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mr-4">
                    <i className="ri-shopping-bag-line text-2xl text-white"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {customers.reduce((sum, customer) => sum + customer.totalOrders, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                    <i className="ri-money-dollar-circle-line text-2xl text-white"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatPesoSimple(customers.reduce((sum, customer) => sum + customer.totalSpent, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mr-4">
                    <i className="ri-user-star-line text-2xl text-white"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg Order Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {customers.length > 0 && customers.reduce((sum, customer) => sum + customer.totalOrders, 0) > 0
                        ? formatPesoSimple(customers.reduce((sum, customer) => sum + customer.totalSpent, 0) / 
                           customers.reduce((sum, customer) => sum + customer.totalOrders, 0))
                        : formatPesoSimple(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Customers Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-team-line text-white text-sm"></i>
                    </div>
                    All Customers
                  </h2>
                  <div className="text-sm text-gray-600 font-medium">
                    {customers.length} customer{customers.length !== 1 ? 's' : ''} registered
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50/80 to-white/80">
                    <tr>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Customer</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Contact</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Orders</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Total Spent</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Last Order</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map((customer, index) => (
                        <tr key={customer.id} className={`border-b border-gray-100/50 hover:bg-gray-50/50 transition-colors ${index % 2 === 0 ? 'bg-white/30' : 'bg-gray-50/30'}`}>
                          <td className="py-5 px-6">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-4">
                                <i className="ri-user-line text-blue-600"></i>
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{customer.full_name}</h3>
                                <p className="text-sm text-gray-600">{customer.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center">
                              <i className="ri-phone-line text-gray-400 mr-2"></i>
                              <p className="text-sm text-gray-900 font-medium">{customer.contact_number}</p>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-2">
                                <span className="text-green-600 font-bold text-sm">{customer.totalOrders}</span>
                              </div>
                              <span className="text-sm text-gray-600">orders</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg px-3 py-2 border border-orange-200/50">
                              <span className="font-bold text-orange-600">{formatPesoSimple(customer.totalSpent)}</span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex items-center">
                              <i className="ri-calendar-line text-gray-400 mr-2"></i>
                              <span className="text-sm text-gray-600 font-medium">
                                {customer.totalOrders > 0 
                                  ? new Date(customer.lastOrderDate).toLocaleDateString()
                                  : 'No orders'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <Button
                              onClick={() => viewCustomerOrders(customer)}
                              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 ${
                                customer.totalOrders === 0
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                              }`}
                              disabled={customer.totalOrders === 0}
                            >
                              <i className="ri-eye-line mr-1"></i>
                              View Orders
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <i className="ri-user-line text-3xl text-gray-400"></i>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-3">No Customers Found</h3>
                          <p className="text-gray-600">No customers have registered yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
