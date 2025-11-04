
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFoodItems } from '../../hooks/useFoodItems';
import { useSizes } from '../../hooks/useSizes';
import { useCart } from '../../hooks/useCart';
import { useAuth } from './../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';
import { toast } from 'react-hot-toast';

export default function FoodDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { getFoodItemById, isLoading } = useFoodItems();
  const { getFoodItemSizes } = useSizes();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isKioskMode } = useKioskAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const sizesLoadedRef = useRef<string | null>(null);

  const item = getFoodItemById(id || '');

  // Mock nutritional information (in real app, this would come from the API)
  const nutritionInfo = {
    calories: 320,
    protein: '18g',
    carbs: '45g',
    fat: '12g',
    fiber: '3g',
    sodium: '580mg'
  };

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
        const sizes = await getFoodItemSizes(id);
        console.log('📏 Loaded sizes:', sizes);
        
        setAvailableSizes(sizes || []);
        
        // Auto-select first available size if none selected
        if (sizes && sizes.length > 0 && selectedSize === null) {
          const firstSize = sizes[0];
          setSelectedSize(firstSize.size_option_id);
          console.log('🎯 Auto-selected first size:', firstSize);
        }
        
        sizesLoadedRef.current = id;
      } catch (error) {
        console.error('❌ Error loading sizes:', error);
        setAvailableSizes([]);
      } finally {
        // Sizes loading completed
      }
    };

    loadSizes();
  }, [id, getFoodItemSizes, selectedSize, item]);

  // Calculate current price based on selected size
  const currentPrice = (() => {
    if (selectedSize === null || availableSizes.length === 0) {
      return item?.price || 0;
    }
    
    const selectedSizeData = availableSizes.find(size => size.size_option_id === selectedSize);
    return selectedSizeData?.calculated_price || item?.price || 0;
  })();

  const handleAddToCart = async () => {
    if (!item || !user) {
      toast.error('Please log in to add items to cart');
      navigate('/login');
      return;
    }

    if (!item.is_available) {
      toast.error('This item is currently out of stock');
      return;
    }

    setIsAddingToCart(true);

    try {
      // Find the selected size object
      const selectedSizeObj = selectedSize 
        ? availableSizes.find(s => s.size_option_id === selectedSize)
        : undefined;
      
      // Create a proper FoodItem object that matches the expected interface
      const foodItemForCart = {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: currentPrice, // Use calculated price instead of original price
        image: item.image_url || '',
        category: item.category?.name || '',
        featured: item.is_featured || false,
        available: item.is_available || true
      };
      
      console.log('🛒 Adding to cart:', { foodItemForCart, selectedSizeObj, quantity });
      
      // Use the proper addToCart function signature
      await addToCart(foodItemForCart, selectedSizeObj, quantity);
      
      // Dispatch custom event for cart update
      window.dispatchEvent(new CustomEvent('cart-updated'));
      
      toast.success(`Added ${quantity} ${item.name} to cart!`);
      
      // Debug: Log cart state after adding
      setTimeout(() => {
        console.log('🔍 Cart state after adding item');
      }, 100);
      
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleToggleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to manage favorites');
      navigate('/login');
      return;
    }
    
    if (!id) {
      toast.error('Invalid food item');
      return;
    }

    await toggleFavorite(id);
  };

  const handleShare = async () => {
    const shareData = {
      title: item?.name || 'Delicious Food',
      text: `Check out this amazing ${item?.name} from BOKI!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share');
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-gray-600">Loading delicious details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center" role="alert">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Food item not found</h2>
          <Button 
            onClick={() => navigate('/')} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            aria-label="Return to home page"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header with enhanced accessibility */}
        <header className="flex items-center justify-between mb-6" role="banner">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg p-2"
            aria-label="Go back to previous page"
            onKeyDown={(e) => handleKeyDown(e, () => navigate(-1))}
          >
            <i className="ri-arrow-left-line text-xl mr-2" aria-hidden="true"></i>
            Back
          </button>
          <nav className="flex items-center space-x-3" role="navigation" aria-label="Food item actions">
            {!isKioskMode && (
              <>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    isFavorite(id || '') ? 'text-red-500 bg-red-50 scale-110' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  aria-label={isFavorite(id || '') ? `Remove ${item?.name} from favorites` : `Add ${item?.name} to favorites`}
                  aria-pressed={isFavorite(id || '')}
                  onKeyDown={(e) => handleKeyDown(e, handleToggleFavorite)}
                >
                  <i className={`ri-heart-${isFavorite(id || '') ? 'fill' : 'line'} text-xl transition-transform duration-200`} aria-hidden="true"></i>
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label={`Share ${item.name}`}
                  onKeyDown={(e) => handleKeyDown(e, handleShare)}
                >
                  <i className="ri-share-line text-xl" aria-hidden="true"></i>
                </button>
                <button
                  onClick={() => setShowNutritionInfo(!showNutritionInfo)}
                  className="p-2 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label="View nutritional information"
                  onKeyDown={(e) => handleKeyDown(e, () => setShowNutritionInfo(!showNutritionInfo))}
                >
                  <i className="ri-heart-pulse-line text-xl" aria-hidden="true"></i>
                </button>
              </>
            )}
          </nav>
        </header>

        <main className="bg-white rounded-2xl shadow-xl overflow-hidden" role="main">
          {/* Simple Image Section */}
          <div className="relative h-64 md:h-80" role="img" aria-label={`${item.name} food image`}>
            <img
              src={item?.image_url || '/placeholder-food.jpg'}
              alt={`${item.name} - A delicious food item from BOKI restaurant`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            
            {!item.is_available && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center" role="alert" aria-live="polite">
                <span className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
                  Out of Stock
                </span>
              </div>
            )}
          </div>

          {/* Content with enhanced structure and accessibility */}
          <div className="p-6">
            <header className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{item.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-2xl font-bold text-orange-600" aria-label={`Price: ${formatPesoSimple(currentPrice)}`}>
                  {formatPesoSimple(currentPrice)}
                </span>
                <div className="flex items-center gap-1 text-yellow-500" role="img" aria-label="4.8 out of 5 stars rating">
                  <i className="ri-star-fill text-sm" aria-hidden="true"></i>
                  <span className="font-semibold text-gray-900 text-sm">4.8</span>
                  <span className="text-gray-600 text-xs">(124 reviews)</span>
                </div>
              </div>
            </header>
            
            {/* Nutritional Information Panel */}
            {!isKioskMode && showNutritionInfo && (
              <section className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 animate-fadeIn" aria-labelledby="nutrition-heading">
                <h2 id="nutrition-heading" className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <i className="ri-heart-pulse-line text-green-600 mr-2" aria-hidden="true"></i>
                  Nutritional Information
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <div className="font-bold text-orange-600">{nutritionInfo.calories}</div>
                    <div className="text-gray-600">Calories</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <div className="font-bold text-blue-600">{nutritionInfo.protein}</div>
                    <div className="text-gray-600">Protein</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <div className="font-bold text-green-600">{nutritionInfo.carbs}</div>
                    <div className="text-gray-600">Carbs</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <div className="font-bold text-yellow-600">{nutritionInfo.fat}</div>
                    <div className="text-gray-600">Fat</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <div className="font-bold text-purple-600">{nutritionInfo.fiber}</div>
                    <div className="text-gray-600">Fiber</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <div className="font-bold text-red-600">{nutritionInfo.sodium}</div>
                    <div className="text-gray-600">Sodium</div>
                  </div>
                </div>
              </section>
            )}
            
            {/* Description with enhanced accessibility */}
            {item.description && (
              <section className="mb-6" aria-labelledby="description-heading">
                <h2 id="description-heading" className="sr-only">Description</h2>
                <p className="text-gray-600 leading-relaxed" aria-expanded={showFullDescription}>
                  {showFullDescription ? item.description : `${item.description.slice(0, 150)}...`}
                </p>
                {item.description.length > 150 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-orange-500 hover:text-orange-600 font-medium mt-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded px-1 transition-colors duration-200"
                    aria-label={showFullDescription ? "Show less description" : "Show full description"}
                    aria-expanded={showFullDescription}
                    onKeyDown={(e) => handleKeyDown(e, () => setShowFullDescription(!showFullDescription))}
                  >
                    {showFullDescription ? 'Show less' : 'Read more'}
                  </button>
                )}
              </section>
            )}

            {/* Size Selection with enhanced accessibility */}
            {availableSizes.length > 0 && (
              <section className="mb-6" aria-labelledby="size-heading">
                <h2 id="size-heading" className="text-lg font-semibold text-gray-800 mb-3">Size Options</h2>
                <fieldset className="grid grid-cols-2 md:grid-cols-3 gap-3" role="radiogroup" aria-labelledby="size-heading">
                  <legend className="sr-only">Choose a size for {item.name}</legend>
                  {availableSizes.map((size) => (
                    <label
                      key={size.size_option_id}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 transform hover:scale-105 ${
                        selectedSize === size.size_option_id
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <input
                        type="radio"
                        name="size"
                        value={size.size_option_id}
                        checked={selectedSize === size.size_option_id}
                        onChange={() => setSelectedSize(size.size_option_id)}
                        className="sr-only"
                        aria-describedby={`size-${size.size_option_id}-description`}
                      />
                      <div className="font-medium">{size.name}</div>
                      <div id={`size-${size.size_option_id}-description`} className="text-sm text-gray-600">
                        {formatPesoSimple(size.calculated_price)}
                      </div>
                    </label>
                  ))}
                </fieldset>
              </section>
            )}

            {/* Quantity with enhanced accessibility */}
            <section className="mb-6" aria-labelledby="quantity-heading">
              <h2 id="quantity-heading" className="text-lg font-semibold text-gray-800 mb-3">Quantity</h2>
              <div className="flex items-center space-x-4" role="group" aria-labelledby="quantity-heading">
                <button
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 hover:scale-110"
                  aria-label="Decrease quantity"
                  onKeyDown={(e) => handleKeyDown(e, decrementQuantity)}
                >
                  <i className="ri-subtract-line" aria-hidden="true"></i>
                </button>
                <span 
                  className="text-xl font-semibold w-8 text-center transition-all duration-200" 
                  aria-live="polite" 
                  aria-label={`Current quantity: ${quantity} items`}
                >
                  {quantity}
                </span>
                <button
                  onClick={incrementQuantity}
                  className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 hover:scale-110"
                  aria-label="Increase quantity"
                  onKeyDown={(e) => handleKeyDown(e, incrementQuantity)}
                >
                  <i className="ri-add-line" aria-hidden="true"></i>
                </button>
              </div>
            </section>

            {/* Total Price with enhanced accessibility */}
            <section className="mb-6 p-4 bg-gradient-to-r from-orange-100 to-red-100 rounded-xl" aria-labelledby="total-heading">
              <h2 id="total-heading" className="sr-only">Order Total</h2>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800">Total:</span>
                <span 
                  className="text-2xl font-bold text-orange-600 transition-all duration-200"
                  aria-label={`Total price: ${formatPesoSimple(currentPrice * quantity)}`}
                >
                  {formatPesoSimple(currentPrice * quantity)}
                </span>
              </div>
            </section>

            {/* Add to Cart Button with enhanced accessibility */}
            <Button
              onClick={handleAddToCart}
              disabled={!item.is_available || isAddingToCart}
              className={`w-full py-4 text-lg font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-orange-300 focus:ring-offset-2 transform hover:scale-105 ${
                item.is_available 
                  ? isAddingToCart
                    ? 'bg-orange-400 text-white cursor-wait'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              size="lg"
              aria-label={
                item.is_available 
                  ? isAddingToCart 
                    ? "Adding item to cart, please wait"
                    : `Add ${quantity} ${item.name} to cart for ${formatPesoSimple(currentPrice * quantity)}`
                  : `${item.name} is currently out of stock`
              }
              aria-live="polite"
              onKeyDown={(e) => handleKeyDown(e, handleAddToCart)}
            >
              {item.is_available ? (
                isAddingToCart ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" aria-hidden="true"></div>
                    Adding to Cart...
                  </>
                ) : (
                  <>
                    <i className="ri-shopping-cart-line mr-3" aria-hidden="true" />
                    Add to Cart - {formatPesoSimple(currentPrice * quantity)}
                  </>
                )
              ) : (
                <>
                  <i className="ri-close-circle-line mr-3" aria-hidden="true" />
                  Currently Out of Stock
                </>
              )}
            </Button>

            {/* Additional Info Section with enhanced accessibility */}
            <section className="mt-6 pt-6 border-t border-gray-200" aria-labelledby="additional-info-heading">
              <h2 id="additional-info-heading" className="sr-only">Additional Information</h2>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="flex flex-col items-center p-3 bg-green-50 rounded-xl transition-all duration-200 hover:bg-green-100 hover:scale-105" role="img" aria-label="Free delivery available for orders above 500 pesos">
                  <i className="ri-truck-line text-green-600 text-2xl mb-2" aria-hidden="true"></i>
                  <span className="text-sm font-medium text-green-700">Free Delivery</span>
                  <span className="text-xs text-green-600">Above ₱500</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-blue-50 rounded-xl transition-all duration-200 hover:bg-blue-100 hover:scale-105" role="img" aria-label="Fresh guarantee - quality assured">
                  <i className="ri-shield-check-line text-blue-600 text-2xl mb-2" aria-hidden="true"></i>
                  <span className="text-sm font-medium text-blue-700">Fresh Guarantee</span>
                  <span className="text-xs text-blue-600">Quality assured</span>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
