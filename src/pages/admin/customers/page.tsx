
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
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-64">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600">Manage all customer information</p>
          </div>
        </div>

        {showCustomerOrders && selectedCustomer ? (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{selectedCustomer.full_name}'s Orders</h2>
                  <p className="text-gray-600">{selectedCustomer.email}</p>
                </div>
                <Button
                  onClick={() => setShowCustomerOrders(false)}
                  variant="outline"
                  className="border-gray-300 text-gray-700 px-4 py-2 whitespace-nowrap"
                >
                  Back to Customers
                </Button>
              </div>

              <div className="space-y-4">
                {customerOrders.length > 0 ? (
                  customerOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">Order #{order.id.slice(-8)}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                          </p>
                          <div className="space-y-1">
                            {order.order_items?.map((item, index) => (
                              <p key={index} className="text-sm text-gray-700">
                                • {item.quantity}x {item.food_item?.name || 'Unknown Item'}
                                {item.size_name && (
                                  <span className="text-gray-500 ml-1">({item.size_name})</span>
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600">{formatPesoSimple(order.total_amount)}</p>
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="ri-shopping-bag-line text-4xl mb-4"></i>
                    <p>No orders found for this customer</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Customer Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-user-line text-xl text-blue-600"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-shopping-bag-line text-xl text-green-600"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {customers.reduce((sum, customer) => sum + customer.totalOrders, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-money-dollar-circle-line text-xl text-purple-600"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPesoSimple(customers.reduce((sum, customer) => sum + customer.totalSpent, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-user-star-line text-xl text-orange-600"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {customers.length > 0 && customers.reduce((sum, customer) => sum + customer.totalOrders, 0) > 0
                        ? formatPesoSimple(customers.reduce((sum, customer) => sum + customer.totalSpent, 0) / 
                           customers.reduce((sum, customer) => sum + customer.totalOrders, 0))
                        : formatPesoSimple(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">All Customers</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-6 font-semibold text-gray-700">Customer</th>
                      <th className="text-left py-3 px-6 font-semibold text-gray-700">Contact</th>
                      <th className="text-left py-3 px-6 font-semibold text-gray-700">Orders</th>
                      <th className="text-left py-3 px-6 font-semibold text-gray-700">Total Spent</th>
                      <th className="text-left py-3 px-6 font-semibold text-gray-700">Last Order</th>
                      <th className="text-left py-3 px-6 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length > 0 ? (
                      customers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <div>
                              <h3 className="font-semibold text-gray-900">{customer.full_name}</h3>
                              <p className="text-sm text-gray-600">{customer.email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <p className="text-sm text-gray-900">{customer.contact_number}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-gray-900">{customer.totalOrders}</span>
                          </td>
                          <td className="py-3 px-4">{formatPesoSimple(customer.totalSpent)}</td>
                          <td className="py-4 px-6">
                            <span className="text-sm text-gray-600">
                              {customer.totalOrders > 0 
                                ? new Date(customer.lastOrderDate).toLocaleDateString()
                                : 'No orders'
                              }
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <Button
                              onClick={() => viewCustomerOrders(customer)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm whitespace-nowrap"
                              disabled={customer.totalOrders === 0}
                            >
                              View Orders
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No customers found
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
