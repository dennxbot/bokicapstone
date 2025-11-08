import { formatPesoSimple } from './currency';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  size_option_id?: string;
  size_name?: string;
}

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderType: 'delivery' | 'pickup';
  items: OrderItem[];
  totalAmount: number;
  timestamp: Date;
  qrCodeData?: string;
}

export const generateOrderNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `BK${year}${month}${day}${random}`;
};

export const generateQRCodeData = (orderId: string, orderNumber: string): string => {
  return JSON.stringify({
    orderId,
    orderNumber,
    restaurant: 'BOKI',
    timestamp: new Date().toISOString()
  });
};

export const formatReceiptText = (receiptData: ReceiptData): string => {
  const { orderId, orderNumber, orderType, items, totalAmount, timestamp } = receiptData;
  
  // Format order type for display - convert 'delivery' to 'DINE-IN' and 'pickup' to 'TAKE-OUT' for kiosk orders
  const displayOrderType = orderType === 'delivery' ? 'DINE-IN' : 'TAKE-OUT';
  
  const receipt = `
========================================
              BOKI RESTAURANT
           Order Receipt (Kiosk)
========================================

Order #: ${orderNumber}
Date: ${timestamp.toLocaleDateString()}
Time: ${timestamp.toLocaleTimeString()}
Type: ${displayOrderType}

----------------------------------------
                ITEMS
----------------------------------------
${items.map(item => {
  const itemLine = `${item.name}${item.size_name ? ` (${item.size_name})` : ''}`;
  const qtyPrice = `${item.quantity}x ${formatPesoSimple(item.price)}`;
  const total = formatPesoSimple(item.price * item.quantity);
  
  return `${itemLine}
  ${qtyPrice} = ${total}`;
}).join('\n\n')}

----------------------------------------
TOTAL: ${formatPesoSimple(totalAmount)}
----------------------------------------

Please take this receipt to the cashier
to complete your payment.

Order ID: ${orderId}

Thank you for choosing BOKI!
========================================
  `.trim();
  
  return receipt;
};

export const printReceipt = (receiptData: ReceiptData): void => {
  const receiptText = formatReceiptText(receiptData);
  
  // Check if we're in a mobile app environment
  const isMobileApp = Capacitor.isNativePlatform();
  
  console.log('🖨️ Receipt Print Debug:', {
    isMobileApp,
    platform: Capacitor.getPlatform(),
    orderNumber: receiptData.orderNumber,
    timestamp: new Date().toISOString()
  });
  
  if (isMobileApp) {
    // Mobile app approach: Try multiple methods
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Receipt - ${receiptData.orderNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.4;
              margin: 20px;
              white-space: pre-wrap;
              background: white;
            }
            .receipt {
              max-width: 100%;
              margin: 0 auto;
              padding: 20px;
            }
            .print-button {
              position: fixed;
              bottom: 20px;
              right: 20px;
              background: #f97316;
              color: white;
              border: none;
              padding: 15px 25px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
              z-index: 1000;
            }
            /* Close button styles removed to prevent accidental app closure */
            @media print {
              .print-button { display: none; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <!-- Close button removed to prevent accidental app closure -->
          <div class="receipt">${receiptText}</div>
          <button class="print-button" onclick="window.print()">🖨️ Print Receipt</button>
          <script>
            console.log('📄 Receipt page loaded for order: ${receiptData.orderNumber}');
            
            // Auto-print after page loads
            window.addEventListener('load', function() {
              console.log('🖨️ Auto-printing receipt...');
              setTimeout(function() {
                try {
                  window.print();
                } catch (printError) {
                  console.error('❌ Auto-print failed:', printError);
                  // Don't close window on print error
                }
              }, 1000);
            });
            
            // Handle print completion - DO NOT close window in mobile app
            window.addEventListener('afterprint', function() {
              console.log('✅ Print dialog closed');
              // Don't close the window in mobile app to prevent app exit
              // Just show a message that printing is complete
              console.log('🖨️ Receipt printing completed');
              
              // Optional: Show a completion message to user
              const completionMsg = document.createElement('div');
              completionMsg.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; z-index: 9999;">✅ Receipt printed successfully!<br><small>You can now close this window</small></div>';
              document.body.appendChild(completionMsg);
              
              // Remove message after 3 seconds
              setTimeout(() => {
                if (completionMsg.parentNode) {
                  completionMsg.parentNode.removeChild(completionMsg);
                }
              }, 3000);
            });
            
            // Handle print errors
            window.addEventListener('error', function(e) {
              console.error('❌ Print error:', e);
              // Don't show alert in mobile app as it might be disruptive
              console.error('Print error details:', e.message);
            });
            
            // Prevent accidental window closure
            window.addEventListener('beforeunload', function(e) {
              console.log('🚪 Window close attempted - preventing app exit');
              // In mobile app, we don't want to close the main app
              // Just log it and prevent the default behavior
              e.preventDefault();
              e.returnValue = '';
              return '';
            });
          </script>
        </body>
      </html>
    `;
    
    // Try to use Capacitor Browser first
    console.log('🌐 Attempting to open receipt in Capacitor Browser...');
    try {
      // Use a data URL instead of blob URL for better mobile compatibility
      const receiptDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(receiptHtml);
      
      console.log('📄 Data URL created (length:', receiptDataUrl.length, 'chars)');
      
      Browser.open({ url: receiptDataUrl, presentationStyle: 'popover' })
        .then(() => {
          console.log('✅ Browser opened successfully');
        })
        .catch((error) => {
          console.error('❌ Browser open failed:', error);
          // Fallback: Try to open in system browser
          console.log('🔄 Falling back to system browser');
          window.open(receiptDataUrl, '_system');
        });
    } catch (browserError) {
      console.error('❌ Browser plugin error:', browserError);
      // If browser fails, try direct print dialog
      console.log('🔄 Falling back to direct print window');
      try {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
          printWindow.document.write(receiptHtml);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        } else {
          // Final fallback: clipboard
          console.log('🔄 Falling back to clipboard');
          navigator.clipboard.writeText(receiptText).then(() => {
            alert('Receipt copied to clipboard! Please paste it to print.');
          }).catch(() => {
            alert('Unable to display receipt. Receipt copied to clipboard - please paste and print.');
          });
        }
      } catch (printError) {
        console.error('❌ Print window error:', printError);
        // Ultimate fallback
        navigator.clipboard.writeText(receiptText).then(() => {
          alert('Receipt copied to clipboard! Please paste it to print.');
        }).catch(() => {
          alert('Unable to display receipt. Please try again.');
        });
      }
    }
    
  } else {
    // Web approach: Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Order Receipt - ${receiptData.orderNumber}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                margin: 20px;
                white-space: pre-wrap;
              }
              .receipt {
                max-width: 300px;
                margin: 0 auto;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">${receiptText}</div>
            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px;">Print Receipt</button>
              <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; margin-left: 10px;">Close</button>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Auto-print after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(receiptText).then(() => {
        alert('Receipt copied to clipboard! Please paste it to print.');
      }).catch(() => {
        alert('Unable to print receipt. Please try again.');
      });
    }
  }
};

export const downloadReceiptAsText = (receiptData: ReceiptData): void => {
  const receiptText = formatReceiptText(receiptData);
  const blob = new Blob([receiptText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${receiptData.orderNumber}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};