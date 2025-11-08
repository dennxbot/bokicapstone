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
            .close-button {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #6b7280;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 6px;
              font-size: 14px;
              cursor: pointer;
              z-index: 1000;
            }
            @media print {
              .print-button, .close-button { display: none; }
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="close-button" onclick="window.close()">✕ Close</button>
          <div class="receipt">${receiptText}</div>
          <button class="print-button" onclick="window.print()">🖨️ Print Receipt</button>
          <script>
            console.log('📄 Receipt page loaded for order: ${receiptData.orderNumber}');
            
            // Auto-print after page loads
            window.addEventListener('load', function() {
              console.log('🖨️ Auto-printing receipt...');
              setTimeout(function() {
                window.print();
              }, 1000);
            });
            
            // Handle print completion
            window.addEventListener('afterprint', function() {
              console.log('✅ Print dialog closed');
              setTimeout(function() {
                window.close();
              }, 2000);
            });
            
            // Handle print errors
            window.addEventListener('error', function(e) {
              console.error('❌ Print error:', e);
              alert('Print error: ' + e.message);
            });
          </script>
        </body>
      </html>
    `;
    
    // Try to use Capacitor Browser first
    console.log('🌐 Attempting to open receipt in Capacitor Browser...');
    try {
      // Create a blob URL for the receipt HTML
      const blob = new Blob([receiptHtml], { type: 'text/html' });
      const receiptUrl = URL.createObjectURL(blob);
      
      console.log('📄 Blob URL created:', receiptUrl);
      
      Browser.open({ url: receiptUrl, presentationStyle: 'popover' })
        .then(() => {
          console.log('✅ Browser opened successfully');
          // Clean up the blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(receiptUrl);
            console.log('🧹 Blob URL cleaned up');
          }, 30000);
        })
        .catch((error) => {
          console.error('❌ Browser open failed:', error);
          // Fallback: Try to open in system browser
          console.log('🔄 Falling back to system browser');
          window.open(receiptUrl, '_system');
          setTimeout(() => {
            URL.revokeObjectURL(receiptUrl);
          }, 30000);
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