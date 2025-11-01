
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFoodItems } from '../../hooks/useFoodItems';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { useBanStatus } from '../../hooks/useBanStatus';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import FoodCard from '../../components/feature/FoodCard';
import BottomNavigation from '../../components/feature/BottomNavigation';
import BannedUserWarning from '../../components/feature/BannedUserWarning';
import CategoryTabs from '../../components/feature/CategoryTabs';
import Button from '../../components/base/Button';

type SortOption = 'name' | 'price-low' | 'price-high' | 'featured' | 'newest';

export default function Menu() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, logout } = useAuth();
  const banStatus = useBanStatus();
  const { isKioskMode } = useKioskAuth();
  const { foodItems, categories, isLoading } = useFoodItems();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Enhanced filtering and sorting logic
  const filteredAndSortedItems = useMemo(() => {
    let filtered = foodItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    // Enhanced sorting options
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'featured':
        filtered.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return a.name.localeCompare(b.name);
        });
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        break;
      default:
        break;
    }

    return filtered;
  }, [foodItems, selectedCategory, searchQuery, sortBy]);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const clearSearch = () => {
    setSearchQuery('');
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
          <p className="text-gray-600 font-medium animate-pulse">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 pb-20">
      {/* Enhanced Header Section - Hidden in Kiosk Mode */}
      {!isKioskMode && (
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6 animate-float">
                <i className="ri-restaurant-2-line text-3xl text-white"></i>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4 animate-fade-in">
                Our Menu
              </h1>
              <p className="text-lg sm:text-xl text-orange-100 max-w-2xl mx-auto leading-relaxed animate-fade-in">
                Discover our carefully crafted dishes made with the finest ingredients
              </p>
              
              {/* Enhanced Stats */}
              <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mt-8 animate-fade-in">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{foodItems.length}</div>
                  <div className="text-sm text-orange-200">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{categories.length}</div>
                  <div className="text-sm text-orange-200">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{foodItems.filter(item => item.is_featured).length}</div>
                  <div className="text-sm text-orange-200">Featured</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Search and Filter Section */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-orange-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Search Bar */}
          <div className="relative mb-4 sm:mb-6">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <i className="ri-search-line text-gray-400 text-xl"></i>
              </div>
              <input
                type="text"
                placeholder="Search for dishes, ingredients, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 sm:py-4 text-gray-900 placeholder-gray-500 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-base sm:text-lg shadow-sm hover:shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: '16px' }}>
            {/* Category Tabs */}
            <div className="flex-1 min-w-0">
              <CategoryTabs
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                foodItems={foodItems}
              />
            </div>

            {/* Enhanced Sort and View Controls */}
            <div className="flex items-center" style={{ gap: '12px' }}>
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 pr-10 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 hover:border-orange-300 cursor-pointer text-sm sm:text-base"
                >
                  <option value="featured">Featured First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="price-low">Price (Low to High)</option>
                  <option value="price-high">Price (High to Low)</option>
                  <option value="newest">Newest First</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <i className="ri-arrow-down-s-line text-gray-400"></i>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
                    viewMode === 'grid'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="ri-grid-line text-lg"></i>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
                    viewMode === 'list'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className="ri-list-check text-lg"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-600 font-medium">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                  Search: "{searchQuery}"
                  <button onClick={clearSearch} className="ml-2 hover:text-orange-900">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Category: {categories.find(c => c.id === selectedCategory)?.name}
                  <button onClick={() => setSelectedCategory('all')} className="ml-2 hover:text-blue-900">
                    <i className="ri-close-line text-xs"></i>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Results Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {searchQuery ? `Search Results` : selectedCategory === 'all' ? 'All Items' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <p className="text-gray-600">
              {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'} found
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            {!isKioskMode && (
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <i className="ri-home-line mr-2"></i>
                Back to Home
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Food Items Grid/List */}
        {filteredAndSortedItems.length > 0 ? (
          <div className={`${
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6' 
              : 'space-y-4'
          }`}>
            {filteredAndSortedItems.map((item, index) => (
              <div
                key={item.id}
                className={`transform hover:scale-105 transition-all duration-300 ${
                  viewMode === 'list' ? 'max-w-4xl mx-auto' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
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
                  viewMode={viewMode}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Enhanced Empty State */
          <div className="text-center py-16 sm:py-20">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="ri-search-line text-3xl text-orange-600"></i>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No items found</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {searchQuery 
                  ? `We couldn't find any items matching "${searchQuery}". Try adjusting your search or browse our categories.`
                  : `No items available in this category right now. Check back soon for new additions!`
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {searchQuery && (
                  <Button
                    onClick={clearSearch}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    <i className="ri-close-line mr-2"></i>
                    Clear Search
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <i className="ri-refresh-line mr-2"></i>
                  View All Items
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        >
          <i className="ri-arrow-up-line text-xl group-hover:animate-bounce"></i>
        </button>
      )}

      {/* Bottom Navigation - Always show for kiosk mode */}
      <BottomNavigation />
    </div>
  );
}
