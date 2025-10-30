
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { formatPesoSimple } from '../../../lib/currency';
import AdminSidebar from '../../../components/feature/AdminSidebar';
import Button from '../../../components/base/Button';
import BanHistoryModal from '../../../components/feature/BanHistoryModal';

interface Customer {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  created_at: string;
  isBanned?: boolean;
  banReason?: string;
  bannedUntil?: string;
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
  const { isLoading, isAuthenticated, isAdmin, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [showCustomerOrders, setShowCustomerOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBanModal, setShowBanModal] = useState(false);
  const [customerToBan, setCustomerToBan] = useState<Customer | null>(null);
  const [banReason, setBanReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');
  const [banNotes, setBanNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBanHistory, setShowBanHistory] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.contact_number.toLowerCase().includes(searchLower)
    );
  });

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

      // Fetch active ban information from customer_bans table
      const { data: banInfo, error: banError } = await supabase
        .from('customer_bans')
        .select('user_id, ban_reason, custom_reason, banned_until, is_active')
        .eq('is_active', true);

      if (banError) throw banError;

      // Calculate customer statistics
      const customersWithStats = users?.map(user => {
        const userOrders = orders?.filter(order => order.user_id === user.id) || [];
        const totalOrders = userOrders.length;
        // Exclude cancelled orders from total spent calculation
        const totalSpent = userOrders
          .filter(order => order.status !== 'cancelled')
          .reduce((sum, order) => sum + parseFloat(order.total_amount || '0'), 0);
        const lastOrder = userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Check ban status from customer_bans table
        const activeBan = banInfo?.find(ban => ban.user_id === user.id);
        const isBanned = activeBan && (
          !activeBan.banned_until || // Permanent ban (no end date)
          new Date(activeBan.banned_until) > new Date() // Temporary ban still active
        );

        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          contact_number: user.contact_number || 'N/A',
          totalOrders,
          totalSpent,
          lastOrderDate: lastOrder ? lastOrder.created_at : user.created_at,
          created_at: user.created_at,
          isBanned: !!isBanned,
          banReason: activeBan?.ban_reason || '',
          bannedUntil: activeBan?.banned_until || ''
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

  const handleBackToCustomers = async () => {
    setShowCustomerOrders(false);
    // Refresh customer data to ensure it's up-to-date
    await fetchCustomers();
  };

  const openBanModal = (customer: Customer) => {
    setCustomerToBan(customer);
    setShowBanModal(true);
    setBanReason('');
    setCustomReason('');
    setBanDuration('permanent');
    setBanNotes('');
  };

  const closeBanModal = () => {
    setShowBanModal(false);
    setCustomerToBan(null);
    setBanReason('');
    setCustomReason('');
    setBanDuration('permanent');
    setBanNotes('');
  };

  const handleBanCustomer = async () => {
    if (!customerToBan || !banReason || !user) return;

    try {
      setIsSubmitting(true);

      let bannedUntil = null;
      if (banDuration !== 'permanent') {
        const now = new Date();
        const days = parseInt(banDuration);
        bannedUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase.rpc('ban_customer', {
        p_user_id: customerToBan.id,
        p_banned_by: user.id,
        p_ban_reason: banReason,
        p_custom_reason: banReason === 'other' ? customReason : null,
        p_banned_until: bannedUntil,
        p_notes: banNotes || null
      });

      if (error) throw error;

      closeBanModal();
      fetchCustomers(); // Refresh the customer list
    } catch (error) {
      console.error('Error banning customer:', error);
      alert('Failed to ban customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnbanCustomer = async (customer: Customer) => {
    if (!user) return;

    if (!confirm(`Are you sure you want to unban ${customer.full_name}?`)) return;

    try {
      const { error } = await supabase.rpc('unban_customer', {
        p_user_id: customer.id,
        p_unbanned_by: user.id
      });

      if (error) throw error;

      fetchCustomers(); // Refresh the customer list
    } catch (error) {
      console.error('Error unbanning customer:', error);
      alert('Failed to unban customer. Please try again.');
    }
  };

  const getBanReasonLabel = (reason: string) => {
    const reasons = {
      'fake_orders': 'Fake/Fraudulent Orders',
      'payment_abuse': 'Payment Abuse',
      'frequent_cancellations': 'Frequent Cancellations',
      'abusive_behavior': 'Abusive Behavior',
      'multiple_fake_accounts': 'Multiple Fake Accounts',
      'false_reports': 'False Reports/Scams',
      'policy_violations': 'Policy Violations',
      'other': 'Other'
    };
    return reasons[reason as keyof typeof reasons] || reason;
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
                  <Button
                    onClick={fetchCustomers}
                    variant="outline"
                    className="bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 px-4 py-2 font-semibold rounded-xl transition-all duration-200 hover:scale-105"
                    disabled={loading}
                  >
                    <i className="ri-refresh-line mr-2"></i>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
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
                    onClick={handleBackToCustomers}
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
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-search-line text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white/70 backdrop-blur-sm placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
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
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Status</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Last Order</th>
                      <th className="text-left py-4 px-6 font-bold text-gray-700 border-b border-gray-200/50">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer, index) => (
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
                            {customer.isBanned ? (
                              <div className="flex items-center">
                                <div className="bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                                  <div className="flex items-center">
                                    <i className="ri-forbid-line text-red-600 mr-2"></i>
                                    <div>
                                      <span className="text-sm font-bold text-red-700">BANNED</span>
                                      {customer.banReason && (
                                        <p className="text-xs text-red-600 mt-1">
                                          {getBanReasonLabel(customer.banReason)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <div className="bg-green-100 border border-green-200 rounded-lg px-3 py-2">
                                  <div className="flex items-center">
                                    <i className="ri-check-line text-green-600 mr-2"></i>
                                    <span className="text-sm font-bold text-green-700">ACTIVE</span>
                                  </div>
                                </div>
                              </div>
                            )}
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
                            <div className="flex items-center space-x-2">
                              <Button
                                onClick={() => viewCustomerOrders(customer)}
                                className={`px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 ${
                                  customer.totalOrders === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
                                }`}
                                disabled={customer.totalOrders === 0}
                              >
                                <i className="ri-eye-line mr-1"></i>
                                View Orders
                              </Button>
                              
                              {customer.isBanned ? (
                                <Button
                                  onClick={() => handleUnbanCustomer(customer)}
                                  className="px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl"
                                >
                                  <i className="ri-check-line mr-1"></i>
                                  Unban
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => openBanModal(customer)}
                                  className="px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl"
                                >
                                  <i className="ri-forbid-line mr-1"></i>
                                  Ban
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => {
                                  setSelectedCustomerForHistory(customer);
                                  setShowBanHistory(true);
                                }}
                                className="px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl"
                              >
                                <i className="ri-history-line mr-1"></i>
                                History
                              </Button>
                            </div>
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

      {/* Ban Customer Modal */}
      {showBanModal && customerToBan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Ban Customer</h3>
              <button
                onClick={closeBanModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                You are about to ban <strong>{customerToBan.full_name}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Email: {customerToBan.email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ban Reason *
                </label>
                <select
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="fake_orders">Fake or fraudulent orders</option>
                  <option value="payment_abuse">Payment abuse</option>
                  <option value="frequent_cancellations">Frequent order cancellations</option>
                  <option value="abusive_behavior">Abusive behavior</option>
                  <option value="multiple_accounts">Multiple fake accounts</option>
                  <option value="false_reports">False reports or scams</option>
                  <option value="policy_violations">Policy violations</option>
                  <option value="other">Other (specify below)</option>
                </select>
              </div>

              {banReason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Reason *
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom ban reason"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ban Duration *
                </label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                >
                  <option value="">Select duration</option>
                  <option value="1">1 Day</option>
                  <option value="3">3 Days</option>
                  <option value="7">1 Week</option>
                  <option value="30">1 Month</option>
                  <option value="90">3 Months</option>
                  <option value="365">1 Year</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={banNotes}
                  onChange={(e) => setBanNotes(e.target.value)}
                  placeholder="Add any additional notes about this ban..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <Button
                onClick={closeBanModal}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBanCustomer}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={isSubmitting || !banReason || !banDuration || (banReason === 'other' && !customReason)}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Banning...
                  </div>
                ) : (
                  'Ban Customer'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ban History Modal */}
       {showBanHistory && selectedCustomerForHistory && (
         <BanHistoryModal
           customerId={selectedCustomerForHistory.id}
           customerName={selectedCustomerForHistory.full_name}
           customerEmail={selectedCustomerForHistory.email}
           isOpen={showBanHistory}
           onClose={() => {
             setShowBanHistory(false);
             setSelectedCustomerForHistory(null);
           }}
         />
       )}
    </div>
  );
};

export default AdminCustomers;
