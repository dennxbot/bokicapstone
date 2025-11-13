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
  
  // Safety check for Browser plugin availability
  const isBrowserPluginAvailable = typeof Browser !== 'undefined' && Browser.open;
  
  if (isMobileApp && isBrowserPluginAvailable) {
    // Mobile app approach: Use a simple print window approach
    console.log('🔄 Using mobile-optimized print approach');
    
    try {
      // Create a simple print window
      const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
      
      if (printWindow) {
        const mobileReceiptHtml = `
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
                  color: black;
                }
                .receipt {
                  max-width: 100%;
                  margin: 0 auto;
                  padding: 10px;
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
                  bottom: 20px;
                  left: 20px;
                  background: #6b7280;
                  color: white;
                  border: none;
                  padding: 15px 25px;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: bold;
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
              <div class="receipt">${receiptText}</div>
              <button class="print-button" onclick="handlePrint()">🖨️ Print Receipt</button>
              <button class="close-button" onclick="handleClose()">✕ Close</button>
              <script>
                console.log('📄 Receipt page loaded for order: ${receiptData.orderNumber}');
                
                function handlePrint() {
                  console.log('🖨️ Printing receipt...');
                  try {
                    window.print();
                    // Show success message after print dialog
                    setTimeout(function() {
                      const completionMsg = document.createElement('div');
                      completionMsg.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; z-index: 9999;">✅ Receipt sent to printer!</div>';
                      document.body.appendChild(completionMsg);
                      setTimeout(() => {
                        if (completionMsg.parentNode) {
                          completionMsg.parentNode.removeChild(completionMsg);
                        }
                      }, 2000);
                    }, 1000);
                  } catch (printError) {
                    console.error('❌ Print failed:', printError);
                    alert('Print failed. Please try again or copy the receipt text.');
                  }
                }
                
                function handleClose() {
                  console.log('🚪 Closing receipt window');
                  try {
                    window.close();
                  } catch (closeError) {
                    console.error('❌ Close failed:', closeError);
                  }
                }
                
                // Auto-focus on print button for better UX
                window.addEventListener('load', function() {
                  const printBtn = document.querySelector('.print-button');
                  if (printBtn) {
                    printBtn.focus();
                  }
                });
                
                // Handle keyboard shortcuts
                document.addEventListener('keydown', function(e) {
                  if (e.ctrlKey && e.key === 'p') {
                    e.preventDefault();
                    handlePrint();
                  }
                  if (e.key === 'Escape') {
                    handleClose();
                  }
                });
              </script>
            </body>
          </html>
        `;

        printWindow.document.write(mobileReceiptHtml);
        printWindow.document.close();
        
        console.log('✅ Print window created successfully');
      } else {
        // Popup blocked - use clipboard fallback
        throw new Error('Popup blocked by browser');
      }
    } catch (windowError) {
      console.error('❌ Print window error:', windowError);
      // Fallback to clipboard approach
      console.log('🔄 Falling back to clipboard approach');
      
      const receiptWithInstructions = `${receiptText}

========================================
📋 RECEIPT COPIED TO CLIPBOARD
Please copy the above text and paste it
into any text editor to print.
========================================`;
      
      navigator.clipboard.writeText(receiptText).then(() => {
        alert(receiptWithInstructions);
      }).catch(() => {
        // If clipboard fails, show the receipt in the alert
        alert(receiptWithInstructions);
      });
    }
    
  } else {
    // Web/desktop approach: Try browser plugin first, then fallback
    console.log('🔄 Using web/desktop print approach');
    
    if (isBrowserPluginAvailable) {
      // Try Capacitor Browser for web platform
      console.log('🌐 Attempting to use Capacitor Browser...');
      try {
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
                  max-width: 600px;
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
                @media print {
                  .print-button { display: none; }
                  body { margin: 0; padding: 0; }
                }
              </style>
            </head>
            <body>
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
                    }
                  }, 1000);
                });
                
                // Handle print completion
                window.addEventListener('afterprint', function() {
                  console.log('✅ Print dialog closed');
                  console.log('🖨️ Receipt printing completed');
                });
              </script>
            </body>
          </html>
        `;
        
        // Create a blob URL for better compatibility
        const receiptBlob = new Blob([receiptHtml], { type: 'text/html' });
        const receiptBlobUrl = URL.createObjectURL(receiptBlob);
        
        Browser.open({ 
          url: receiptBlobUrl, 
          presentationStyle: 'popover',
          toolbarColor: '#f97316'
        })
          .then(() => {
            console.log('✅ Browser opened successfully');
            // Clean up the blob URL after a delay
            setTimeout(() => {
              URL.revokeObjectURL(receiptBlobUrl);
            }, 30000);
          })
          .catch((error) => {
            console.error('❌ Browser open failed:', error);
            URL.revokeObjectURL(receiptBlobUrl);
            // Fallback to regular window.open
            throw error;
          });
      } catch (browserError) {
        console.error('❌ Browser plugin error:', browserError);
        // Fallback to regular window approach
        throw new Error('Browser plugin failed');
      }
    } else {
      // Browser plugin not available, use regular approach
      throw new Error('Browser plugin not available');
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