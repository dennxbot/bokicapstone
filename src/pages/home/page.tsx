
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useFoodItems } from '../../hooks/useFoodItems';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useBanStatus } from '../../hooks/useBanStatus';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import FoodCard from '../../components/feature/FoodCard';
import BottomNavigation from '../../components/feature/BottomNavigation';
import FloatingCartButton from '../../components/feature/FloatingCartButton';
import BannedUserWarning from '../../components/feature/BannedUserWarning';
import Button from '../../components/base/Button';

export default function Home() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, logout } = useAuth();
  const banStatus = useBanStatus();
  const { isKioskMode } = useKioskAuth();
  const { foodItems, categories, isLoading } = useFoodItems();

  // Redirect to menu if in kiosk mode
  useEffect(() => {
    if (isKioskMode) {
      navigate('/menu', { replace: true });
    }
  }, [isKioskMode, navigate]);

  const featuredItems = foodItems.filter(item => item.is_featured);

  const handleAddToCart = (item: any) => {
    if (!user && !isKioskMode) {
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
  };

  const handleViewDetails = (item: any) => {
    navigate(`/food/${item.id}`);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="ri-restaurant-line text-orange-500 text-xl animate-pulse"></i>
            </div>
          </div>
          <p className="text-gray-600 font-medium animate-pulse">Loading delicious food...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-20 lg:pb-8">
      {/* Hero Section - Enhanced with better responsive design */}
      <div 
        className="relative min-h-[85vh] sm:min-h-[80vh] lg:min-h-[75vh] flex items-center justify-center bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://readdy.ai/api/search-image?query=modern%20restaurant%20interior%20with%20warm%20lighting%2C%20elegant%20dining%20atmosphere%2C%20professional%20food%20service%20background%2C%20cozy%20ambiance%20with%20wooden%20tables%20and%20comfortable%20seating&width=1920&height=1080&seq=hero1&orientation=landscape')`
        }}
      >
        {/* Animated background overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 via-red-900/60 to-orange-900/80 animate-pulse"></div>
        
        {/* Floating elements for visual interest */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-orange-400/20 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-red-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute top-1/3 right-20 w-16 h-16 bg-yellow-400/20 rounded-full blur-lg animate-bounce delay-1000"></div>
        
        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          {/* Enhanced typography with better hierarchy */}
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="block transform hover:scale-105 transition-transform duration-300">
                Delicious Food
              </span>
              <span className="block bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-gradient-x">
                Delivered Fresh
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-200 leading-relaxed max-w-3xl mx-auto opacity-90">
              Experience the finest flavors crafted with love and delivered to your doorstep with lightning-fast service
            </p>
            
            {/* Enhanced CTA buttons with better spacing and animations */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-8">
              <Button
                onClick={() => navigate('/menu')}
                size="lg"
                className="group bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-white/20"
              >
                <i className="ri-restaurant-line mr-3 text-xl group-hover:animate-bounce"></i>
                Order Now
                <i className="ri-arrow-right-line ml-3 text-xl group-hover:translate-x-1 transition-transform duration-300"></i>
              </Button>
              <Button
                onClick={() => navigate('/menu')}
                variant="outline"
                size="lg"
                className="group border-2 border-white/80 text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg font-semibold backdrop-blur-sm transition-all duration-300 hover:shadow-xl"
              >
                <i className="ri-eye-line mr-3 text-xl group-hover:scale-110 transition-transform duration-300"></i>
                View Menu
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Categories Section - Enhanced with better grid and animations */}
      <div className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced section header */}
          <div className="text-center mb-12 lg:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full mb-6">
              <i className="ri-apps-2-line text-2xl text-orange-600"></i>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Browse Categories
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover our carefully curated selection of delicious food categories, each crafted to perfection
            </p>
          </div>
          
          {/* Enhanced grid with better responsive breakpoints */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {categories.map((category, index) => (
              <div
                key={category.id}
                onClick={() => navigate('/menu')}
                className="group bg-white rounded-3xl shadow-lg border border-orange-100 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-500 cursor-pointer transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={category.image_url || `https://readdy.ai/api/search-image?query=delicious%20${category.name}%20food%20category%20with%20appetizing%20presentation%2C%20restaurant%20quality%20photography%2C%20clean%20background&width=400&height=300&seq=${category.id}&orientation=landscape`}
                    alt={category.name}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent group-hover:from-black/80 transition-all duration-300"></div>
                  
                  {/* Enhanced overlay content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors duration-300">
                      {category.name}
                    </h3>
                    <p className="text-gray-200 text-sm leading-relaxed opacity-90">
                      {category.description || `Explore our ${category.name.toLowerCase()} selection`}
                    </p>
                    
                    {/* Hover indicator */}
                    <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="inline-flex items-center text-yellow-300 text-sm font-medium">
                        Explore <i className="ri-arrow-right-line ml-1"></i>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Items Section - Enhanced with better layout */}
      {featuredItems.length > 0 && (
        <div className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-white/80 to-orange-50/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced section header */}
            <div className="text-center mb-12 lg:mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full mb-6">
                <i className="ri-star-line text-2xl text-orange-600"></i>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Featured Dishes
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Our chef's special recommendations crafted with premium ingredients and exceptional care
              </p>
            </div>
            
            {/* Enhanced grid with staggered animations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {featuredItems.slice(0, 8).map((item, index) => (
                <div
                  key={item.id}
                  className="transform hover:scale-105 transition-all duration-300"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <FoodCard
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
                </div>
              ))}
            </div>
            
            {/* Enhanced CTA */}
            <div className="text-center mt-12 lg:mt-16">
              <Button
                onClick={() => navigate('/menu')}
                size="lg"
                className="group bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-10 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <i className="ri-arrow-right-line mr-3 text-xl group-hover:translate-x-1 transition-transform duration-300"></i>
                View Full Menu
                <span className="ml-2 opacity-75 group-hover:opacity-100 transition-opacity duration-300">
                  ({foodItems.length} items)
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced CTA Section with better visual hierarchy */}
      <div className="py-20 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 rounded-3xl lg:rounded-[2rem] p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-20 -translate-y-20"></div>
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-30 translate-y-30"></div>
            </div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-8">
                <i className="ri-rocket-line text-3xl text-white"></i>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Ready to Order?
              </h2>
              <p className="text-3xl sm:text-2xl text-orange-100 mb-10 leading-relaxed max-w-3xl mx-auto">
                Join thousands of satisfied customers who trust us for their daily meals and experience culinary excellence
              </p>
              
              {/* Enhanced action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                <Button
                  onClick={() => navigate('/menu')}
                  size="lg"
                  className="group bg-white text-orange-600 hover:bg-gray-100 px-10 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <i className="ri-shopping-cart-line mr-3 text-xl group-hover:animate-bounce"></i>
                  Start Ordering
                  <i className="ri-arrow-right-line ml-3 text-xl group-hover:translate-x-1 transition-transform duration-300"></i>
                </Button>
                {!user && !isKioskMode && (
                  <Button
                    onClick={() => navigate('/signup')}
                    variant="outline"
                    size="lg"
                    className="group border-2 border-white text-white hover:bg-white hover:text-orange-600 px-10 py-4 text-lg font-semibold transition-all duration-300 backdrop-blur-sm"
                  >
                    <i className="ri-user-add-line mr-3 text-xl group-hover:scale-110 transition-transform duration-300"></i>
                    Sign Up Free
                  </Button>
                )}
              </div>
              
              {/* Trust indicators */}
              <div className="mt-10 pt-8 border-t border-white/20">
                <div className="flex flex-wrap justify-center items-center gap-8 text-white/80">
                  <div className="flex items-center gap-2">
                    <i className="ri-shield-check-line text-xl"></i>
                    <span className="text-sm font-medium">Secure Ordering</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-time-line text-xl"></i>
                    <span className="text-sm font-medium">Fast Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="ri-star-fill text-xl text-yellow-300"></i>
                    <span className="text-sm font-medium">5-Star Rated</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
