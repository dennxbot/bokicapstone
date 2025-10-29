// Browser Push Notification Service
// Handles desktop notifications for admin order alerts

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private isSupported: boolean;
  private permission: NotificationPermission;

  private constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if browser supports notifications
   */
  public isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current notification permission status
   */
  public getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Request notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    if (this.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show a desktop notification
   */
  public async showNotification(options: NotificationOptions): Promise<Notification | null> {
    // Check if notifications are supported and permitted
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return null;
    }

    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'boki-notification',
        requireInteraction: options.requireInteraction || true,
        silent: options.silent || false,
        data: options.data || {}
      });

      // Auto-close notification after 10 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show notification for new order
   */
  public async showNewOrderNotification(orderData: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    orderType: string;
  }): Promise<Notification | null> {
    const { orderId, customerName, totalAmount, orderType } = orderData;
    
    return this.showNotification({
      title: '🍽️ New Order Received!',
      body: `Order #${orderId.slice(-4)} from ${customerName}\n₱${totalAmount.toFixed(2)} • ${orderType}`,
      icon: '/favicon.ico',
      tag: `new-order-${orderId}`,
      requireInteraction: true,
      data: {
        type: 'new_order',
        orderId,
        customerName,
        totalAmount,
        orderType,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Show notification for order status update
   */
  public async showOrderUpdateNotification(orderData: {
    orderId: string;
    customerName: string;
    status: string;
    previousStatus: string;
  }): Promise<Notification | null> {
    const { orderId, customerName, status, previousStatus } = orderData;
    
    const statusEmojis: Record<string, string> = {
      'preparing': '👨‍🍳',
      'ready': '✅',
      'out_for_delivery': '🚚',
      'completed': '🎉',
      'cancelled': '❌'
    };

    const emoji = statusEmojis[status] || '📋';
    
    return this.showNotification({
      title: `${emoji} Order Status Updated`,
      body: `Order #${orderId.slice(-4)} (${customerName})\n${previousStatus} → ${status}`,
      icon: '/favicon.ico',
      tag: `order-update-${orderId}`,
      requireInteraction: false,
      data: {
        type: 'order_update',
        orderId,
        customerName,
        status,
        previousStatus,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Check if notifications are enabled in browser settings
   */
  public isEnabled(): boolean {
    return this.isSupported && this.permission === 'granted';
  }

  /**
   * Get notification settings info for UI display
   */
  public getNotificationInfo(): {
    supported: boolean;
    permission: NotificationPermission;
    enabled: boolean;
    canRequest: boolean;
  } {
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.isEnabled(),
      canRequest: this.permission === 'default'
    };
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();