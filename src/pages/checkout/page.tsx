
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useAddresses } from '../../hooks/useAddresses';
import { useBanStatus } from '../../hooks/useBanStatus';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';
import BannedUserWarning from '../../components/feature/BannedUserWarning';

const Checkout = () => {
  const navigate = useNavigate();
  const { items: cartItems, getTotalPrice, createOrder } = useCart();
  const { user, logout } = useAuth();
  const { addresses, loadAddresses, getDefaultAddress } = useAddresses();
  const banStatus = useBanStatus();
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    selectedAddressId: '',
    deliveryMethod: 'delivery',
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
    if (!formData.fullName || !formData.contactNumber || !formData.selectedAddressId) {
      alert('Please fill in all required fields and select an address');
      return;
    }

    if (!user) {
      alert('Please login to place an order');
      navigate('/login');
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === formData.selectedAddressId);
    if (!selectedAddress) {
      alert('Please select a valid address');
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await createOrder({
        customerName: formData.fullName,
        customerEmail: user.email || '',
        customerPhone: formData.contactNumber,
        customerAddress: `${selectedAddress.address_line_1}${selectedAddress.address_line_2 ? ', ' + selectedAddress.address_line_2 : ''}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postal_code}, ${selectedAddress.country}`,
        orderType: formData.deliveryMethod as 'delivery' | 'pickup',
        paymentMethod: formData.paymentMethod as 'cash' | 'card',
        userId: user.id,
      });

      navigate(`/order-confirmation/${order.id}`);
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

        {/* Customer Information */}
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

        {/* Delivery Method */}
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

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
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
        </div>

        <Button
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold whitespace-nowrap"
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-2" />
              Placing Order...
            </>
          ) : (
            <>
              Place Order - {formatPesoSimple(getTotalPrice())}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
