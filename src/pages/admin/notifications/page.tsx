import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/base/Button';
import AdminSidebar from '../../../components/feature/AdminSidebar';
import { notificationService } from '../../../lib/notifications';

const AdminNotificationSettings = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    // Initialize notification service
    initializeNotifications();
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  // Initialize notification service and check permissions
  const initializeNotifications = async () => {
    try {
      const permission = notificationService.getPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      const permission = await notificationService.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        // Show success notification
        await notificationService.showNotification({
          title: '🔔 Notifications Enabled!',
          body: 'You will now receive desktop notifications for new orders.',
          requireInteraction: false
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      if (notificationService.isEnabled()) {
        await notificationService.showNotification({
          title: '🧪 Test Notification',
          body: 'This is a test notification to verify your settings are working correctly.',
          requireInteraction: false
        });
        setTestNotificationSent(true);
        setTimeout(() => setTestNotificationSent(false), 3000);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-64">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
                <p className="text-gray-600">Manage your desktop notification preferences</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Browser Notifications Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <i className="ri-notification-line text-xl text-orange-600"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Desktop Notifications</h2>
                    <p className="text-gray-600">Get notified about new orders and status updates</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Current Status */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        notificationPermission === 'granted' 
                          ? 'bg-green-500' 
                          : notificationPermission === 'denied' 
                          ? 'bg-red-500' 
                          : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <h3 className="font-medium text-gray-900">Current Status</h3>
                        <p className="text-sm text-gray-600">
                          {notificationPermission === 'granted' 
                            ? 'Notifications are enabled and working' 
                            : notificationPermission === 'denied' 
                            ? 'Notifications are blocked by your browser' 
                            : 'Notifications are not configured'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      notificationPermission === 'granted' 
                        ? 'bg-green-100 text-green-800' 
                        : notificationPermission === 'denied' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {notificationPermission === 'granted' 
                        ? 'Enabled' 
                        : notificationPermission === 'denied' 
                        ? 'Blocked' 
                        : 'Not Set'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    {notificationPermission !== 'granted' && (
                      <Button
                        variant="primary"
                        onClick={requestNotificationPermission}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <i className="ri-notification-line mr-2"></i>
                        {notificationPermission === 'denied' ? 'Enable in Browser Settings' : 'Enable Notifications'}
                      </Button>
                    )}
                    
                    {notificationPermission === 'granted' && (
                      <Button
                        variant="outline"
                        onClick={sendTestNotification}
                        disabled={testNotificationSent}
                      >
                        <i className="ri-test-tube-line mr-2"></i>
                        {testNotificationSent ? 'Test Sent!' : 'Send Test Notification'}
                      </Button>
                    )}
                  </div>

                  {/* Status Messages */}
                  {notificationPermission === 'granted' && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start">
                        <i className="ri-check-line text-green-600 mr-2 mt-0.5"></i>
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">Notifications are working!</p>
                          <p>You'll receive desktop notifications for:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>New incoming orders</li>
                            <li>Order status updates (preparing, ready, completed)</li>
                            <li>Important system alerts</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {notificationPermission === 'denied' && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start">
                        <i className="ri-error-warning-line text-red-600 mr-2 mt-0.5"></i>
                        <div className="text-sm text-red-800">
                          <p className="font-medium mb-2">Notifications are blocked</p>
                          <p className="mb-2">To enable notifications:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Click the lock icon (🔒) in your browser's address bar</li>
                            <li>Find "Notifications" in the permissions list</li>
                            <li>Change it from "Block" to "Allow"</li>
                            <li>Refresh this page</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {notificationPermission === 'default' && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start">
                        <i className="ri-information-line text-blue-600 mr-2 mt-0.5"></i>
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Enable notifications to stay updated</p>
                          <p>Desktop notifications will help you:</p>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Never miss a new order</li>
                            <li>Stay informed about order progress</li>
                            <li>Respond quickly to customer needs</li>
                            <li>Work efficiently even when multitasking</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notification Types Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Notification Types</h2>
                <div className="space-y-4">
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-shopping-bag-line text-green-600"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">New Orders</h3>
                        <p className="text-sm text-gray-600">Get notified when customers place new orders</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-green-600 font-medium mr-2">Always On</span>
                      <i className="ri-check-line text-green-600"></i>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-refresh-line text-blue-600"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Status Updates</h3>
                        <p className="text-sm text-gray-600">Get notified when order status changes</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-blue-600 font-medium mr-2">Always On</span>
                      <i className="ri-check-line text-blue-600"></i>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg opacity-50">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-alarm-line text-purple-600"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">System Alerts</h3>
                        <p className="text-sm text-gray-600">Important system notifications and alerts</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 font-medium mr-2">Coming Soon</span>
                      <i className="ri-time-line text-gray-400"></i>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Browser Compatibility Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Browser Compatibility</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                    <i className="ri-chrome-line text-2xl text-blue-500 mr-3"></i>
                    <div>
                      <p className="font-medium text-gray-900">Chrome</p>
                      <p className="text-sm text-green-600">✓ Supported</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                    <i className="ri-firefox-line text-2xl text-orange-500 mr-3"></i>
                    <div>
                      <p className="font-medium text-gray-900">Firefox</p>
                      <p className="text-sm text-green-600">✓ Supported</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                    <i className="ri-safari-line text-2xl text-blue-400 mr-3"></i>
                    <div>
                      <p className="font-medium text-gray-900">Safari</p>
                      <p className="text-sm text-green-600">✓ Supported</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                    <i className="ri-edge-line text-2xl text-blue-600 mr-3"></i>
                    <div>
                      <p className="font-medium text-gray-900">Edge</p>
                      <p className="text-sm text-green-600">✓ Supported</p>
                    </div>
                  </div>

                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Desktop notifications are supported in all modern browsers. Make sure your browser is up to date for the best experience.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationSettings;