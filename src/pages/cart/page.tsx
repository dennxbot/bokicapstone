import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useBanStatus } from '../../hooks/useBanStatus';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import { formatPesoSimple } from '../../lib/currency';
import BottomNavigation from '../../components/feature/BottomNavigation';
import BannedUserWarning from '../../components/feature/BannedUserWarning';
import Button from '../../components/base/Button';

export default function Cart() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const banStatus = useBanStatus();
  const { isKioskMode } = useKioskAuth();
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    getTotalPrice 
  } = useCart();

  const [isClearing, setIsClearing] = useState(false);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [updatingQuantities, setUpdatingQuantities] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Helper functions for cart calculations
  const getSubtotal = () => getTotalPrice();
  const getDeliveryFee = () => {
    // In kiosk mode, no delivery fees are charged
    if (isKioskMode) {
      return 0;
    }
    // For regular users, delivery fee would be determined during checkout
    // For now, we'll show 0 in cart and let checkout handle the actual fee
    return 0;
  };
  const getTotal = () => getSubtotal() + getDeliveryFee();

  // Enhanced quantity update with visual feedback
  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }

    setUpdatingQuantities(prev => new Set(prev).add(itemId));
    
    // Add a small delay for better UX feedback
    setTimeout(() => {
      updateQuantity(itemId, newQuantity);
      setUpdatingQuantities(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 200);
  };

  // Enhanced remove item with animation
  const handleRemoveItem = (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId));
    
    setTimeout(() => {
      removeItem(itemId);
      setRemovingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }, 300);
  };

  // Enhanced clear cart with confirmation
  const handleClearCart = () => {
    setShowClearConfirm(true);
  };

  const confirmClearCart = () => {
    setIsClearing(true);
    setTimeout(() => {
      clearCart();
      setIsClearing(false);
      setShowClearConfirm(false);
    }, 500);
  };

  const handleCheckout = () => {
    if (!user && !isKioskMode) {
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    navigate('/menu');
  };

  // Show banned user warning if user is logged in and banned
  if (user && banStatus.isBanned) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-20 lg:pb-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 mr-4 group"
              >
                <i className="ri-arrow-left-line text-xl group-hover:transform group-hover:-translate-x-1 transition-transform duration-300"></i>
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 animate-fade-in">
                  Your Cart
                </h1>
                <p className="text-orange-100 animate-fade-in">
                  {items.length} {items.length === 1 ? 'item' : 'items'} • {formatPesoSimple(getTotal())}
                </p>
              </div>
            </div>
            
            {/* Cart Actions */}
            {items.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClearCart}
                  className="hidden sm:flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 text-sm font-medium"
                >
                  <i className="ri-delete-bin-line mr-2"></i>
                  Clear Cart
                </button>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <i className="ri-shopping-cart-2-line text-xl"></i>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {items.length === 0 ? (
          /* Enhanced Empty Cart State */
          <div className="text-center py-16 sm:py-20">
            <div className="max-w-md mx-auto">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-float">
                <i className="ri-shopping-cart-line text-5xl text-orange-600"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 animate-fade-in">
                Your cart is empty
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed animate-fade-in">
                Looks like you haven't added any delicious items to your cart yet. 
                Browse our menu and discover amazing dishes!
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
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Enhanced Cart Items */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Cart Items ({items.length})
                </h2>
                <button
                  onClick={handleClearCart}
                  className="sm:hidden flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 text-sm font-medium"
                >
                  <i className="ri-delete-bin-line mr-2"></i>
                  Clear All
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {items.map((item, index) => (
                  <div
                    key={`cart-item-${item.id}-${item.selected_size?.id || 'default'}-${index}`}
                    className={`bg-white rounded-2xl shadow-lg border border-orange-100 overflow-hidden transition-all duration-500 ${
                      removingItems.has(item.id) 
                        ? 'opacity-0 transform scale-95 -translate-x-full' 
                        : 'opacity-100 transform scale-100 translate-x-0'
                    } ${
                      updatingQuantities.has(item.id) ? 'ring-2 ring-orange-200' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Enhanced Item Image */}
                      <div className="relative flex-shrink-0 sm:w-48 aspect-[4/3] sm:aspect-square">
                        <img
                          src={item.image || `https://readdy.ai/api/search-image?query=delicious%20${item.name}%20food%20photography&width=300&height=300&seq=${item.id}`}
                          alt={item.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                        {item.featured && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-2 py-1 rounded-full text-xs font-bold">
                            ⭐ Featured
                          </div>
                        )}
                      </div>

                      {/* Enhanced Item Details */}
                      <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight">
                                {item.name}
                              </h3>
                              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-3">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <i className="ri-restaurant-line"></i>
                                  {item.category}
                                </span>
                                <span className="flex items-center gap-1">
                                  <i className="ri-star-fill text-yellow-400"></i>
                                  4.8
                                </span>
                              </div>
                            </div>
                            
                            {/* Enhanced Remove Button */}
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ml-4"
                              title="Remove item"
                            >
                              <i className="ri-close-line text-lg"></i>
                            </button>
                          </div>
                        </div>

                        {/* Enhanced Price and Quantity Controls */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                              <div className="text-lg font-bold text-orange-600">
                                {formatPesoSimple(item.price)}
                              </div>
                            </div>
                            
                            {/* Enhanced Quantity Controls */}
                            <div className="flex items-center bg-gray-50 rounded-xl p-1">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={updatingQuantities.has(item.id)}
                                className="w-10 h-10 bg-white hover:bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                              >
                                <i className="ri-subtract-line text-lg"></i>
                              </button>
                              <div className="w-16 text-center">
                                <div className={`text-lg font-bold text-gray-900 transition-all duration-300 ${
                                  updatingQuantities.has(item.id) ? 'scale-110 text-orange-600' : ''
                                }`}>
                                  {item.quantity}
                                </div>
                                <div className="text-xs text-gray-500">qty</div>
                              </div>
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={updatingQuantities.has(item.id)}
                                className="w-10 h-10 bg-white hover:bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                              >
                                <i className="ri-add-line text-lg"></i>
                              </button>
                            </div>
                          </div>

                          {/* Enhanced Item Total */}
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Total</div>
                            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                              {formatPesoSimple(item.price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Cart Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
                  {/* Summary Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
                    <h3 className="text-xl font-bold mb-2">Order Summary</h3>
                    <p className="text-orange-100 text-sm">Review your order details</p>
                  </div>

                  {/* Summary Details */}
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Subtotal ({items.length} items)</span>
                      <span className="font-semibold text-gray-900">{formatPesoSimple(getSubtotal())}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 flex items-center gap-2">
                        <i className="ri-truck-line text-orange-500"></i>
                        Delivery Fee
                      </span>
                      <span className="font-semibold text-gray-900">{formatPesoSimple(getDeliveryFee())}</span>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                          {formatPesoSimple(getTotal())}
                        </span>
                      </div>
                    </div>

                    {/* Savings Display */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <i className="ri-discount-percent-line"></i>
                        <span className="text-sm font-medium">
                          You're saving {formatPesoSimple(getSubtotal() * 0.1)} with our special offers!
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="p-6 pt-0 space-y-3">
                    <Button
                      onClick={handleCheckout}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <i className="ri-secure-payment-line mr-3"></i>
                      Proceed to Checkout
                    </Button>
                    
                    <Button
                      onClick={handleContinueShopping}
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 font-medium"
                    >
                      <i className="ri-arrow-left-line mr-2"></i>
                      Continue Shopping
                    </Button>
                  </div>
                </div>

                {/* Enhanced Trust Indicators */}
                <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <i className="ri-shield-check-line text-green-500"></i>
                      <span>Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ri-truck-line text-blue-500"></i>
                      <span>Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="ri-customer-service-2-line text-purple-500"></i>
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-delete-bin-line text-2xl text-red-600"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clear Cart?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove all items from your cart? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmClearCart}
                  disabled={isClearing}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isClearing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <i className="ri-delete-bin-line mr-2"></i>
                      Clear Cart
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}