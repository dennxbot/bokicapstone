
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

  if (isLoadingData || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <i className="ri-loader-4-line text-4xl text-orange-600 animate-spin mb-4"></i>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-64">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
                <p className="text-gray-600">View detailed sales analytics from database</p>
              </div>
              <Button
                onClick={exportReport}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 whitespace-nowrap"
              >
                <i className="ri-download-line mr-2"></i>
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Date Range Selector */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Report Period</h2>
              <div className="flex space-x-1">
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' }
                ].map((period) => (
                  <button
                    key={period.key}
                    onClick={() => setDateRange(period.key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      dateRange === period.key
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-shopping-bag-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.totalOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-money-dollar-circle-line text-xl text-green-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPesoSimple(reportData.totalSales)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <i className="ri-bar-chart-line text-xl text-purple-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatPesoSimple(reportData.avgOrderValue)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Selling Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Top Selling Items</h3>
              {reportData.topSellingItems.length > 0 ? (
                <div className="space-y-4">
                  {reportData.topSellingItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-bold text-orange-600">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">{item.quantity} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <p className="font-semibold text-green-600">{formatPesoSimple(item.revenue)}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-shopping-cart-line text-3xl mb-2"></i>
                  <p>No sales data for this period</p>
                </div>
              )}
            </div>

            {/* Order Status Breakdown */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Orders by Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full mr-3"></div>
                    <span>Pending</span>
                  </div>
                  <span className="font-semibold">{reportData.ordersByStatus.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-400 rounded-full mr-3"></div>
                    <span>Preparing</span>
                  </div>
                  <span className="font-semibold">{reportData.ordersByStatus.preparing}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-400 rounded-full mr-3"></div>
                    <span>Ready</span>
                  </div>
                  <span className="font-semibold">{reportData.ordersByStatus.ready}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-400 rounded-full mr-3"></div>
                    <span>Out for Delivery</span>
                  </div>
                  <span className="font-semibold">{reportData.ordersByStatus.out_for_delivery}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-400 rounded-full mr-3"></div>
                    <span>Completed</span>
                  </div>
                  <span className="font-semibold">{reportData.ordersByStatus.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-400 rounded-full mr-3"></div>
                    <span>Cancelled</span>
                  </div>
                  <span className="font-semibold">{reportData.ordersByStatus.cancelled}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Sales Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Sales Trend</h3>
            {reportData.dailySales.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex items-end space-x-2 h-64 min-w-full">
                  {reportData.dailySales.map((day, index) => {
                    const maxSales = Math.max(...reportData.dailySales.map(d => d.sales));
                    const height = maxSales > 0 ? (day.sales / maxSales) * 200 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="text-xs text-gray-600 mb-2">{formatPesoSimple(day.sales)}</div>
                        <div
                          className="bg-orange-400 rounded-t w-full min-w-8"
                          style={{ height: `${Math.max(height, 4)}px` }}
                        ></div>
                        <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-bar-chart-line text-3xl mb-2"></i>
                <p>No sales data for this period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
