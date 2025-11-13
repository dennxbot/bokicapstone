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

// ESC/POS command generator for thermal printers
export const generateESCPOS = (receiptData: ReceiptData): Uint8Array => {
  const { orderId, orderNumber, orderType, items, totalAmount, timestamp } = receiptData;
  
  // Format order type for display
  const displayOrderType = orderType === 'delivery' ? 'DINE-IN' : 'TAKE-OUT';
  
  const commands = [];
  
  // Initialize printer
  commands.push('\x1B\x40'); // Initialize
  commands.push('\x1B\x61\x01'); // Center align
  
  // Header
  commands.push('\x1B\x21\x30'); // Double height, double width
  commands.push('BOKI RESTAURANT\n');
  commands.push('\x1B\x21\x00'); // Normal text
  commands.push('\x1B\x61\x00'); // Left align
  commands.push('Order Receipt (Kiosk)\n');
  commands.push('================================\n');
  
  // Order details
  commands.push(`Order #: ${orderNumber}\n`);
  commands.push(`Date: ${timestamp.toLocaleDateString()}\n`);
  commands.push(`Time: ${timestamp.toLocaleTimeString()}\n`);
  commands.push(`Type: ${displayOrderType}\n`);
  commands.push('--------------------------------\n');
  
  // Items
  commands.push('ITEMS\n');
  commands.push('--------------------------------\n');
  
  items.forEach(item => {
    const itemLine = `${item.name}${item.size_name ? ` (${item.size_name})` : ''}`;
    const qtyPrice = `${item.quantity}x ${formatPesoSimple(item.price)}`;
    const total = formatPesoSimple(item.price * item.quantity);
    
    commands.push(`${itemLine}\n`);
    commands.push(`  ${qtyPrice} = ${total}\n\n`);
  });
  
  commands.push('--------------------------------\n');
  commands.push(`TOTAL: ${formatPesoSimple(totalAmount)}\n`);
  commands.push('--------------------------------\n\n');
  
  // Footer
  commands.push('Please take this receipt to the cashier\n');
  commands.push('to complete your payment.\n\n');
  commands.push(`Order ID: ${orderId}\n\n`);
  commands.push('Thank you for choosing BOKI!\n');
  commands.push('================================\n');
  
  // Cut paper
  commands.push('\n\n\n'); // Feed lines
  commands.push('\x1D\x56\x00'); // Cut paper (partial cut)
  
  const fullText = commands.join('');
  return new TextEncoder().encode(fullText);
};

// Bluetooth thermal printer integration
export const printReceiptBluetooth = async (receiptData: ReceiptData): Promise<boolean> => {
  try {
    console.log('🔵 Attempting Bluetooth thermal printer connection...');
    
    // Check if Web Bluetooth API is available
    const bluetoothNavigator = navigator as any;
    if (!bluetoothNavigator.bluetooth) {
      console.error('❌ Web Bluetooth API not available');
      alert('Bluetooth printing is not supported on this device/browser');
      return false;
    }
    
    // Request Bluetooth device
    const device = await bluetoothNavigator.bluetooth.requestDevice({
      filters: [
        { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] }, // Common thermal printer service
        { namePrefix: 'Printer' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'ESC' }
      ],
      optionalServices: ['49535343-fe7d-4ae5-8fa9-9fafd205e455']
    });
    
    console.log('📱 Found Bluetooth device:', device.name);
    
    // Connect to device
    const server = await device.gatt.connect();
    console.log('🔗 Connected to GATT server');
    
    // Get printer service
    const service = await server.getPrimaryService('49535343-fe7d-4ae5-8fa9-9fafd205e455');
    
    // Get write characteristic
    const characteristic = await service.getCharacteristic('49535343-8841-43f4-a8d4-ecbe34729bb3');
    
    // Generate ESC/POS commands
    const escPosData = generateESCPOS(receiptData);
    
    // Send print data
    await characteristic.writeValue(escPosData);
    
    console.log('✅ Receipt sent to Bluetooth thermal printer');
    
    // Disconnect after printing
    setTimeout(() => {
      server.disconnect();
      console.log('🔌 Disconnected from printer');
    }, 1000);
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Bluetooth printing failed:', error);
    
    // Handle specific errors
    if (error.name === 'NotFoundError') {
      alert('No Bluetooth printer found. Please ensure your thermal printer is powered on and in pairing mode.');
    } else if (error.name === 'SecurityError') {
      alert('Bluetooth permission denied. Please allow Bluetooth access.');
    } else if (error.name === 'NetworkError') {
      alert('Bluetooth connection failed. Please try again.');
    } else {
      alert(`Bluetooth printing error: ${error.message}`);
    }
    
    return false;
  }
};

// Store current receipt data for Bluetooth printing from print window
let currentReceiptData: ReceiptData | null = null;

// Global function for print window to call Bluetooth printing
(window as any).handleBluetoothPrint = async (): Promise<boolean> => {
  console.log('🔄 Print window requesting Bluetooth print...');
  if (currentReceiptData) {
    return await printReceiptBluetooth(currentReceiptData);
  }
  console.error('❌ No receipt data available for Bluetooth printing');
  return false;
};

export const printReceipt = async (receiptData: ReceiptData): Promise<void> => {
  // Store receipt data for Bluetooth printing from print window
  currentReceiptData = receiptData;
  
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
  
  // Try Bluetooth printing first for mobile devices
  if (isMobileApp) {
    console.log('🔵 Attempting Bluetooth thermal printer...');
    
    try {
      const bluetoothSuccess = await printReceiptBluetooth(receiptData);
      if (bluetoothSuccess) {
        console.log('✅ Bluetooth printing successful');
        return;
      }
      console.log('🔵 Bluetooth printing failed, falling back to browser method');
    } catch (bluetoothError) {
      console.error('❌ Bluetooth printing error:', bluetoothError);
    }
  }
  
  if (isMobileApp) {
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
                .bluetooth-button {
                  position: fixed;
                  bottom: 80px;
                  right: 20px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  padding: 15px 25px;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: bold;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                  z-index: 1000;
                }
                @media print {
                  .print-button, .close-button, .bluetooth-button { display: none; }
                  body { margin: 0; padding: 0; }
                }
              </style>
            </head>
            <body>
              <div class="receipt">${receiptText}</div>
              <button class="bluetooth-button" onclick="handleBluetooth()">🔵 Print via Bluetooth</button>
              <button class="print-button" onclick="handlePrint()">🖨️ Print Receipt</button>
              <button class="close-button" onclick="handleClose()">✕ Close</button>
              <script>
                console.log('📄 Receipt page loaded for order: ${receiptData.orderNumber}');
                
                async function handleBluetooth() {
                  console.log('🔵 Attempting Bluetooth print...');
                  try {
                    // This will trigger the Bluetooth printing from the parent context
                    if (window.opener && window.opener.handleBluetoothPrint) {
                      const success = await window.opener.handleBluetoothPrint();
                      if (success) {
                        const completionMsg = document.createElement('div');
                        completionMsg.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #3b82f6; color: white; padding: 20px; border-radius: 8px; text-align: center; z-index: 9999;">✅ Sent to Bluetooth printer!</div>';
                        document.body.appendChild(completionMsg);
                        setTimeout(() => {
                          if (completionMsg.parentNode) {
                            completionMsg.parentNode.removeChild(completionMsg);
                          }
                        }, 2000);
                      }
                    } else {
                      alert('Bluetooth printing not available. Please use the regular print button.');
                    }
                  } catch (error) {
                    console.error('❌ Bluetooth print failed:', error);
                    alert('Bluetooth printing failed. Please try the regular print button.');
                  }
                }
                
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