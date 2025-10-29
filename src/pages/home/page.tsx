
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFoodItems } from '../../hooks/useFoodItems';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import FoodCard from '../../components/feature/FoodCard';
import BottomNavigation from '../../components/feature/BottomNavigation';
import FloatingCartButton from '../../components/feature/FloatingCartButton';
import Button from '../../components/base/Button';

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { foodItems, categories, isLoading } = useFoodItems();
  const [showAddToCartMessage, setShowAddToCartMessage] = useState(false);

  const featuredItems = foodItems.filter(item => item.is_featured);

  const handleAddToCart = (item: any) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const cartItem = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      image: item.image_url || `https://readdy.ai/api/search-image?query=delicious%20${item.name}%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${item.id}&orientation=landscape`,
      category: item.category?.name || 'Other',
      featured: item.is_featured,
      available: item.is_available
    };
    
    addToCart(cartItem);
    setShowAddToCartMessage(true);
    setTimeout(() => setShowAddToCartMessage(false), 3000);
  };

  const handleViewDetails = (item: any) => {
    navigate(`/food/${item.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="ri-restaurant-line text-orange-500 text-xl"></i>
            </div>
          </div>
          <p className="text-gray-600 font-medium">Loading delicious food...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-20 lg:pb-8">
      {/* Hero Section */}
      <div 
        className="relative min-h-[70vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://readdy.ai/api/search-image?query=modern%20restaurant%20interior%20with%20warm%20lighting%2C%20elegant%20dining%20atmosphere%2C%20professional%20food%20service%20background%2C%20cozy%20ambiance%20with%20wooden%20tables%20and%20comfortable%20seating&width=1920&height=1080&seq=hero1&orientation=landscape')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-red-900/60 to-orange-900/80"></div>
        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Delicious Food
            <span className="block bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Delivered Fresh
            </span>
          </h1>
          <p className="text-xl sm:text-2xl mb-8 text-gray-200 leading-relaxed">
            Experience the finest flavors crafted with love and delivered to your doorstep
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/menu')}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
            >
              <i className="ri-restaurant-line mr-3 text-xl"></i>
              Order Now
            </Button>
            <Button
              onClick={() => navigate('/menu')}
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg font-semibold backdrop-blur-sm transition-all duration-300"
            >
              <i className="ri-eye-line mr-3 text-xl"></i>
              View Menu
            </Button>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Browse Categories
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our carefully curated selection of delicious food categories
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => navigate('/menu')}
                className="group bg-white rounded-3xl shadow-lg border border-orange-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={category.image_url || `https://readdy.ai/api/search-image?query=delicious%20$%7Bcategory.name%7D%20food%20category%20with%20appetizing%20presentation%2C%20restaurant%20quality%20photography%2C%20clean%20background&width=400&height=300&seq=${category.id}&orientation=landscape`}
                    alt={category.name}
                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                    <p className="text-gray-200 text-sm">{category.description || `Explore our ${category.name.toLowerCase()} selection`}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Items Section */}
      {featuredItems.length > 0 && (
        <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Featured Dishes
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our chef's special recommendations just for you
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {featuredItems.slice(0, 8).map((item) => (
                <FoodCard
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    price: item.price,
                    image_url: item.image_url || `https://readdy.ai/api/search-image?query=delicious%20${item.name}%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${item.id}&orientation=landscape`,
                    category_id: item.category_id,
                    is_available: item.is_available,
                    is_featured: item.is_featured,
                    preparation_time: item.preparation_time
                  }}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
            <div className="text-center mt-12">
              <Button
                onClick={() => navigate('/menu')}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <i className="ri-arrow-right-line mr-3 text-xl"></i>
                View Full Menu
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Order?
            </h2>
            <p className="text-xl text-orange-100 mb-8 leading-relaxed">
              Join thousands of satisfied customers who trust us for their daily meals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/menu')}
                size="lg"
                className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <i className="ri-shopping-cart-line mr-3 text-xl"></i>
                Start Ordering
              </Button>
              {!user && (
                <Button
                  onClick={() => navigate('/signup')}
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white hover:bg-white hover:text-orange-600 px-8 py-4 text-lg font-semibold transition-all duration-300"
                >
                  <i className="ri-user-add-line mr-3 text-xl"></i>
                  Sign Up
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Cart Message */}
      {showAddToCartMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <i className="ri-check-line text-lg" />
            </div>
            <div>
              <p className="font-semibold">Added to cart!</p>
              <p className="text-sm opacity-90">Item successfully added</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNavigation />
      </div>

      {/* Desktop Floating Cart Button */}
      <div className="hidden lg:block">
        <FloatingCartButton />
      </div>
    </div>
  );
}
