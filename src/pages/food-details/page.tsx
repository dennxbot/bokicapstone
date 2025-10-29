
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFoodItems } from '../../hooks/useFoodItems';
import { useSizes } from '../../hooks/useSizes';
import { useCart } from '../../hooks/useCart';
import { useAuth } from './../../hooks/useAuth';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';

export default function FoodDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { getFoodItemById, isLoading } = useFoodItems();
  const { getFoodItemSizes } = useSizes();
  const [quantity, setQuantity] = useState(1);
  // Removed unused setShowAddToCartMessage variable
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [sizesLoading, setSizesLoading] = useState(true);
  const sizesLoadedRef = useRef<string | null>(null);

  const item = getFoodItemById(id || '');

  // Load available sizes for this food item
  useEffect(() => {
    const loadSizes = async () => {
      if (!id) {
        console.log('🚫 No food item ID provided');
        return;
      }
      
      // Prevent loading sizes multiple times for the same item
      if (sizesLoadedRef.current === id) {
        console.log('🔄 Sizes already loaded for this item');
        return;
      }
      
      console.log('🔍 Loading sizes for food item:', id);
      console.log('📋 Item details:', item);
      
      try {
        setSizesLoading(true);
        console.log('⏳ Calling getFoodItemSizes...');
        const sizes = await getFoodItemSizes(id);
        console.log('✅ Sizes loaded:', sizes);
        setAvailableSizes(sizes);
        sizesLoadedRef.current = id;
        
        // Set default selected size to the first available size
        if (sizes.length > 0 && !selectedSize) {
          console.log('🎯 Setting default selected size:', sizes[0].id);
          setSelectedSize(sizes[0].id);
        } else if (sizes.length === 0) {
          console.log('⚠️ No sizes found for this item');
        }
      } catch (error) {
        console.error('❌ Error loading sizes:', error);
        // Don't use fallback sizes - only show size selection if sizes are actually configured
        console.log('⚠️ No sizes configured for this item - size selection will be hidden');
        setAvailableSizes([]);
        setSelectedSize('');
        sizesLoadedRef.current = id;
      } finally {
        console.log('🏁 Setting sizesLoading to false');
        setSizesLoading(false);
      }
    };

    loadSizes();
  }, [id, getFoodItemSizes]);

  // Reset sizes when navigating to a different item
  useEffect(() => {
    if (id && sizesLoadedRef.current !== id) {
      setAvailableSizes([]);
      setSelectedSize('');
      setSizesLoading(true);
      sizesLoadedRef.current = null;
    }
  }, [id]);

  const selectedSizeData = availableSizes.find(s => s.id === selectedSize);
  const currentPrice = selectedSizeData ? selectedSizeData.calculated_price : (item?.price || 0);

  // 🔍 COMPREHENSIVE DEBUG LOGGING
  console.log('='.repeat(50));
  console.log('🔍 FOOD DETAILS DEBUG - Full Pricing Flow');
  console.log('='.repeat(50));
  console.log('📋 Item Info:', {
    itemId: item?.id,
    itemName: item?.name,
    basePrice: item?.price,
    category: item?.category
  });
  console.log('📏 Size Selection:', {
    selectedSize,
    selectedSizeData: selectedSizeData ? {
      id: selectedSizeData.id,
      name: selectedSizeData.name,
      calculated_price: selectedSizeData.calculated_price,
      price_multiplier: selectedSizeData.price_multiplier,
      base_price: selectedSizeData.base_price
    } : null
  });
  console.log('💰 Price Calculation:', {
    currentPrice,
    priceSource: selectedSizeData ? 'size_calculated_price' : 'item_base_price'
  });
  console.log('📊 All Available Sizes:', availableSizes.map(s => ({
    id: s.id,
    name: s.name,
    calculated_price: s.calculated_price,
    price_multiplier: s.price_multiplier,
    base_price: s.base_price
  })));
  console.log('='.repeat(50));

  const handleAddToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!item) return;
    
    // Use the proper CartItem interface structure with size information
    const cartItem = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: currentPrice, // This should be the calculated price from size selection
      image: item.image_url || '',
      category: item.category?.name || '',
      featured: item.is_featured || false,
      available: item.is_available || true,
      size_option_id: selectedSize,
      size_name: selectedSizeData?.name || undefined,
      size_multiplier: selectedSizeData?.price_multiplier || undefined
    };

    // 🛒 CART ADDITION DEBUG
    console.log('🛒 ADDING TO CART - Debug Info:');
    console.log('📦 Cart Item Object:', cartItem);
    console.log('🔢 Quantity:', quantity);
    console.log('💵 Expected Price in Cart:', cartItem.price);
    console.log('🏷️ Size Info:', {
      size_option_id: cartItem.size_option_id,
      size_name: cartItem.size_name,
      size_multiplier: cartItem.size_multiplier
    });
    
    addToCart(cartItem, quantity);
    
    // Add a small delay to see the cart state after addition
    setTimeout(() => {
      console.log('⏰ POST-ADD DEBUG: Checking cart state after addition...');
    }, 100);
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="ri-restaurant-line text-orange-500 text-xl"></i>
            </div>
          </div>
          <p className="text-gray-600 font-medium">Loading delicious details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-3xl p-8 shadow-xl border border-orange-100 max-w-sm mx-4">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Food item not found</h3>
          <p className="text-gray-500 mb-6">The item you're looking for doesn't exist</p>
          <Button 
            onClick={() => navigate('/')} 
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            <i className="ri-home-line mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-orange-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-300"
          >
            <i className="ri-arrow-left-line text-xl text-orange-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Food Details</h1>
          <button className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-300">
            <i className="ri-heart-line text-xl text-orange-600" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Enhanced Food Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={item.image_url || `https://readdy.ai/api/search-image?query=delicious%20$%7Bitem.name%7D%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${item.id}&orientation=landscape`}
            alt={item.name}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          {item.is_featured && (
            <div className="absolute top-6 left-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              ⭐ Featured Item
            </div>
          )}
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-red-500 text-white px-6 py-3 rounded-2xl font-bold text-lg shadow-xl">
                Out of Stock
              </div>
            </div>
          )}
          <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="flex items-center gap-1 text-yellow-500">
              <i className="ri-star-fill"></i>
              <span className="font-semibold text-gray-900">4.8</span>
              <span className="text-gray-600 text-sm">(124)</span>
            </div>
          </div>
        </div>

        {/* Enhanced Food Info */}
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 shadow-2xl">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">{item.name}</h2>
                <div className="flex items-center gap-4 mb-4">
                   <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                     {formatPesoSimple(currentPrice)}
                   </span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <i className="ri-time-line"></i>
                    <span>15-20 min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <i className="ri-fire-line"></i>
                    <span>350 cal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Description</h3>
              <p className={`text-gray-600 leading-relaxed ${!showFullDescription ? 'line-clamp-3' : ''}`}>
                {item.description || 'A delicious and carefully prepared dish made with the finest ingredients. Perfect for any time of the day and guaranteed to satisfy your taste buds with its amazing flavors and textures.'}
              </p>
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-orange-500 font-medium text-sm mt-2 cursor-pointer hover:text-orange-600"
              >
                {showFullDescription ? 'Show less' : 'Read more'}
              </button>
            </div>

            {/* Size Selection */}
            {item.is_available && availableSizes.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Choose Size</h3>
                {sizesLoading ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-2xl border-2 border-gray-200 animate-pulse">
                        <div className="text-center">
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availableSizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.id)}
                        className={`p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                          selectedSize === size.id
                            ? 'border-orange-500 bg-orange-50 shadow-lg'
                            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                        }`}
                      >
                        <div className="text-center">
                          <p className={`font-semibold ${selectedSize === size.id ? 'text-orange-600' : 'text-gray-900'}`}>
                            {size.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{size.description}</p>
                          <p className={`text-sm font-medium mt-2 ${selectedSize === size.id ? 'text-orange-600' : 'text-gray-600'}`}>
                             {formatPesoSimple(size.calculated_price)}
                           </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            {item.is_available && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quantity</h3>
                <div className="flex items-center justify-center gap-6 bg-gray-50 rounded-2xl p-4">
                  <button
                    onClick={decrementQuantity}
                    className="w-12 h-12 rounded-full bg-white border-2 border-orange-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all duration-300 disabled:opacity-50"
                    disabled={quantity <= 1}
                  >
                    <i className="ri-subtract-line text-orange-600" />
                  </button>
                  <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    className="w-12 h-12 rounded-full bg-white border-2 border-orange-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 cursor-pointer transition-all duration-300"
                  >
                    <i className="ri-add-line text-orange-600" />
                  </button>
                </div>
              </div>
            )}

            {/* Total Price */}
            {item.is_available && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-2xl mb-8 border border-orange-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-medium text-gray-700">Total Price</p>
                    <p className="text-sm text-gray-500">{quantity} × {formatPesoSimple(currentPrice)}</p>
                  </div>
                  <span className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                     {formatPesoSimple(currentPrice * quantity)}
                   </span>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!item.is_available}
              className={`w-full py-4 text-lg font-bold rounded-2xl transition-all duration-300 ${
                item.is_available 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-105' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              size="lg"
            >
              {item.is_available ? (
                <>
                  <i className="ri-shopping-cart-line mr-3" />
                  Add to Cart - {formatPesoSimple(currentPrice * quantity)}
                </>
              ) : (
                <>
                  <i className="ri-close-circle-line mr-3" />
                  Currently Out of Stock
                </>
              )}
            </Button>
          </div>
        </div>
      </div>


    </div>
  );
}
