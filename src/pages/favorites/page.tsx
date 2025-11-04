import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { formatPesoSimple } from '../../lib/currency';
import Button from '../../components/base/Button';
import { toast } from 'react-hot-toast';

export default function Favorites() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { favorites, isLoading, removeFromFavorites, favoritesCount } = useFavorites();
  const { addToCart } = useCart();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Redirect to login if not authenticated (only after loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Return null if not authenticated (will redirect via useEffect)
  if (!user) {
    return null;
  }

  const handleRemoveFromFavorites = async (foodItemId: string) => {
    setRemovingIds(prev => new Set(prev).add(foodItemId));
    try {
      await removeFromFavorites(foodItemId);
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(foodItemId);
        return newSet;
      });
    }
  };

  const handleAddToCart = (item: any) => {
    const cartItem = {
      id: item.food_items.id,
      name: item.food_items.name,
      description: item.food_items.description || '',
      price: item.food_items.price,
      image: item.food_items.image_url || `https://readdy.ai/api/search-image?query=delicious%20${item.food_items.name}%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${item.food_items.id}&orientation=landscape`,
      category: item.food_items.category?.name || 'Other',
      featured: item.food_items.is_featured,
      available: item.food_items.is_available
    };
    
    addToCart(cartItem);
    toast.success(`${item.food_items.name} added to cart!`);
  };

  const handleViewDetails = (foodItemId: string) => {
    navigate(`/food-details/${foodItemId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-lg p-2"
              aria-label="Go back to previous page"
              onKeyDown={(e) => handleKeyDown(e, () => navigate(-1))}
            >
              <i className="ri-arrow-left-line text-xl mr-2" aria-hidden="true"></i>
              Back
            </button>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center">
              <i className="ri-heart-fill text-red-500 mr-2" aria-hidden="true"></i>
              My Favorites ({favoritesCount})
            </h1>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <i className="ri-heart-line text-6xl text-gray-300" aria-hidden="true"></i>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">No favorites yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start exploring our delicious menu and add items to your favorites by clicking the heart icon.
            </p>
            <Button
              onClick={() => navigate('/menu')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              Browse Menu
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={favorite.food_items.image_url || `https://readdy.ai/api/search-image?query=delicious%20${favorite.food_items.name}%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${favorite.food_items.id}&orientation=landscape`}
                    alt={favorite.food_items.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Remove from favorites button */}
                  <button
                    onClick={() => handleRemoveFromFavorites(favorite.food_item_id)}
                    disabled={removingIds.has(favorite.food_item_id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-white hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Remove ${favorite.food_items.name} from favorites`}
                    onKeyDown={(e) => handleKeyDown(e, () => handleRemoveFromFavorites(favorite.food_item_id))}
                  >
                    {removingIds.has(favorite.food_item_id) ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                    ) : (
                      <i className="ri-heart-fill text-xl" aria-hidden="true"></i>
                    )}
                  </button>

                  {/* Availability badge */}
                  {!favorite.food_items.is_available && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Unavailable
                    </div>
                  )}

                  {/* Featured badge */}
                  {favorite.food_items.is_featured && (
                    <div className="absolute bottom-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Featured
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-800 text-lg mb-1 line-clamp-1">
                      {favorite.food_items.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                      {favorite.food_items.description || 'Delicious food item from our menu'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-600 font-bold text-lg">
                        {formatPesoSimple(favorite.food_items.price)}
                      </span>
                      {favorite.food_items.category && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {favorite.food_items.category.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewDetails(favorite.food_item_id)}
                      variant="outline"
                      className="flex-1 text-sm py-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() => handleAddToCart(favorite)}
                      disabled={!favorite.food_items.is_available}
                      className="flex-1 text-sm py-2 bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed focus:ring-orange-500"
                    >
                      {favorite.food_items.is_available ? 'Add to Cart' : 'Unavailable'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}