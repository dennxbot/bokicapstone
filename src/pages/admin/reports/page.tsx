
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/base/Button';
import { formatPesoSimple } from '../../../lib/currency';
import AdminSidebar from '../../../components/feature/AdminSidebar';

interface ReportData {
  totalOrders: number;
  totalSales: number;
  avgOrderValue: number;
  topSellingItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    orders: number;
    sales: number;
  }>;
  ordersByStatus: {
    pending: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    completed: number;
    cancelled: number;
  };
}

const AdminReports = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const [dateRange, setDateRange] = useState('today');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchReportData();
  }, [isAuthenticated, isAdmin, isLoading, navigate, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          start: weekStart.toISOString(),
          end: now.toISOString()
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: monthStart.toISOString(),
          end: now.toISOString()
        };
      default:
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
    }
  };

  const fetchReportData = async () => {
    try {
      setIsLoadingData(true);
      const { start, end } = getDateRange();

      // Fetch orders within date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            food_items (
              name
            )
          )
        `)
        .gte('created_at', start)
        .lt('created_at', end);

      if (ordersError) throw ordersError;

      // Calculate basic metrics - exclude cancelled orders from sales
      const nonCancelledOrders = orders?.filter(order => order.status !== 'cancelled') || [];
      const totalOrders = orders?.length || 0;
      const totalSales = nonCancelledOrders.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const avgOrderValue = nonCancelledOrders.length > 0 ? totalSales / nonCancelledOrders.length : 0;

      // Calculate orders by status
      const ordersByStatus = {
        pending: orders?.filter(o => o.status === 'pending').length || 0,
        preparing: orders?.filter(o => o.status === 'preparing').length || 0,
        ready: orders?.filter(o => o.status === 'ready').length || 0,
        out_for_delivery: orders?.filter(o => o.status === 'out_for_delivery').length || 0,
        completed: orders?.filter(o => o.status === 'completed').length || 0,
        cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
      };

      // Calculate top selling items - exclude cancelled orders
      const itemSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
      
      nonCancelledOrders.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const itemName = item.food_items?.name || 'Unknown Item';
          if (!itemSales[itemName]) {
            itemSales[itemName] = { name: itemName, quantity: 0, revenue: 0 };
          }
          itemSales[itemName].quantity += item.quantity;
          itemSales[itemName].revenue += item.total_price;
        });
      });

      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Calculate daily sales for the period - exclude cancelled orders
      const dailySalesMap: { [key: string]: { orders: number; sales: number } } = {};
      
      nonCancelledOrders.forEach(order => {
        const date = order.created_at.split('T')[0];
        if (!dailySalesMap[date]) {
          dailySalesMap[date] = { orders: 0, sales: 0 };
        }
        dailySalesMap[date].orders += 1;
        dailySalesMap[date].sales += order.total_amount;
      });

      const dailySales = Object.entries(dailySalesMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-7); // Last 7 days

      setReportData({
        totalOrders,
        totalSales,
        avgOrderValue,
        topSellingItems,
        dailySales,
        ordersByStatus,
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Total Orders', reportData.totalOrders.toString()],
      ['Total Sales', `$${reportData.totalSales.toFixed(2)}`],
      ['Average Order Value', `$${reportData.avgOrderValue.toFixed(2)}`],
      [''],
      ['Orders by Status', ''],
      ['Pending', reportData.ordersByStatus.pending.toString()],
      ['Preparing', reportData.ordersByStatus.preparing.toString()],
      ['Ready', reportData.ordersByStatus.ready.toString()],
      ['Out for Delivery', reportData.ordersByStatus.out_for_delivery.toString()],
      ['Completed', reportData.ordersByStatus.completed.toString()],
      ['Cancelled', reportData.ordersByStatus.cancelled.toString()],
      [''],
      ['Top Selling Items', ''],
      ['Item Name', 'Quantity', 'Revenue'],
      ...reportData.topSellingItems.map(item => [
        item.name,
        item.quantity.toString(),
        `$${item.revenue.toFixed(2)}`
      ]),
      [''],
      ['Daily Sales', ''],
      ['Date', 'Orders', 'Sales'],
      ...reportData.dailySales.map(day => [
        day.date,
        day.orders.toString(),
        `$${day.sales.toFixed(2)}`
      ])
    ].map(row => row.join(',')).join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
        <AdminSidebar />
        
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Reports</h3>
            <p className="text-gray-600">Please wait while we fetch your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  if (isLoadingData || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
        <AdminSidebar />
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-loader-4-line text-2xl text-white animate-spin"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating Reports</h3>
            <p className="text-gray-600">Analyzing your sales data...</p>
          </div>
        </div>
      </div>
    );
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
                  Sales Reports & Analytics
                </h1>
                <p className="text-slate-600 mt-1 font-medium">Comprehensive insights into your restaurant's performance</p>
              </div>
              <Button
                onClick={exportReport}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <i className="ri-download-line mr-2"></i>
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Enhanced Date Range Selector */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                  <i className="ri-calendar-line text-white text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Report Period</h2>
                  <p className="text-sm text-gray-600 font-medium">Select the time range for your analytics</p>
                </div>
              </div>
              <div className="flex space-x-2">
                {[
                  { key: 'today', label: 'Today', icon: 'ri-sun-line' },
                  { key: 'week', label: 'This Week', icon: 'ri-calendar-week-line' },
                  { key: 'month', label: 'This Month', icon: 'ri-calendar-month-line' }
                ].map((period) => (
                  <button
                    key={period.key}
                    onClick={() => setDateRange(period.key)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center ${
                      dateRange === period.key
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    <i className={`${period.icon} mr-2`}></i>
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                  <i className="ri-shopping-bag-line text-2xl text-white"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{reportData.totalOrders}</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">All order statuses</p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4">
                  <i className="ri-money-dollar-circle-line text-2xl text-white"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Sales</p>
                  <p className="text-3xl font-bold text-gray-900">{formatPesoSimple(reportData.totalSales)}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">Excluding cancelled orders</p>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                  <i className="ri-bar-chart-line text-2xl text-white"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Avg Order Value</p>
                  <p className="text-3xl font-bold text-gray-900">{formatPesoSimple(reportData.avgOrderValue)}</p>
                  <p className="text-xs text-purple-600 font-medium mt-1">Per successful order</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Enhanced Top Selling Items */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center mr-3">
                    <i className="ri-trophy-line text-white text-sm"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Top Selling Items</h3>
                </div>
              </div>
              <div className="p-6">
                {reportData.topSellingItems.length > 0 ? (
                  <div className="space-y-4">
                    {reportData.topSellingItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50/50 rounded-xl p-4 hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                            index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                            'bg-gradient-to-br from-blue-400 to-blue-500'
                          }`}>
                            <span className="text-sm font-bold text-white">{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{item.name}</h4>
                            <p className="text-sm text-gray-600 font-medium flex items-center">
                              <i className="ri-shopping-cart-line mr-1"></i>
                              {item.quantity} sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg px-3 py-2 border border-emerald-200/50">
                            <p className="font-bold text-emerald-600">{formatPesoSimple(item.revenue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <i className="ri-shopping-cart-line text-2xl text-gray-400"></i>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-2">No Sales Data</h4>
                    <p className="text-gray-600">No items sold during this period</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Order Status Breakdown */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <i className="ri-pie-chart-line text-white text-sm"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Orders by Status</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { key: 'pending', label: 'Pending', color: 'bg-yellow-400', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
                    { key: 'preparing', label: 'Preparing', color: 'bg-blue-400', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
                    { key: 'ready', label: 'Ready', color: 'bg-purple-400', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
                    { key: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-400', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
                    { key: 'completed', label: 'Completed', color: 'bg-green-400', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
                    { key: 'cancelled', label: 'Cancelled', color: 'bg-red-400', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' }
                  ].map((status) => (
                    <div key={status.key} className={`flex items-center justify-between ${status.bgColor} rounded-xl p-4 border ${status.borderColor}`}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 ${status.color} rounded-full mr-3`}></div>
                        <span className={`font-semibold ${status.textColor}`}>{status.label}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`font-bold text-lg ${status.textColor} mr-2`}>
                          {reportData.ordersByStatus[status.key as keyof typeof reportData.ordersByStatus]}
                        </span>
                        <div className={`w-8 h-8 ${status.color} rounded-lg flex items-center justify-center`}>
                          <span className="text-white text-xs font-bold">
                            {reportData.ordersByStatus[status.key as keyof typeof reportData.ordersByStatus]}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Daily Sales Chart */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <i className="ri-line-chart-line text-white text-sm"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Daily Sales Trend</h3>
              </div>
            </div>
            <div className="p-6">
              {reportData.dailySales.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="flex items-end space-x-4 h-80 min-w-full px-4">
                    {reportData.dailySales.map((day, index) => {
                      const maxSales = Math.max(...reportData.dailySales.map(d => d.sales));
                      const height = maxSales > 0 ? (day.sales / maxSales) * 240 : 0;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center group">
                          <div className="text-xs font-semibold text-gray-700 mb-3 bg-gray-100 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatPesoSimple(day.sales)}
                          </div>
                          <div
                            className="bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-lg w-full min-w-12 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer relative"
                            style={{ height: `${Math.max(height, 8)}px` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 to-transparent rounded-t-lg"></div>
                          </div>
                          <div className="text-xs font-medium text-gray-600 mt-3 transform -rotate-45 origin-left whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {day.orders} order{day.orders !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <i className="ri-bar-chart-line text-3xl text-gray-400"></i>
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-3">No Sales Data</h4>
                  <p className="text-gray-600">No sales recorded for this period</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
