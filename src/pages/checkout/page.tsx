
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useAddresses } from '../../hooks/useAddresses';
import { useBanStatus } from '../../hooks/useBanStatus';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import { useKioskOrders } from '../../hooks/useKioskOrders';
import { formatPesoSimple } from '../../lib/currency';
import { generateQRCodeData, printReceipt, type ReceiptData } from '../../lib/receipt';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';
import BannedUserWarning from '../../components/feature/BannedUserWarning';

const Checkout = () => {
  const navigate = useNavigate();
  const { items: cartItems, getTotalPrice, createOrder, clearCart } = useCart();
  const { user, logout } = useAuth();
  const { addresses, loadAddresses, getDefaultAddress } = useAddresses();
  const { isKioskMode } = useKioskAuth();
  const { createKioskOrder } = useKioskOrders();
  const banStatus = useBanStatus();
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    selectedAddressId: '',
    deliveryMethod: 'delivery',
    kioskOrderType: 'pickup', // For kiosk mode: 'pickup' (take-out) or 'delivery' (dine-in)
    paymentMethod: 'cash'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    const defaultAddress = getDefaultAddress();
    if (defaultAddress) {
      setFormData(prev => ({
        ...prev,
        selectedAddressId: defaultAddress.id
      }));
    }
  }, [addresses, getDefaultAddress]);

  // Auto-populate customer information when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || '',
        contactNumber: user.contact_number || ''
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePlaceOrder = async () => {
    if (!formData.fullName || !formData.contactNumber) {
      alert('Please fill in all required fields');
      return;
    }

    // For kiosk mode, we don't require address selection (pickup only)
    if (!isKioskMode && !formData.selectedAddressId) {
      alert('Please select an address');
      return;
    }

    if (!user) {
      alert('Please login to place an order');
      navigate('/login');
      return;
    }

    let selectedAddress = null;
    if (!isKioskMode) {
      selectedAddress = addresses.find(addr => addr.id === formData.selectedAddressId);
      if (!selectedAddress) {
        alert('Please select a valid address');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let order;
      if (isKioskMode) {
        order = await createKioskOrder({
          customer_name: formData.fullName,
          customer_phone: formData.contactNumber,
          order_type: formData.kioskOrderType as 'delivery' | 'pickup',
          total_amount: getTotalPrice(),
          payment_method: formData.paymentMethod as 'cash' | 'card',
          items: cartItems.map(item => ({
            food_item_id: item.id,
            size_id: item.size_option_id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity
          }))
        });
      } else {
        order = await createOrder({
          customerName: formData.fullName,
          customerEmail: user.email || '',
          customerPhone: formData.contactNumber,
          customerAddress: `${selectedAddress!.address_line_1}${selectedAddress!.address_line_2 ? ', ' + selectedAddress!.address_line_2 : ''}, ${selectedAddress!.city}, ${selectedAddress!.state} ${selectedAddress!.postal_code}, ${selectedAddress!.country}`,
          orderType: formData.deliveryMethod as 'delivery' | 'pickup',
          paymentMethod: formData.paymentMethod as 'cash' | 'card',
          userId: user.id,
          status: 'pending'
        });
      }

      if (isKioskMode) {
        if (!order) {
          throw new Error('Failed to create kiosk order');
        }
        
         // Generate and print receipt for kiosk orders
         const receiptData: ReceiptData = {
           orderId: order.id,
           orderNumber: order.order_number,
           customerName: formData.fullName,
           customerPhone: formData.contactNumber,
           orderType: formData.kioskOrderType as 'delivery' | 'pickup',
           items: cartItems.map(item => ({
             id: item.id,
             name: item.name,
             quantity: item.quantity,
             price: item.price,
             size_option_id: item.size_option_id,
             size_name: item.size_name
           })),
           totalAmount: getTotalPrice(),
           timestamp: new Date(),
           qrCodeData: generateQRCodeData(order.id, order.order_number)
         };

         printReceipt(receiptData);
         
         // Clear the cart after successful kiosk order
         await clearCart();
         
         // Show success message and redirect to menu for next order
         alert('Order placed successfully! Please take your receipt to the cashier for payment.');
         navigate('/menu');
       } else {
        if (!order) {
          throw new Error('Failed to create order');
        }
        // Regular web checkout flow
        navigate(`/order-confirmation/${order.id}`);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show banned user warning if user is banned
  if (banStatus.isBanned) {
    return (
      <BannedUserWarning
        banReason={banStatus.banReason!}
        customReason={banStatus.customReason}
        bannedUntil={banStatus.bannedUntil}
        banMessage={banStatus.banMessage}
        onLogout={logout}
      />
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
          <Button onClick={() => navigate('/')}>Continue Shopping</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center">
            <button onClick={() => navigate('/cart')} className="mr-4">
              <i className="ri-arrow-left-line text-xl"></i>
            </button>
            <h1 className="text-xl font-bold">Checkout</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          {cartItems.map((item) => (
            <div key={`${item.id}-${item.size_option_id || 'default'}`} className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold">{formatPesoSimple(item.price * item.quantity)}</p>
            </div>
          ))}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total</p>
              <p className="text-lg font-bold text-orange-600">{formatPesoSimple(getTotalPrice())}</p>
            </div>
          </div>
        </div>

        {/* Customer Information - Hidden in kiosk mode */}
        {!isKioskMode && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <div className="space-y-4">
              <Input
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Contact Number"
                name="contactNumber"
                type="tel"
                value={formData.contactNumber}
                onChange={handleInputChange}
                required
              />
              
              {/* Address Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Address *
                </label>
                {addresses.length > 0 ? (
                  <div className="space-y-2">
                    {addresses.map((address) => (
                      <label key={address.id} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="selectedAddressId"
                          value={address.id}
                          checked={formData.selectedAddressId === address.id}
                          onChange={handleInputChange}
                          className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{address.label}</span>
                            {address.is_default && (
                              <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {address.address_line_1}
                            {address.address_line_2 && `, ${address.address_line_2}`}
                            <br />
                            {address.city}, {address.state} {address.postal_code}
                            <br />
                            {address.country}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No addresses found.</p>
                    <button
                      type="button"
                      onClick={() => navigate('/profile')}
                      className="text-orange-600 hover:text-orange-700 font-medium mt-2"
                    >
                      Add an address in your profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Kiosk Mode Order Type Selection */}
        {isKioskMode && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Type</h2>
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="kioskOrderType"
                  value="pickup"
                  checked={formData.kioskOrderType === 'pickup'}
                  onChange={handleInputChange}
                  className="mr-3 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex items-center">
                  <i className="ri-takeaway-line text-orange-600 mr-3 text-xl"></i>
                  <div>
                    <span className="font-medium">Take-Out</span>
                    <p className="text-sm text-gray-600">Order to go</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="kioskOrderType"
                  value="delivery"
                  checked={formData.kioskOrderType === 'delivery'}
                  onChange={handleInputChange}
                  className="mr-3 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex items-center">
                  <i className="ri-restaurant-line text-orange-600 mr-3 text-xl"></i>
                  <div>
                    <span className="font-medium">Dine-In</span>
                    <p className="text-sm text-gray-600">Eat at the restaurant</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Delivery Method - Hidden in kiosk mode */}
        {!isKioskMode && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">Delivery Method</h2>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="delivery"
                  checked={formData.deliveryMethod === 'delivery'}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <span>Delivery</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="pickup"
                  checked={formData.deliveryMethod === 'pickup'}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <span>Pickup</span>
              </label>
            </div>
          </div>
        )}

        {/* Payment Method - Modified for kiosk mode */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {isKioskMode ? 'Payment Information' : 'Payment Method'}
          </h2>
          {isKioskMode ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <i className="ri-cash-line text-yellow-600 mr-2 text-xl"></i>
                <div>
                  <p className="font-medium text-yellow-800">Pay at Cashier</p>
                  <p className="text-sm text-yellow-700">
                    After placing your order, take your receipt to the cashier to complete payment.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={formData.paymentMethod === 'cash'}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <span>{formData.deliveryMethod === 'delivery' ? 'Cash on Delivery' : 'Pay on Pickup'}</span>
              </label>
            </div>
          )}
        </div>

        <Button
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold whitespace-nowrap"
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-2" />
              {isKioskMode ? 'Generating Receipt...' : 'Placing Order...'}
            </>
          ) : (
            <>
              {isKioskMode ? (
                <>
                  <i className="ri-printer-line mr-2" />
                  Place Order & Print Receipt - {formatPesoSimple(getTotalPrice())}
                </>
              ) : (
                <>
                  Place Order - {formatPesoSimple(getTotalPrice())}
                </>
              )}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
