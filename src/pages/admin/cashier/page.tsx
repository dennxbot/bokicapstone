import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useOrders } from '../../../hooks/useOrders';
import { useKioskOrders } from '../../../hooks/useKioskOrders';
import { supabase } from '../../../lib/supabase';

import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';
import AdminSidebar from '../../../components/feature/AdminSidebar';

const CashierPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const { orders, isLoading, updateOrderStatus, fetchOrders } = useOrders();
  const { 
    isLoading: isKioskLoading, 
    updateKioskOrderStatus, 
    fetchKioskOrders,
    getCashierOrders 
  } = useKioskOrders();
  
  // State management
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'customer'>('newest');
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    orderId: string;
    isKioskOrder: boolean;
    action: 'confirm' | 'cancel';
    customerName: string;
    amount: number;
  }>({ show: false, orderId: '', isKioskOrder: false, action: 'confirm', customerName: '', amount: 0 });
  
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [cancellationNotes, setCancellationNotes] = useState<string>('');

  const cancellationReasons = [
    { value: 'unpaid_orders', label: 'Unpaid Orders' },
    { value: 'incorrect_orders', label: 'Incorrect Orders' },
    { value: 'duplicate_transactions', label: 'Duplicate Transactions' },
    { value: 'unavailable_items', label: 'Unavailable Items' },
    { value: 'customer_change_of_mind', label: 'Customer Change of Mind' },
    { value: 'cashier_verification_errors', label: 'Cashier Verification Errors' },
    { value: 'abandoned_transactions', label: 'Abandoned Transactions' },
    { value: 'system_or_printer_errors', label: 'System or Printer Errors' },
    { value: 'data_accuracy_issues', label: 'Data Accuracy Issues' },
    { value: 'wrong_order_paid', label: 'Wrong Order Paid' }
  ];
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [notificationState, setNotificationState] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get pending payment orders from both regular orders and kiosk orders
  const pendingPaymentOrders = orders.filter(order => order.status === 'pending_payment');
  const cashierKioskOrders = getCashierOrders();

  // Auto-refresh and sound notification setup
  useEffect(() => {
    // Wait for auth to load before checking
    if (authLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/admin/login');
      return;
    }

    fetchOrders();
    fetchKioskOrders();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
      fetchKioskOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin, authLoading, navigate, fetchOrders, fetchKioskOrders]);

  // Sound notification for new orders
  useEffect(() => {
    const currentOrderCount = pendingPaymentOrders.length + cashierKioskOrders.filter(order => order.status === 'pending_payment').length;
    
    if (lastOrderCount > 0 && currentOrderCount > lastOrderCount) {
      // Play notification sound for new orders
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
    
    setLastOrderCount(currentOrderCount);
  }, [pendingPaymentOrders.length, cashierKioskOrders.length, lastOrderCount]);

  // Enhanced order processing functions
  const handleConfirmPayment = useCallback(async (orderId: string, isKioskOrder: boolean = false) => {
    console.log('handleConfirmPayment called with:', { orderId, isKioskOrder });
    setProcessingOrders(prev => new Set(prev).add(orderId));
    
    try {
      if (isKioskOrder) {
        console.log('Updating kiosk order status to payment_received');
        await updateKioskOrderStatus(orderId, 'payment_received');
      } else {
        console.log('Updating regular order status to preparing');
        await updateOrderStatus(orderId, 'preparing');
      }
      
      // Refresh both order lists
      fetchOrders();
      fetchKioskOrders();
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = 'Payment confirmed successfully!';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
      
    } catch (error) {
      console.error('Error confirming payment:', error);
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = 'Failed to confirm payment. Please try again.';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      setShowConfirmModal({ show: false, orderId: '', isKioskOrder: false, action: 'confirm', customerName: '', amount: 0 });
    }
  }, [updateKioskOrderStatus, updateOrderStatus, fetchOrders, fetchKioskOrders]);

  const handleCancelOrder = useCallback(async (orderId: string, isKioskOrder: boolean = false, cancellationReason?: string, cancellationNotes?: string) => {
    setProcessingOrders(prev => new Set(prev).add(orderId));
    
    try {
      const notes = `Order cancelled by cashier. Reason: ${cancellationReason || 'Not specified'}${cancellationNotes ? `. Notes: ${cancellationNotes}` : ''}`;
      
      if (isKioskOrder) {
        await updateKioskOrderStatus(orderId, 'cancelled', notes, cancellationReason, cancellationNotes);
      } else {
        await updateOrderStatus(orderId, 'cancelled', notes, cancellationReason, cancellationNotes);
      }
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = 'Order cancelled successfully.';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
      
    } catch (error) {
      console.error('Error cancelling order:', error);
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = 'Error cancelling order. Please try again.';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
      setShowConfirmModal({ show: false, orderId: '', isKioskOrder: false, action: 'confirm', customerName: '', amount: 0 });
    }
  }, [updateKioskOrderStatus, updateOrderStatus]);

  const handleMarkComplete = useCallback(async (orderId: string, isKioskOrder: boolean = false) => {
    console.log('handleMarkComplete called with:', { orderId, isKioskOrder });
    setProcessingOrders(prev => new Set(prev).add(orderId));
    
    try {
      if (isKioskOrder) {
        // For kiosk orders, set completed_at timestamp to mark as completed
        console.log('Marking kiosk order as completed');
        await updateKioskOrderStatus(orderId, 'payment_received', 'Order completed by cashier');
        
        // Update the completed_at timestamp directly in the database
        const { error } = await supabase
          .from('kiosk_orders')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', orderId);
          
        if (error) throw error;
        
        // Show success notification for kiosk orders
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = 'Kiosk order completed successfully!';
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 3000);
      } else {
        // For regular orders, move from 'payment_received' to 'preparing'
        console.log('Moving regular order to preparing status');
        await updateOrderStatus(orderId, 'preparing');
        
        // Show success notification for regular orders
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = 'Order sent to kitchen for preparation!';
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 3000);
      }
      
      // Refresh both order lists
      fetchOrders();
      fetchKioskOrders();
      
    } catch (error) {
      console.error('Error marking order as complete:', error);
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = 'Failed to complete order. Please try again.';
      document.body.appendChild(notification);
      setTimeout(() => document.body.removeChild(notification), 3000);
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  }, [updateKioskOrderStatus, updateOrderStatus, fetchOrders, fetchKioskOrders]);

  // Only show kiosk orders in cashier dashboard
  const allPendingOrders = [
    ...cashierKioskOrders.map(order => ({ ...order, isKioskOrder: true }))
  ];

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = allPendingOrders;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order => {
        const searchLower = searchTerm.toLowerCase();
        return (
          order.id.toLowerCase().includes(searchLower) ||
          (order.customer_name && order.customer_name.toLowerCase().includes(searchLower)) ||
          (order.customer_phone && order.customer_phone.toLowerCase().includes(searchLower)) ||
          ((order as any).order_number && (order as any).order_number.toLowerCase().includes(searchLower))
        );
      });
    }

    // No type filter needed since we only show kiosk orders

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_high':
          return (b.total_amount || 0) - (a.total_amount || 0);
        case 'amount_low':
          return (a.total_amount || 0) - (b.total_amount || 0);
        case 'customer':
          return (a.customer_name || '').localeCompare(b.customer_name || '');
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [allPendingOrders, searchTerm, filterType, sortBy]);

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
       </div>
     );
   }

  if (isLoading || isKioskLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          {/* Enhanced Loading Animation */}
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-orange-200 rounded-full animate-spin mx-auto"></div>
            <div className="w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            <div className="w-12 h-12 bg-orange-500 rounded-full mx-auto absolute top-4 left-1/2 transform -translate-x-1/2 animate-pulse"></div>
          </div>
          
          {/* Loading Text with Animation */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 animate-pulse">Loading Cashier Dashboard</h2>
            <div className="flex items-center justify-center space-x-2">
              <p className="text-gray-600 font-medium">Fetching orders</p>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
            
            {/* Loading Progress Indicators */}
            <div className="mt-8 space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Connecting to server...</span>
                <i className="ri-check-line text-green-500"></i>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Loading order data...</span>
                <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full"></div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Preparing dashboard...</span>
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content - Enhanced Responsive Design */}
      <div className="flex-1 ml-0 lg:ml-64">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          {/* Enhanced Header with Advanced Breadcrumb - Mobile Responsive */}
          <div className="mb-6 sm:mb-8">
            {/* Advanced Breadcrumb Navigation - Mobile Responsive */}
            <nav className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm border border-gray-200 overflow-x-auto">
                <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm whitespace-nowrap">
                  <button className="flex items-center text-gray-500 hover:text-orange-600 transition-colors p-1 rounded-lg hover:bg-orange-50">
                    <i className="ri-home-4-line text-base sm:text-lg"></i>
                  </button>
                  <i className="ri-arrow-right-s-line text-gray-300 hidden sm:block"></i>
                  <button className="text-gray-500 hover:text-orange-600 transition-colors px-1 sm:px-2 py-1 rounded-lg hover:bg-orange-50 font-medium hidden sm:block">
                    Admin
                  </button>
                  <i className="ri-arrow-right-s-line text-gray-300 hidden sm:block"></i>
                  <span className="text-orange-600 font-bold bg-orange-50 px-2 sm:px-3 py-1 rounded-lg border border-orange-200 text-xs sm:text-sm">
                    Cashier Dashboard
                  </span>
                </div>
              </div>

              {/* Cancellation Reason Section - Only show for cancel action */}
              {showConfirmModal.action === 'cancel' && (
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 mb-6 sm:mb-8 border border-red-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <i className="ri-error-warning-line mr-2 text-red-600"></i>
                        Cancellation Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-sm"
                        required
                      >
                        <option value="">Select a reason...</option>
                        {cancellationReasons.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <i className="ri-file-text-line mr-2 text-red-600"></i>
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={cancellationNotes}
                        onChange={(e) => setCancellationNotes(e.target.value)}
                        placeholder="Add any additional details about the cancellation..."
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-sm resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Page Status Indicators - Mobile Responsive */}
              <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
                <div className="flex items-center bg-white rounded-xl px-3 sm:px-4 py-2 shadow-sm border border-gray-200 whitespace-nowrap">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm">
                    <div className="w-2 sm:w-3 h-2 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 font-medium">Live Updates</span>
                  </div>
                </div>
                <div className="flex items-center bg-white rounded-xl px-3 sm:px-4 py-2 shadow-sm border border-gray-200 whitespace-nowrap">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm">
                    <i className="ri-time-line text-gray-500"></i>
                    <span className="text-gray-700 font-medium hidden sm:inline">Last updated: {new Date().toLocaleTimeString()}</span>
                    <span className="text-gray-700 font-medium sm:hidden">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </nav>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
              {/* Background Pattern - Hidden on mobile */}
              <div className="absolute top-0 right-0 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-gradient-to-br from-orange-50 to-amber-50 rounded-full -translate-y-16 sm:-translate-y-24 lg:-translate-y-32 translate-x-16 sm:translate-x-24 lg:translate-x-32 opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-24 sm:w-36 lg:w-48 h-24 sm:h-36 lg:h-48 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full translate-y-12 sm:translate-y-18 lg:translate-y-24 -translate-x-12 sm:-translate-x-18 lg:-translate-x-24 opacity-30"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="w-12 sm:w-14 lg:w-16 h-12 sm:h-14 lg:h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                    <i className="ri-cash-line text-lg sm:text-xl lg:text-2xl text-white"></i>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 tracking-tight">Cashier Dashboard</h1>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-600 font-medium mb-2 sm:mb-0">Manage customer payments for kiosk orders</p>
                    <div className="flex items-center mt-2 sm:mt-3 text-xs sm:text-sm">
                      <div className="flex items-center bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full">
                        <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-500 rounded-full animate-pulse mr-1 sm:mr-2"></div>
                        <span className="hidden sm:inline">Live updates every 30s</span>
                        <span className="sm:hidden">Live updates</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Stats Cards - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                  <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border border-amber-100">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-600 mb-1">{filteredAndSortedOrders.length}</div>
                    <div className="text-xs sm:text-sm font-semibold text-amber-700 uppercase tracking-wide">Active Orders</div>
                  </div>
                  <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl lg:rounded-2xl p-4 sm:p-5 lg:p-6 border border-blue-100">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">{allPendingOrders.length}</div>
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">Total Orders</div>
                    <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2 lg:space-x-3 text-xs">
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                        {allPendingOrders.filter(o => o.status === 'pending_payment').length} Pending
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        {allPendingOrders.filter(o => o.status === 'payment_received').length} Paid
                      </span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                        {allPendingOrders.filter(o => o.status === 'cancelled').length} Cancelled
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filters - Mobile Responsive */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                  <i className="ri-filter-3-line mr-2 text-orange-500"></i>
                  <span className="hidden sm:inline">Search & Filter Orders</span>
                  <span className="sm:hidden">Filters</span>
                </h2>
                {(searchTerm || filterType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center transition-colors self-start sm:self-auto"
                  >
                    <i className="ri-close-line mr-1"></i>
                    Clear filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Enhanced Search - Mobile First */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                    <i className="ri-search-line mr-2 text-gray-500"></i>
                    Search Orders
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search by order ID, customer name, phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 text-sm sm:text-base"
                    />
                    <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base"></i>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <i className="ri-close-line text-sm sm:text-base"></i>
                      </button>
                    )}
                  </div>
                </div>

                {/* Enhanced Sort - Mobile Responsive */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center">
                    <i className="ri-sort-desc mr-2 text-gray-500"></i>
                    <span className="hidden sm:inline">Sort By</span>
                    <span className="sm:hidden">Sort</span>
                  </label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all duration-200 appearance-none bg-white cursor-pointer text-sm sm:text-base"
                    >
                      <option value="newest">🕐 Newest</option>
                      <option value="oldest">⏰ Oldest</option>
                      <option value="amount_high">💰 High $</option>
                      <option value="amount_low">💵 Low $</option>
                      <option value="customer">👤 Name</option>
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-sm sm:text-base"></i>
                  </div>
                </div>
              </div>

              {/* Enhanced Filter Summary - Mobile Responsive */}
              {(searchTerm || filterType !== 'all') && (
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className="ri-filter-line text-blue-600"></i>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-blue-800">
                        Showing {filteredAndSortedOrders.length} of {allPendingOrders.length} orders
                      </div>
                      <div className="text-xs text-blue-600">
                        {searchTerm && `Search: "${searchTerm}"`}
                        {searchTerm && filterType !== 'all' && ' • '}
                        {filterType !== 'all' && `Type: ${filterType}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setSortBy('newest');
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Orders List */}
          <div className="space-y-6">
            {filteredAndSortedOrders.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-check-double-line text-3xl text-green-600"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {allPendingOrders.length === 0 ? 'All Caught Up! 🎉' : 'No Matching Orders'}
                </h3>
                <p className="text-gray-600 text-lg mb-6">
                  {allPendingOrders.length === 0 
                    ? 'No orders awaiting payment at the moment. Great job!' 
                    : 'Try adjusting your search or filter criteria to find orders.'}
                </p>
                {(searchTerm || filterType !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setSortBy('newest');
                    }}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg sm:rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center mx-auto text-sm sm:text-base"
                  >
                    <i className="ri-refresh-line mr-1 sm:mr-2"></i>
                    <span className="hidden sm:inline">Clear All Filters</span>
                    <span className="sm:hidden">Clear All</span>
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedOrders.map((order) => (
                <div 
                  key={`${order.isKioskOrder ? 'kiosk' : 'regular'}-${order.id}`} 
                  className={`group bg-white rounded-xl sm:rounded-2xl shadow-lg border hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02] mb-4 sm:mb-6 ${
                    order.status === 'cancelled' 
                      ? 'border-red-200 bg-red-50/30 hover:border-red-300' 
                      : 'border-gray-100 hover:border-orange-200'
                  }`}
                >
                  {/* Enhanced Order Status Indicator Bar - Mobile Responsive */}
                  <div className={`h-1.5 sm:h-2 w-full transition-all duration-300 group-hover:h-2 sm:group-hover:h-3 ${
                    order.status === 'cancelled'
                      ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600'
                      : order.status === 'payment_received' 
                        ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600' 
                        : 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 animate-pulse'
                  }`}></div>
                  
                  <div className="p-4 sm:p-6 relative">
                    {/* Subtle Background Pattern - Hidden on mobile */}
                    <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-full -translate-y-12 sm:-translate-y-16 translate-x-12 sm:translate-x-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:block"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between relative z-10 space-y-4 sm:space-y-0">
                      <div className="flex-1">
                        {/* Enhanced Order Header with Micro-interactions - Mobile Responsive */}
                        <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                          <div className={`w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${
                            order.isKioskOrder 
                              ? 'bg-gradient-to-br from-purple-500 to-purple-600 group-hover:from-purple-600 group-hover:to-purple-700' 
                              : 'bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-600 group-hover:to-blue-700'
                          }`}>
                            <span className="transform group-hover:scale-110 transition-transform duration-200">
                              {order.isKioskOrder ? (order as any).order_number?.slice(-3) || 'KS' : `#${order.id.slice(-3)}`}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300 transform group-hover:translate-x-1 truncate">
                                {order.customer_name}
                              </h3>
                              <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm transform group-hover:scale-105 transition-all duration-200 self-start ${
                                order.isKioskOrder 
                                  ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300 group-hover:from-purple-200 group-hover:to-purple-300' 
                                  : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 group-hover:from-blue-200 group-hover:to-blue-300'
                              }`}>
                                {order.isKioskOrder ? (
                                  <>
                                    <i className="ri-store-line mr-1"></i>
                                    Kiosk Order
                                  </>
                                ) : (
                                  <>
                                    <i className="ri-global-line mr-1"></i>
                                    Online Order
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center group-hover:text-gray-800 transition-colors">
                                <i className="ri-time-line mr-1 group-hover:animate-pulse"></i>
                                {formatTime(order.created_at)}
                              </span>
                              <span className="flex items-center">
                                <i className="ri-hashtag mr-1"></i>
                                ID: {order.id.slice(-8)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm border-2 transition-all duration-200 ${
                              order.status === 'cancelled'
                                ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200'
                                : order.status === 'payment_received' 
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-200' 
                                  : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200 animate-pulse'
                            }`}>
                              {order.status === 'cancelled' 
                                ? '❌ Order Cancelled' 
                                : order.status === 'payment_received' 
                                  ? '✅ Payment Received' 
                                  : '💳 Awaiting Payment'}
                            </span>
                            {/* Cancellation Reason Display - Only show for cancelled orders */}
                            {order.status === 'cancelled' && (order as any).cancellation_reason && (
                              <div className="flex flex-col space-y-1">
                                <div className="px-3 py-1.5 bg-red-100 border border-red-200 rounded-lg text-xs">
                                  <span className="font-semibold text-red-700">Reason:</span>
                                  <span className="text-red-600 ml-1">
                                     {(() => {
                                       const reason = (order as any).cancellation_reason;
                                       switch (reason) {
                                         case 'unpaid_orders': return 'Unpaid Orders';
                                         case 'incorrect_orders': return 'Incorrect Orders';
                                         case 'duplicate_transactions': return 'Duplicate Transactions';
                                         case 'unavailable_items': return 'Unavailable Items';
                                         case 'customer_change_of_mind': return 'Customer Change of Mind';
                                         case 'cashier_verification_errors': return 'Cashier Verification Errors';
                                         case 'abandoned_transactions': return 'Abandoned Transactions';
                                         case 'system_or_printer_errors': return 'System or Printer Errors';
                                         case 'data_accuracy_issues': return 'Data Accuracy Issues';
                                         case 'wrong_order_paid': return 'Wrong Order Paid';
                                         default: return reason;
                                       }
                                     })()}
                                   </span>
                                </div>
                                {(order as any).cancellation_notes && (
                                  <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                                    <span className="font-semibold text-red-700">Notes:</span>
                                    <span className="text-red-600 ml-1">{(order as any).cancellation_notes}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => toggleOrderExpansion(order.id)}
                              className="p-3 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200 group-hover:bg-gray-50"
                              title={expandedOrders.has(order.id) ? 'Collapse details' : 'Expand details'}
                            >
                              <i className={`ri-arrow-${expandedOrders.has(order.id) ? 'up' : 'down'}-s-line text-xl transition-transform duration-200 ${
                                expandedOrders.has(order.id) ? 'rotate-180' : ''
                              }`}></i>
                            </button>
                          </div>
                        </div>

                        {/* Enhanced Order Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-green-50 via-green-100 to-emerald-100 rounded-xl p-5 border-2 border-green-200 hover:border-green-300 transition-all duration-200 hover:shadow-md">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                                <i className="ri-money-dollar-circle-line text-white text-lg"></i>
                              </div>
                              <span className="text-sm font-bold text-green-800">Total Amount</span>
                            </div>
                            <p className="text-3xl font-black text-green-900">{formatCurrency(order.total_amount)}</p>
                          </div>
                          
                          <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-indigo-100 rounded-xl p-5 border-2 border-purple-200 hover:border-purple-300 transition-all duration-200 hover:shadow-md">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                <i className={`${
                                  order.isKioskOrder 
                                    ? ((order as any).order_type === 'delivery' ? 'ri-restaurant-line' : 'ri-takeaway-line')
                                    : ((order as any).order_type === 'delivery' ? 'ri-truck-line' : 'ri-store-line')
                                } text-white text-lg`}></i>
                              </div>
                              <span className="text-sm font-bold text-purple-800">Order Type</span>
                            </div>
                            <p className="text-xl font-black text-purple-900 capitalize">
                              {order.isKioskOrder 
                                ? ((order as any).order_type === 'delivery' ? 'Dine-In' : 'Take-Out')
                                : (order as any).order_type}
                            </p>
                          </div>

                          <div className="bg-gradient-to-br from-orange-50 via-orange-100 to-amber-100 rounded-xl p-5 border-2 border-orange-200 hover:border-orange-300 transition-all duration-200 hover:shadow-md">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                                <i className="ri-bank-card-line text-white text-lg"></i>
                              </div>
                              <span className="text-sm font-bold text-orange-800">Payment Method</span>
                            </div>
                            <p className="text-xl font-black text-orange-900 capitalize">
                              {(order as any).payment_method || 'Cash'}
                            </p>
                          </div>
                        </div>

                        {/* Enhanced Expandable Order Details */}
                        {expandedOrders.has(order.id) && (
                          <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-inner">
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center text-lg">
                              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center mr-3">
                                <i className="ri-shopping-bag-line text-white"></i>
                              </div>
                              Order Items Details
                            </h4>
                            <div className="space-y-3">
                              {(() => {
                                // Handle different data structures for regular orders vs kiosk orders
                                const orderItems = order.isKioskOrder 
                                  ? (order as any).items  // Kiosk orders use 'items'
                                  : (order as any).order_items;  // Regular orders use 'order_items'
                                
                                return orderItems?.map((item: any, index: number) => (
                                  <div key={index} className="flex justify-between items-center py-4 px-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-sm">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                                          {index + 1}
                                        </div>
                                        <div>
                                          <span className="font-bold text-gray-900 text-lg">
                                            {/* Handle different food item name structures */}
                                            {item.food_item?.name || item.food_items?.name || 'Unknown Item'}
                                          </span>
                                          {/* Handle different size name structures */}
                                          {(item.size_name || item.size?.name) && (
                                            <span className="ml-2 text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                              {item.size_name || item.size?.name}
                                            </span>
                                          )}
                                          {/* Show special instructions for kiosk orders */}
                                          {item.special_instructions && (
                                            <div className="mt-1 text-sm text-gray-600 italic">
                                              Note: {item.special_instructions}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-6">
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 font-medium">Quantity</div>
                                        <span className="text-lg font-bold text-gray-900">{item.quantity}</span>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-xs text-gray-500 font-medium">Price</div>
                                        <span className="text-xl font-black text-green-600">
                                          {formatCurrency(item.total_price || item.calculated_price || item.price)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )) || (
                                  <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <i className="ri-information-line text-2xl text-gray-400"></i>
                                    </div>
                                    <p className="text-gray-500 italic text-lg">No item details available</p>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Enhanced Action Buttons - Mobile Responsive */}
                      <div className="flex flex-col sm:flex-row lg:flex-col space-y-3 sm:space-y-0 sm:space-x-3 lg:space-x-0 lg:space-y-4 sm:ml-4 lg:ml-6 sm:w-auto lg:w-52">
                        {order.status === 'cancelled' ? (
                          // For cancelled orders, show cancelled status
                          <div className="bg-gradient-to-r from-red-100 to-red-200 border-2 border-red-300 text-red-800 px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center">
                            <i className="ri-close-circle-line mr-1.5 sm:mr-2 text-sm sm:text-base lg:text-lg"></i>
                            <span className="hidden sm:inline">Order Cancelled</span>
                            <span className="sm:hidden">Cancelled</span>
                          </div>
                        ) : order.status === 'payment_received' && (!order.isKioskOrder || !order.completed_at) ? (
                          // For orders that already received payment, show completion button
                          // For kiosk orders, only show if not yet completed (completed_at is null)
                          <Button
                            onClick={() => handleMarkComplete(order.id, order.isKioskOrder)}
                            disabled={processingOrders.has(order.id)}
                            className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center border-2 border-blue-400 hover:border-blue-500"
                          >
                            {processingOrders.has(order.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-b-2 border-white mr-1.5 sm:mr-2"></div>
                                <span className="hidden sm:inline">Processing...</span>
                                <span className="sm:hidden">...</span>
                              </>
                            ) : (
                              <>
                                <i className="ri-check-double-line mr-1.5 sm:mr-2 text-sm sm:text-base lg:text-lg"></i>
                                <span className="hidden sm:inline">Mark Complete</span>
                                <span className="sm:hidden">Complete</span>
                              </>
                            )}
                          </Button>
                        ) : order.status === 'payment_received' && order.isKioskOrder && order.completed_at ? (
                          // For completed kiosk orders, show completed status
                          <div className="bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-300 text-green-800 px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center">
                            <i className="ri-check-double-line mr-1.5 sm:mr-2 text-sm sm:text-base lg:text-lg"></i>
                            <span className="hidden sm:inline">Order Completed</span>
                            <span className="sm:hidden">Completed</span>
                          </div>
                        ) : (
                          // For pending payment orders, show payment received button
                          <Button
                            onClick={() => {
                              const modalData = {
                                show: true,
                                orderId: order.id,
                                isKioskOrder: order.isKioskOrder,
                                action: 'confirm' as const,
                                customerName: order.customer_name,
                                amount: order.total_amount
                              };
                              console.log('Setting confirm modal with:', modalData);
                              setShowConfirmModal(modalData);
                            }}
                            disabled={processingOrders.has(order.id)}
                            className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center border-2 border-green-400 hover:border-green-500"
                          >
                            {processingOrders.has(order.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-b-2 border-white mr-1.5 sm:mr-2"></div>
                                <span className="hidden sm:inline">Processing...</span>
                                <span className="sm:hidden">...</span>
                              </>
                            ) : (
                              <>
                                <i className="ri-check-line mr-1.5 sm:mr-2 text-sm sm:text-base lg:text-lg"></i>
                                <span className="hidden sm:inline">Payment Received</span>
                                <span className="sm:hidden">Paid</span>
                              </>
                            )}
                          </Button>
                        )}
                        
                        {/* Only show cancel button for non-cancelled orders */}
                        {order.status !== 'cancelled' && (
                          <Button
                            onClick={() => setShowConfirmModal({
                              show: true,
                              orderId: order.id,
                              isKioskOrder: order.isKioskOrder,
                              action: 'cancel',
                              customerName: order.customer_name,
                              amount: order.total_amount
                            })}
                            disabled={processingOrders.has(order.id)}
                            variant="outline"
                            className="border-2 sm:border-3 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 hover:text-red-800 px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl lg:rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center shadow-lg hover:shadow-xl bg-white"
                          >
                            <i className="ri-close-line mr-1.5 sm:mr-2 text-sm sm:text-base lg:text-lg"></i>
                            <span className="hidden sm:inline">Cancel Order</span>
                            <span className="sm:hidden">Cancel</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Confirmation Modal - Mobile Responsive */}
      {showConfirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full mx-2 sm:mx-4 transform transition-all animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 mb-6 sm:mb-8">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                  showConfirmModal.action === 'confirm' 
                    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white' 
                    : 'bg-gradient-to-br from-red-400 to-red-600 text-white'
                }`}>
                  <i className={`text-xl sm:text-2xl lg:text-3xl ${
                    showConfirmModal.action === 'confirm' 
                      ? 'ri-check-line' 
                      : 'ri-close-line'
                  }`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1 leading-tight">
                    {showConfirmModal.action === 'confirm' ? 'Confirm Payment' : 'Cancel Order'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
                    {showConfirmModal.action === 'confirm' 
                      ? 'Mark this order as paid and complete?' 
                      : 'This action cannot be undone'}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 mb-6 sm:mb-8 border border-gray-200">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                      <i className="ri-user-line mr-1 sm:mr-2 text-sm sm:text-base"></i>
                      Customer:
                    </span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base truncate">{showConfirmModal.customerName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                      <i className="ri-money-dollar-circle-line mr-1 sm:mr-2 text-sm sm:text-base"></i>
                      Amount:
                    </span>
                    <span className="font-bold text-lg sm:text-xl text-green-600">{formatCurrency(showConfirmModal.amount)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                      <i className="ri-shopping-bag-line mr-1 sm:mr-2 text-sm sm:text-base"></i>
                      Order Type:
                    </span>
                    <span className="font-bold text-gray-900 flex items-center text-sm sm:text-base">
                      {showConfirmModal.isKioskOrder ? (
                        <>
                          <i className="ri-store-line mr-1 text-blue-600 text-sm sm:text-base"></i>
                          <span className="hidden sm:inline">Kiosk Order</span>
                          <span className="sm:hidden">Kiosk</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-global-line mr-1 text-purple-600 text-sm sm:text-base"></i>
                          <span className="hidden sm:inline">Online Order</span>
                          <span className="sm:hidden">Online</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Selection - Only show when cancelling */}
              {showConfirmModal.action === 'cancel' && (
                <div className="mb-6 sm:mb-8 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="ri-question-line mr-2"></i>
                      Cancellation Reason *
                    </label>
                    <select
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 text-sm font-medium"
                      required
                    >
                      <option value="">Select a reason...</option>
                      {cancellationReasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="ri-file-text-line mr-2"></i>
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={cancellationNotes}
                      onChange={(e) => setCancellationNotes(e.target.value)}
                      placeholder="Enter any additional details about the cancellation..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 text-sm resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => {
                    setShowConfirmModal({ show: false, orderId: '', isKioskOrder: false, action: 'confirm', customerName: '', amount: 0 });
                    setCancellationReason('');
                    setCancellationNotes('');
                  }}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 rounded-xl sm:rounded-2xl hover:bg-gray-50 hover:border-gray-400 font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center text-sm sm:text-base"
                >
                  <i className="ri-close-line mr-1 sm:mr-2 text-base sm:text-lg"></i>
                  Cancel
                </button>
                <button
                   onClick={() => {
                     console.log('Confirm button clicked with modal state:', showConfirmModal);
                     if (showConfirmModal.action === 'confirm') {
                       handleConfirmPayment(showConfirmModal.orderId, showConfirmModal.isKioskOrder);
                       setShowConfirmModal({ show: false, orderId: '', isKioskOrder: false, action: 'confirm', customerName: '', amount: 0 });
                     } else {
                       // Validate cancellation reason is selected
                       if (!cancellationReason) {
                         alert('Please select a cancellation reason before proceeding.');
                         return;
                       }
                       handleCancelOrder(showConfirmModal.orderId, showConfirmModal.isKioskOrder, cancellationReason, cancellationNotes);
                       setShowConfirmModal({ show: false, orderId: '', isKioskOrder: false, action: 'confirm', customerName: '', amount: 0 });
                       setCancellationReason('');
                       setCancellationNotes('');
                     }
                   }}
                  disabled={processingOrders.has(showConfirmModal.orderId) || (showConfirmModal.action === 'cancel' && !cancellationReason)}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-white rounded-xl sm:rounded-2xl font-bold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base ${
                    showConfirmModal.action === 'confirm'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-200'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:shadow-red-200'
                  }`}
                >
                  {processingOrders.has(showConfirmModal.orderId) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-1 sm:mr-2"></div>
                      <span className="hidden sm:inline">Processing...</span>
                      <span className="sm:hidden">Processing</span>
                    </>
                  ) : (
                    <>
                      <i className={`mr-1 sm:mr-2 text-base sm:text-lg ${showConfirmModal.action === 'confirm' ? 'ri-check-line' : 'ri-delete-bin-line'}`}></i>
                      <span className="hidden sm:inline">{showConfirmModal.action === 'confirm' ? 'Confirm Payment' : 'Cancel Order'}</span>
                      <span className="sm:hidden">{showConfirmModal.action === 'confirm' ? 'Confirm' : 'Cancel'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Success/Error Notifications - Mobile Responsive */}
      {notificationState && (
        <div className={`fixed top-4 sm:top-6 right-2 sm:right-6 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-2xl z-50 transition-all transform animate-in slide-in-from-right-full duration-300 max-w-xs sm:max-w-sm ${
          notificationState.type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-l-4 border-green-300' 
            : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-l-4 border-red-300'
        }`}>
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
              notificationState.type === 'success' ? 'bg-green-400 bg-opacity-30' : 'bg-red-400 bg-opacity-30'
            }`}>
              <i className={`text-lg sm:text-xl ${
                notificationState.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'
              }`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base sm:text-lg mb-1">
                {notificationState.type === 'success' ? 'Success!' : 'Error!'}
              </h4>
              <p className="text-xs sm:text-sm opacity-90 leading-relaxed break-words">{notificationState.message}</p>
            </div>
            <button 
              onClick={() => setNotificationState(null)}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-md sm:rounded-lg p-1 transition-colors flex-shrink-0"
            >
              <i className="ri-close-line text-base sm:text-lg"></i>
            </button>
          </div>
        </div>
      )}

      {/* Audio element for notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification-sound.mp3" type="audio/mpeg" />
        <source src="/notification-sound.wav" type="audio/wav" />
      </audio>
    </div>
  );
};

export default CashierPage;