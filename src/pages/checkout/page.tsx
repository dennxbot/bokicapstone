
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
import { type CartItemWithSize } from '../../types';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';
import BannedUserWarning from '../../components/feature/BannedUserWarning';
import { toast } from 'react-hot-toast';

export default function Checkout() {
  const navigate = useNavigate();
  const { items: cartItems, getTotalPrice, createOrder, clearCart } = useCart();
  const { user, logout } = useAuth();
  const { addresses, loadAddresses, getDefaultAddress } = useAddresses();
  const { isKioskMode } = useKioskAuth();
  const { createKioskOrder } = useKioskOrders();
  const banStatus = useBanStatus();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    selectedAddressId: '',
    deliveryMethod: 'delivery',
    kioskOrderType: 'pickup',
    paymentMethod: 'cash'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || '',
        contactNumber: user.contact_number || ''
      }));
    }
  }, [user]);

  // Progress steps configuration
  const steps = isKioskMode 
    ? [
        { id: 1, title: 'Order Type', icon: 'ri-restaurant-line' },
        { id: 2, title: 'Payment', icon: 'ri-cash-line' },
        { id: 3, title: 'Confirm', icon: 'ri-check-line' }
      ]
    : [
        { id: 1, title: 'Information', icon: 'ri-user-line' },
        { id: 2, title: 'Address', icon: 'ri-map-pin-line' },
        { id: 3, title: 'Delivery', icon: 'ri-truck-line' },
        { id: 4, title: 'Payment', icon: 'ri-cash-line' },
        { id: 5, title: 'Confirm', icon: 'ri-check-line' }
      ];

  const isNextButtonDisabled = (): boolean => {
    if (!isKioskMode) {
      if (currentStep === 1) {
        return !formData.fullName.trim() || !formData.contactNumber.trim();
      }
      if (currentStep === 2) {
        return !formData.selectedAddressId;
      }
    }
    return false;
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (!isKioskMode) {
      if (step === 1) {
        if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
        if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact number is required';
        else if (!/^[0-9+\-\s()]+$/.test(formData.contactNumber)) {
          errors.contactNumber = 'Please enter a valid contact number';
        }
      }
      
      if (step === 2) {
        if (!formData.selectedAddressId) errors.selectedAddressId = 'Please select an address';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePlaceOrder = async () => {
    if (!formData.fullName || !formData.contactNumber) {
      setFormErrors({
        fullName: !formData.fullName ? 'Full name is required' : '',
        contactNumber: !formData.contactNumber ? 'Contact number is required' : ''
      });
      return;
    }

    if (!isKioskMode && !formData.selectedAddressId) {
      setFormErrors({ selectedAddressId: 'Please select an address' });
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
        setFormErrors({ selectedAddressId: 'Please select a valid address' });
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
          items: cartItems.map((item: CartItemWithSize) => ({
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
          status: 'pending',
          deliveryFee: deliveryFee
        });
      }

      if (isKioskMode) {
        if (!order) {
          throw new Error('Failed to create kiosk order');
        }
        
        const receiptData: ReceiptData = {
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: formData.fullName,
          customerPhone: formData.contactNumber,
          orderType: formData.kioskOrderType as 'delivery' | 'pickup',
          items: cartItems.map((item: CartItemWithSize) => ({
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
        await clearCart();
        
        // Show success toast with print button for mobile
        toast.success(
          <div className="text-center">
            <div className="font-semibold mb-2">Order placed successfully!</div>
            <div className="text-sm mb-3">Please take your receipt to the cashier for payment.</div>
            <button
              onClick={() => printReceipt(receiptData)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🖨️ Print Receipt Again
            </button>
          </div>,
          {
            duration: 8000,
            position: 'top-center',
            style: {
              background: '#ffffff',
              color: '#1f2937',
              border: '2px solid #f97316',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            },
          }
        );
        
        setTimeout(() => {
          navigate('/menu');
        }, 3000);
      } else {
        if (!order) {
          throw new Error('Failed to create order');
        }
        // Ensure cart is cleared for regular mode as well
        await clearCart();
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-32 h-32 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
            <i className="ri-shopping-cart-line text-5xl text-orange-600"></i>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">Your Cart is Empty</h2>
          <p className="text-gray-600 mb-8 leading-relaxed animate-fade-in">
            Add some delicious items to your cart before proceeding to checkout.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button
              onClick={() => navigate('/menu')}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg font-semibold"
            >
              <i className="ri-restaurant-line mr-3"></i>
              Browse Menu
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
            >
              <i className="ri-home-line mr-3"></i>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate delivery fee based on mode and order type
  const getDeliveryFee = () => {
    if (isKioskMode) {
      // In kiosk mode, no delivery fees for any order type (pickup = take-out, delivery = dine-in)
      return 0;
    } else {
      // Regular mode: only charge delivery fee for actual delivery orders
      return formData.deliveryMethod === 'delivery' ? 50 : 0;
    }
  };
  
  const deliveryFee = getDeliveryFee();
  const totalAmount = getTotalPrice() + deliveryFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-red-50/20 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-100/20 via-transparent to-red-100/20"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-200/30 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-red-200/30 to-transparent rounded-full blur-3xl"></div>
      
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 mr-4 group"
              >
                <i className="ri-arrow-left-line text-xl group-hover:transform group-hover:-translate-x-1 transition-transform duration-300"></i>
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1 animate-fade-in">Checkout</h1>
                <p className="text-orange-100 animate-fade-in">Complete your order</p>
              </div>
            </div>
            
            {/* Order Total Preview */}
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-bold">{formatPesoSimple(totalAmount)}</div>
              <div className="text-sm text-orange-100">{cartItems.length} items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container with Mobile-First Layout */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Stepper + Form (Mobile: full width, Desktop: 3/5) */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            {/* Premium Progress Stepper - Optimized for Mobile/Tablet */}
            <div className="mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-orange-100/50 border border-white/60 px-4 sm:px-8 py-4 sm:py-6">
                <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-6">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300 shadow-lg ${
                          currentStep >= step.id
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200'
                            : currentStep === step.id
                            ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-600 border-2 border-orange-500 animate-pulse'
                            : 'bg-gray-100 text-gray-400 shadow-gray-200'
                        }`}>
                          {currentStep > step.id ? (
                            <i className="ri-check-line text-xs sm:text-sm font-bold"></i>
                          ) : (
                            step.id
                          )}
                        </div>
                        <span className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                          currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-6 sm:w-12 h-1 mx-2 sm:mx-4 rounded-full transition-all duration-500 ${
                          currentStep > step.id ? 'bg-gradient-to-r from-orange-400 to-red-400' : 'bg-gray-200'
                        }`}></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Premium Form Content */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-gray-200/50 border border-white/70 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-6">
            {/* Step 1: Customer Information (Non-Kiosk) */}
              {!isKioskMode && currentStep === 1 && (
                <div className="animate-fade-in">
                  <div className="border-b border-gradient-to-r from-orange-100 via-gray-100 to-red-100 pb-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 border border-orange-200/50">
                        <i className="ri-user-line text-orange-600 text-lg"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                          Personal Information
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 font-medium">Please provide your contact details for delivery</p>
                      </div>
                    </div>
                  </div>
                <div className="space-y-8">
                    <div className="group">
                      <label htmlFor="fullName" className="block text-sm font-semibold text-gray-800 mb-3 transition-colors group-focus-within:text-orange-600">
                        Full Name
                      </label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your full name"
                        className={`w-full px-5 py-4 border-2 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-300 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-300 shadow-lg shadow-gray-100/50 ${formErrors.fullName ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'}`}
                      />
                      {formErrors.fullName && (
                        <p className="mt-3 text-sm text-red-600 flex items-center gap-2 font-medium">
                          <i className="ri-error-warning-line text-red-500"></i>
                          {formErrors.fullName}
                        </p>
                      )}
                    </div>
                    <div className="group">
                      <label htmlFor="contactNumber" className="block text-sm font-semibold text-gray-800 mb-3 transition-colors group-focus-within:text-orange-600">
                        Contact Number
                      </label>
                      <Input
                        id="contactNumber"
                        name="contactNumber"
                        type="tel"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        required
                        placeholder="+63 9XX XXX XXXX"
                        className={`w-full px-5 py-4 border-2 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-300 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 hover:border-orange-300 shadow-lg shadow-gray-100/50 ${formErrors.contactNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'}`}
                      />
                      {formErrors.contactNumber && (
                        <p className="mt-3 text-sm text-red-600 flex items-center gap-2 font-medium">
                          <i className="ri-error-warning-line text-red-500"></i>
                          {formErrors.contactNumber}
                        </p>
                      )}
                    </div>
                  </div>
              </div>
            )}

            {/* Step 2: Address Selection (Non-Kiosk) */}
            {!isKioskMode && currentStep === 2 && (
              <div className="animate-fade-in">
                <div className="border-b border-gradient-to-r from-orange-100 via-gray-100 to-red-100 pb-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 border border-orange-200/50">
                        <i className="ri-map-pin-line text-orange-600 text-lg"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                          Delivery Address
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 font-medium">Choose where you'd like your order delivered</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate('/profile')}
                      variant="outline"
                      className="border-2 border-orange-300 text-orange-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-orange-100/50 hover:shadow-orange-200/50 hover:border-orange-400"
                    >
                      <i className="ri-add-line mr-2"></i>
                      Add New
                    </Button>
                  </div>
                </div>
                {addresses.length > 0 ? (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <label key={address.id} className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-orange-50 ${
                        formData.selectedAddressId === address.id
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}>
                        <input
                          type="radio"
                          name="selectedAddressId"
                          value={address.id}
                          checked={formData.selectedAddressId === address.id}
                          onChange={handleInputChange}
                          className="mt-1 mr-4 text-orange-500 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">{address.label}</span>
                            {address.is_default && (
                              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-medium">
                                Default
                              </span>
                            )}
                            {formData.selectedAddressId === address.id && (
                              <i className="ri-check-line text-orange-500 font-bold ml-auto"></i>
                            )}
                          </div>
                          <p className="text-gray-600 leading-relaxed">
                            {address.address_line_1}
                            {address.address_line_2 && `, ${address.address_line_2}`}
                            <br />
                            {address.city}, {address.state} {address.postal_code}
                            <br />
                            {address.country}
                          </p>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            navigate('/profile');
                          }}
                          variant="outline"
                          className="ml-2 p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                          title="Edit address"
                        >
                          <i className="ri-edit-line"></i>
                        </Button>
                      </label>
                    ))}
                    {formErrors.selectedAddressId && (
                      <p className="text-sm text-red-600 flex items-center gap-2">
                        <i className="ri-error-warning-line"></i>
                        {formErrors.selectedAddressId}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <i className="ri-map-pin-line text-4xl text-gray-400 mb-4"></i>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Addresses Found</h3>
                    <p className="text-gray-600 mb-4">Add an address to continue with your order.</p>
                    <Button
                      onClick={() => navigate('/profile')}
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <i className="ri-add-line mr-2"></i>
                      Add Address
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Delivery Method (Non-Kiosk) */}
            {!isKioskMode && currentStep === 3 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <i className="ri-truck-line text-orange-500"></i>
                  Delivery Method
                </h2>
                <div className="space-y-4">
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-orange-50 ${
                    formData.deliveryMethod === 'delivery'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="delivery"
                      checked={formData.deliveryMethod === 'delivery'}
                      onChange={handleInputChange}
                      className="mr-4 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex items-center flex-1">
                      <i className="ri-truck-line text-orange-500 mr-4 text-2xl"></i>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Delivery</div>
                        <div className="text-sm text-gray-600">Delivered to your address</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-orange-600">₱50.00</div>
                        {!isKioskMode && <div className="text-xs text-gray-500">Delivery fee</div>}
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-orange-50 ${
                    formData.deliveryMethod === 'pickup'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="pickup"
                      checked={formData.deliveryMethod === 'pickup'}
                      onChange={handleInputChange}
                      className="mr-4 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex items-center flex-1">
                      <i className="ri-store-2-line text-orange-500 mr-4 text-2xl"></i>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Pickup</div>
                        <div className="text-sm text-gray-600">Pick up at our store</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">Free</div>
                        {!isKioskMode && <div className="text-xs text-gray-500">No delivery fee</div>}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Kiosk Mode: Order Type Selection */}
            {isKioskMode && currentStep === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <i className="ri-restaurant-line text-orange-500"></i>
                  Order Type
                </h2>
                <div className="space-y-4">
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-orange-50 ${
                    formData.kioskOrderType === 'pickup'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <input
                      type="radio"
                      name="kioskOrderType"
                      value="pickup"
                      checked={formData.kioskOrderType === 'pickup'}
                      onChange={handleInputChange}
                      className="mr-4 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex items-center">
                      <i className="ri-takeaway-line text-orange-500 mr-4 text-2xl"></i>
                      <div>
                        <div className="font-semibold text-gray-900">Take-Out</div>
                        <div className="text-sm text-gray-600">Order to go</div>
                      </div>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-orange-50 ${
                    formData.kioskOrderType === 'delivery'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}>
                    <input
                      type="radio"
                      name="kioskOrderType"
                      value="delivery"
                      checked={formData.kioskOrderType === 'delivery'}
                      onChange={handleInputChange}
                      className="mr-4 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex items-center">
                      <i className="ri-restaurant-line text-orange-500 mr-4 text-2xl"></i>
                      <div>
                        <div className="font-semibold text-gray-900">Dine-In</div>
                        <div className="text-sm text-gray-600">Eat at the restaurant</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Payment Method */}
            {((isKioskMode && currentStep === 2) || (!isKioskMode && currentStep === 4)) && (
              <div className="animate-fade-in">
                <div className="border-b border-gray-100 pb-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <i className="ri-cash-line text-orange-600 text-sm"></i>
                    </div>
                    Payment Method
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Choose how you'd like to pay for your order</p>
                </div>
                {isKioskMode ? (
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                    <div className="flex items-center">
                      <i className="ri-cash-line text-yellow-600 mr-4 text-3xl"></i>
                      <div>
                        <h3 className="font-semibold text-yellow-800 text-lg">Pay at Cashier</h3>
                        <p className="text-yellow-700 mt-1">
                          After placing your order, take your receipt to the cashier to complete payment.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 hover:bg-orange-50 ${
                      formData.paymentMethod === 'cash'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === 'cash'}
                        onChange={handleInputChange}
                        className="mr-4 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex items-center">
                        <i className="ri-cash-line text-orange-500 mr-4 text-2xl"></i>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formData.deliveryMethod === 'delivery' ? 'Cash on Delivery' : 'Pay on Pickup'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Pay with cash when you receive your order
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Premium Navigation Buttons */}
            <div className="bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-sm border-t border-gradient-to-r from-orange-100 via-gray-200 to-red-100 p-4 sm:p-8 mt-8 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-2xl relative overflow-hidden">
              {/* Premium Background Accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-50/30 via-transparent to-red-50/30"></div>
              
              <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 relative z-10">
                <Button
                  onClick={handlePrevStep}
                  variant="outline"
                  disabled={currentStep === 1}
                  className={`w-full lg:w-auto flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                    currentStep === 1 
                      ? 'border-2 border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50/50' 
                      : 'border-2 border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xl shadow-gray-200/50'
                  }`}
                >
                  <i className="ri-arrow-left-line text-lg"></i>
                  Previous
                </Button>
                
                <div className="flex items-center gap-3 text-sm font-semibold text-gray-600 bg-white/80 px-4 lg:px-6 py-2 lg:py-3 rounded-xl shadow-lg border border-gray-200/50 bg-gradient-to-r from-orange-50 to-red-50">
                  <div className="w-2 h-2 lg:w-3 lg:h-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse"></div>
                  <span className="font-bold">Step {currentStep} of {steps.length}</span>
                  <span className="text-xs text-gray-500 ml-1">• {steps.find(s => s.id === currentStep)?.title}</span>
                </div>
                
                {currentStep < steps.length ? (
                  <Button
                    onClick={handleNextStep}
                    disabled={isNextButtonDisabled()}
                    className={`w-full lg:w-auto flex items-center justify-center gap-3 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-300 shadow-xl ${
                      isNextButtonDisabled()
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-gray-200/50'
                        : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-orange-300/50 hover:shadow-orange-400/50 hover:scale-105'
                    }`}
                  >
                    Next
                    <i className="ri-arrow-right-line text-lg"></i>
                  </Button>
                ) : (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full lg:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 lg:px-10 py-3 lg:py-4 font-bold rounded-xl transition-all duration-300 shadow-xl shadow-green-300/50 hover:shadow-green-400/50 hover:scale-105"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin" />
                        {isKioskMode ? 'Generating Receipt...' : 'Placing Order...'}
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line" />
                        {isKioskMode ? 'Place Order & Print Receipt' : 'Place Order'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>

          {/* Right Column - Premium Order Summary (Mobile: full width, Desktop: 2/5) */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="lg:sticky lg:top-6 xl:sticky xl:top-8">
              <div className="order-summary-card bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-gray-200/50 border border-white/70 p-4 sm:p-6 md:p-6 lg:p-8 xl:p-8 relative overflow-hidden">
                {/* Premium Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-full blur-2xl"></div>
                
                {/* Header Section */}
                <div className="flex items-center justify-between mb-6 md:mb-8 lg:mb-8 relative z-10">
                  <h3 className="text-lg md:text-xl lg:text-xl xl:text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200/50 border border-orange-200/50">
                      <i className="ri-shopping-bag-line text-orange-600 text-base md:text-lg lg:text-lg xl:text-xl"></i>
                    </div>
                    <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">Order Summary</span>
                  </h3>
                  <button 
                    onClick={() => navigate(-1)}
                    className="text-xs md:text-sm lg:text-sm xl:text-base text-orange-600 hover:text-orange-700 font-semibold px-3 md:px-4 lg:px-4 xl:px-5 py-1.5 md:py-2 lg:py-2 xl:py-2.5 rounded-xl hover:bg-orange-50 transition-all duration-300 border border-orange-200 hover:border-orange-300 shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <i className="ri-edit-line"></i>
                    Edit Cart
                  </button>
                </div>
              
                {/* Cart Items Section */}
                <div className="space-y-3 md:space-y-4 lg:space-y-4 mb-6 md:mb-8 lg:mb-8">
                  {cartItems.map((item: CartItemWithSize, index: number) => (
                    <div key={`cart-item-${item.id}-${item.size_option_id || 'default'}-${index}`} className="order-summary-item group flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-white to-gray-50/50 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all duration-300">
                      <div className="w-12 h-12 md:w-14 md:h-14 lg:w-14 lg:h-14 xl:w-16 xl:h-16 bg-gradient-to-br from-orange-100 via-orange-50 to-red-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all duration-300">
                        <i className="ri-restaurant-line text-lg md:text-xl lg:text-xl xl:text-2xl text-orange-600 group-hover:scale-110 transition-transform duration-300"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate text-sm md:text-base lg:text-base xl:text-lg">{item.name}</h4>
                        {item.selected_size && (
                          <p className="text-xs md:text-sm lg:text-sm xl:text-base text-gray-600 mt-1 font-medium">Size: {item.selected_size.name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 md:mt-3">
                          <span className="text-xs md:text-sm lg:text-sm xl:text-base font-semibold text-gray-600 bg-gray-100 px-2 md:px-3 py-1 rounded-full">Qty: {item.quantity}</span>
                          <span className="font-bold text-base md:text-lg lg:text-lg xl:text-xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{formatPesoSimple(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing Summary Section */}
                <div className="price-breakdown border-t border-gradient-to-r from-orange-100 via-gray-200 to-red-100 pt-4 md:pt-6 lg:pt-6 space-y-3 md:space-y-4 lg:space-y-4 bg-gradient-to-r from-gray-50/30 to-white/30 p-4 md:p-6 lg:p-6 rounded-xl">
                  <div className="flex justify-between items-center text-gray-700 font-semibold">
                    <span className="text-sm md:text-base lg:text-base xl:text-lg">Subtotal</span>
                    <span className="text-base md:text-lg lg:text-lg xl:text-xl">{formatPesoSimple(getTotalPrice())}</span>
                  </div>
                  {!isKioskMode && (
                    <div className="flex justify-between items-center text-gray-700 font-semibold">
                      <span className="text-sm md:text-base lg:text-base xl:text-lg">Delivery Fee</span>
                      <span className="text-base md:text-lg lg:text-lg xl:text-xl">{deliveryFee > 0 ? formatPesoSimple(deliveryFee) : <span className="text-green-600 font-bold">Free</span>}</span>
                    </div>
                  )}
                  <div className="total-amount flex justify-between items-center border-t border-gray-200 pt-3 md:pt-4 bg-gradient-to-r from-orange-50/50 to-red-50/50 p-3 md:p-4 rounded-xl shadow-inner">
                    <span className="text-lg md:text-xl lg:text-xl xl:text-2xl font-bold text-gray-900">Total</span>
                    <span className="text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent drop-shadow-sm">
                      {formatPesoSimple(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
