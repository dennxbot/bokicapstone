
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useSizes } from '../../../hooks/useSizes';
import { formatPesoSimple } from '../../../lib/currency';
import { supabase } from '../../../lib/supabase';
import AdminSidebar from '../../../components/feature/AdminSidebar';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string; // Make optional to handle undefined values
  is_available: boolean;
  is_featured: boolean;
  category?: {
    name: string;
  };
  sizes?: Array<{
    id: string;
    name: string;
    price_multiplier: number;
    is_available: boolean;
  }>;
}

interface Category {
  id: string;
  name: string;
}

const AdminMenu = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const { sizeOptions, fetchAllSizeOptions, assignSizesToFoodItem, getFoodItemSizes } = useSizes();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    is_featured: false
  });

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/admin/login');
      return;
    }

    fetchMenuData();
    fetchAllSizeOptions();
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch menu items with categories and sizes
      const { data: menuData, error: menuError } = await supabase
        .from('food_items')
        .select(`
          *,
          category:categories(name),
          food_item_sizes(
            size_option:size_options(
              id,
              name,
              price_multiplier
            ),
            is_available
          )
        `)
        .order('name');

      if (menuError) throw menuError;

      setCategories(categoriesData || []);
      
      // Process menu data to include sizes information
      const processedMenuData = (menuData || []).map(item => {
        const sizes = item.food_item_sizes?.map((fis: any) => ({
          id: fis.size_option.id,
          name: fis.size_option.name,
          price_multiplier: fis.size_option.price_multiplier,
          is_available: fis.is_available
        })) || [];

        return {
          ...item,
          is_featured: item.is_featured ?? false,
          image_url: item.image_url || '',
          sizes: sizes
        };
      });
      
      setMenuItems(processedMenuData);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setNewItem({
      ...newItem,
      [e.target.name]: value
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    
    if (!newItem.name || !newItem.price || !newItem.category_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const imageUrl = newItem.image_url || `https://readdy.ai/api/search-image?query=delicious%20$%7BnewItem.name%7D%20food%20photography%20with%20simple%20clean%20background%2C%20professional%20food%20styling%2C%20appetizing%20presentation&width=400&height=300&seq=${Date.now()}&orientation=landscape`;

      const { data, error } = await supabase
        .from('food_items')
        .insert([{
          name: newItem.name,
          description: newItem.description,
          price: parseFloat(newItem.price),
          category_id: newItem.category_id,
          image_url: imageUrl,
          is_available: newItem.is_available,
          is_featured: newItem.is_featured || false
        }])
        .select(`
          *,
          category:categories(name)
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        const newFoodItem = data[0];
        
        // Assign selected sizes to the new food item
        if (selectedSizes.length > 0) {
          await assignSizesToFoodItem(newFoodItem.id, selectedSizes);
        }
        
        setMenuItems([...menuItems, ...data]);
      }

      setNewItem({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
        is_featured: false
      });
      setSelectedSizes([]);
      setIsAddingItem(false);
      
      // Refresh the page to ensure changes are applied
      window.location.reload();
    } catch (error) {
      console.error('Error adding menu item:', error);
      alert('Error adding menu item. Please try again.');
    }
  };

  const handleEditItem = async (item: MenuItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_featured: item.is_featured || false
    });
    
    // Load existing sizes for this food item
    try {
      const existingSizes = await getFoodItemSizes(item.id);
      const existingSizeIds = existingSizes.map(size => size.size_option_id);
      setSelectedSizes(existingSizeIds);
    } catch (error) {
      console.error('Error loading existing sizes:', error);
      setSelectedSizes([]);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    
    if (!editingItem || !newItem.name || !newItem.price || !newItem.category_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('food_items')
        .update({
          name: newItem.name,
          description: newItem.description,
          price: parseFloat(newItem.price),
          category_id: newItem.category_id,
          image_url: newItem.image_url,
          is_available: newItem.is_available,
          is_featured: newItem.is_featured || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)
        .select(`
          *,
          category:categories(name)
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        // Update sizes for the food item
        await assignSizesToFoodItem(editingItem.id, selectedSizes);
        
        setMenuItems(menuItems.map(item => 
          item.id === editingItem.id ? data[0] : item
        ));
      }

      setEditingItem(null);
      setSelectedSizes([]);
      setNewItem({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
        is_featured: false
      });
      
      // Refresh the page to ensure changes are applied
      window.location.reload();
    } catch (error) {
      console.error('Error updating menu item:', error);
      alert('Error updating menu item. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMenuItems(menuItems.filter(item => item.id !== id));
      
      // Refresh the page to ensure changes are applied
      window.location.reload();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Error deleting menu item. Please try again.');
    }
  };

  const toggleAvailability = async (id: string, currentAvailability: boolean) => {
    try {
      console.log('Toggling availability for item:', id, 'from', currentAvailability, 'to', !currentAvailability);
      
      const { data, error } = await supabase
        .from('food_items')
        .update({ 
          is_available: !currentAvailability,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful, returned data:', data);

      setMenuItems(menuItems.map(item => 
        item.id === id ? { ...item, is_available: !currentAvailability } : item
      ));
      
      console.log('Local state updated');
      
      // Refresh the page to ensure changes are applied
      window.location.reload();
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Error updating availability. Please try again.');
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('food_items')
        .update({ 
          is_featured: !currentFeatured,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setMenuItems(menuItems.map(item => 
        item.id === id ? { ...item, is_featured: !currentFeatured } : item
      ));
      
      // Refresh the page to ensure changes are applied
      window.location.reload();
    } catch (error) {
      console.error('Error updating featured status:', error);
      alert('Error updating featured status. Please try again.');
    }
  };

  const filteredItems = filter === 'all' ? menuItems : 
    filter === 'featured' ? menuItems.filter(item => item.is_featured) :
    menuItems.filter(item => item.category_id === filter);

  // Show loading while checking authentication
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
        <AdminSidebar />
        
        <div className="flex-1 ml-72">
          {/* Enhanced Header */}
          <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Menu Management
                  </h1>
                  <p className="text-slate-600 mt-1 font-medium">Create and manage your restaurant menu items</p>
                </div>
                
                {/* Menu Stats */}
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{menuItems.length}</div>
                    <div className="text-xs text-gray-600 font-medium">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{menuItems.filter(item => item.is_available).length}</div>
                    <div className="text-xs text-gray-600 font-medium">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">{menuItems.filter(item => item.is_featured).length}</div>
                    <div className="text-xs text-gray-600 font-medium">Featured</div>
                  </div>
                  <Button
                    onClick={() => setIsAddingItem(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Add Item
                  </Button>
                </div>
              </div>
            </div>
          </div>
      
        <div className="p-8">
          {/* Enhanced Add/Edit Item Modal */}
          {(isAddingItem || editingItem) && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-3">
                      <i className={`${editingItem ? 'ri-edit-line' : 'ri-add-line'} text-white`}></i>
                    </div>
                    {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsAddingItem(false);
                      setEditingItem(null);
                      setSelectedSizes([]);
                      setNewItem({
                        name: '',
                        description: '',
                        price: '',
                        category_id: '',
                        image_url: '',
                        is_available: true,
                        is_featured: false
                      });
                    }}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <i className="ri-close-line text-gray-600"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input
                      label="Item Name"
                      name="name"
                      value={newItem.name}
                      onChange={handleInputChange}
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={newItem.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        placeholder="Describe your delicious menu item..."
                      />
                    </div>

                    <Input
                      label="Price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={handleInputChange}
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        name="category_id"
                        value={newItem.category_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Input
                      label="Image URL (optional)"
                      name="image_url"
                      value={newItem.image_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/image.jpg"
                    />

                    <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="ri-settings-line text-blue-600 mr-2"></i>
                        Item Settings
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center p-3 bg-white/50 rounded-lg">
                          <input
                            type="checkbox"
                            name="is_available"
                            checked={newItem.is_available}
                            onChange={handleInputChange}
                            className="mr-3 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Available for order
                            </label>
                            <p className="text-xs text-gray-500">Customers can order this item</p>
                          </div>
                        </div>

                        <div className="flex items-center p-3 bg-white/50 rounded-lg">
                          <input
                            type="checkbox"
                            name="is_featured"
                            checked={newItem.is_featured || false}
                            onChange={handleInputChange}
                            className="mr-3 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div>
                            <label className="text-sm font-medium text-gray-700 flex items-center">
                              <i className="ri-star-line mr-1"></i>
                              Featured item
                            </label>
                            <p className="text-xs text-gray-500">Highlight this item to customers</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Size Management Section */}
                    <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="ri-ruler-line text-purple-600 mr-2"></i>
                        Available Sizes
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {sizeOptions.map((size) => (
                          <div key={size.id} className="flex items-center p-2 bg-white/50 rounded-lg">
                            <input
                              type="checkbox"
                              id={`size-${size.id}`}
                              checked={selectedSizes.includes(size.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSizes([...selectedSizes, size.id]);
                                } else {
                                  setSelectedSizes(selectedSizes.filter(id => id !== size.id));
                                }
                              }}
                              className="mr-3 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                            />
                            <label htmlFor={`size-${size.id}`} className="text-sm text-gray-700 flex-1">
                              {size.name} {size.price_multiplier !== 1 && (
                                <span className="text-orange-600 font-medium">({size.price_multiplier}x price)</span>
                              )}
                            </label>
                          </div>
                        ))}
                        {sizeOptions.length === 0 && (
                          <p className="text-sm text-gray-500 italic text-center py-4">No size options available</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Select which sizes are available for this menu item. If no sizes are selected, the item will use the default size.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <Button
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <i className={`${editingItem ? 'ri-check-line' : 'ri-add-line'} mr-2`}></i>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingItem(false);
                      setEditingItem(null);
                      setSelectedSizes([]);
                      setNewItem({
                        name: '',
                        description: '',
                        price: '',
                        category_id: '',
                        image_url: '',
                        is_available: true,
                        is_featured: false
                      });
                    }}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 font-semibold rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <i className="ri-close-line mr-2"></i>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Filter Tabs */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <i className="ri-filter-line text-white text-sm"></i>
                </div>
                Filter Menu Items
              </h2>
              <div className="text-sm text-gray-600">
                Showing {filteredItems.length} of {menuItems.length} items
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100/50 text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 hover:scale-105'
                }`}
              >
                <i className="ri-list-check-line mr-2"></i>
                All Items
                <span className={`ml-2 px-2 py-1 text-xs rounded-full font-bold ${
                  filter === 'all' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {menuItems.length}
                </span>
              </button>
              <button
                onClick={() => setFilter('featured')}
                className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                  filter === 'featured'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100/50 text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 hover:scale-105'
                }`}
              >
                <i className="ri-star-line mr-2"></i>
                Featured
                <span className={`ml-2 px-2 py-1 text-xs rounded-full font-bold ${
                  filter === 'featured' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {menuItems.filter(item => item.is_featured).length}
                </span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setFilter(category.id)}
                  className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                    filter === category.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100/50 text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 hover:scale-105'
                  }`}
                >
                  <i className="ri-restaurant-line mr-2"></i>
                  {category.name}
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full font-bold ${
                    filter === category.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {menuItems.filter(item => item.category_id === category.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.filter(item => item && item.id).map((item) => (
              <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="relative">
                  <img
                    src={item.image_url || `https://readdy.ai/api/search-image?query=delicious%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${item.id}&orientation=landscape`}
                    alt={item.name || 'Food item'}
                    className="w-full h-56 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  <div className="absolute top-3 right-3 flex flex-col space-y-2">
                    <button
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
                        item.is_available
                          ? 'bg-green-500/90 text-white'
                          : 'bg-red-500/90 text-white'
                      }`}
                    >
                      <i className={`${item.is_available ? 'ri-check-line' : 'ri-close-line'} mr-1`}></i>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                    {item.is_featured && (
                      <div className="bg-amber-500/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center shadow-lg backdrop-blur-sm">
                        <i className="ri-star-fill mr-1"></i>
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="text-2xl font-bold text-white drop-shadow-lg">{formatPesoSimple(item.price)}</span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="font-bold text-xl text-gray-900 mb-2">{item.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-medium text-gray-700 bg-gray-100/50 px-3 py-1.5 rounded-xl capitalize">
                      <i className="ri-restaurant-line mr-1"></i>
                      {item.category?.name || 'No Category'}
                    </span>
                  </div>

                  {/* Enhanced Available Sizes Display */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                      <i className="ri-ruler-line mr-1"></i>
                      Available Sizes:
                    </div>
                    {item.sizes && item.sizes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.sizes.map((size) => (
                          <span
                            key={size.id}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                              size.is_available
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            {size.name}
                            {size.price_multiplier !== 1 && (
                              <span className="ml-1 text-xs opacity-75">
                                ({size.price_multiplier}x)
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No sizes configured</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleFeatured(item.id, item.is_featured)}
                      className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 ${
                        item.is_featured
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <i className={`${item.is_featured ? 'ri-star-fill' : 'ri-star-line'} mr-1`}></i>
                      {item.is_featured ? 'Featured' : 'Feature'}
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="w-10 h-10 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-10 h-10 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-restaurant-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">No menu items found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {filter === 'all' 
                  ? 'No menu items have been added yet. Start building your menu by adding your first item.'
                  : `No items match the selected filter. Try selecting a different category or add items to this category.`
                }
              </p>
              <Button
                onClick={() => setIsAddingItem(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <i className="ri-add-line mr-2"></i>
                Add First Item
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  }

  // Check authentication and admin status
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-72">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Menu Management
                </h1>
                <p className="text-slate-600 mt-1 font-medium">Create and manage your restaurant menu items</p>
              </div>
              
              {/* Menu Stats */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{menuItems.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{menuItems.filter(item => item.is_available).length}</div>
                  <div className="text-xs text-gray-600 font-medium">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{menuItems.filter(item => item.is_featured).length}</div>
                  <div className="text-xs text-gray-600 font-medium">Featured</div>
                </div>
                <Button
                  onClick={() => setIsAddingItem(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center"
                >
                  <i className="ri-add-line mr-2"></i>
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        </div>
    
      <div className="p-8">
        {/* Enhanced Add/Edit Item Modal */}
        {(isAddingItem || editingItem) && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-3">
                    <i className={`${editingItem ? 'ri-edit-line' : 'ri-add-line'} text-white`}></i>
                  </div>
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
                <button
                  onClick={() => {
                    setIsAddingItem(false);
                    setEditingItem(null);
                    setSelectedSizes([]);
                    setNewItem({
                      name: '',
                      description: '',
                      price: '',
                      category_id: '',
                      image_url: '',
                      is_available: true,
                      is_featured: false
                    });
                  }}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                >
                  <i className="ri-close-line text-gray-600"></i>
                </button>
              </div>

              <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name</label>
                    <Input
                      type="text"
                      name="name"
                      value={newItem.name}
                      onChange={handleInputChange}
                      placeholder="Enter item name"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price</label>
                    <Input
                      type="number"
                      name="price"
                      value={newItem.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={newItem.description}
                    onChange={handleInputChange}
                    placeholder="Enter item description"
                    rows={3}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      name="category_id"
                      value={newItem.category_id}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                    <Input
                      type="url"
                      name="image_url"
                      value={newItem.image_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_available"
                      checked={newItem.is_available}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Available</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_featured"
                      checked={newItem.is_featured}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>

                {/* Size Options */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Available Sizes</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {sizeOptions.map((size) => (
                      <label key={size.id} className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedSizes.includes(size.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSizes([...selectedSizes, size.id]);
                            } else {
                              setSelectedSizes(selectedSizes.filter(id => id !== size.id));
                            }
                          }}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">{size.name}</span>
                          <span className="text-xs text-gray-500 block">+{((size.price_multiplier - 1) * 100).toFixed(0)}%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsAddingItem(false);
                      setEditingItem(null);
                      setSelectedSizes([]);
                      setNewItem({
                        name: '',
                        description: '',
                        price: '',
                        category_id: '',
                        image_url: '',
                        is_available: true,
                        is_featured: false
                      });
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Filter Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                  : 'bg-white/70 text-gray-700 hover:bg-white hover:shadow-md'
              }`}
            >
              All Items ({menuItems.length})
            </button>
            <button
              onClick={() => setFilter('featured')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                filter === 'featured'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                  : 'bg-white/70 text-gray-700 hover:bg-white hover:shadow-md'
              }`}
            >
              Featured ({menuItems.filter(item => item.is_featured).length})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setFilter(category.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  filter === category.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                    : 'bg-white/70 text-gray-700 hover:bg-white hover:shadow-md'
                }`}
              >
                {category.name} ({menuItems.filter(item => item.category_id === category.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Menu Items Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <i className="ri-image-line text-4xl text-gray-400"></i>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex space-x-2">
                    {item.is_featured && (
                      <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        <i className="ri-star-fill mr-1"></i>
                        Featured
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                      item.is_available 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                        : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                    }`}>
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600 font-medium">{item.category?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">{formatPesoSimple(item.price)}</div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">{item.description}</p>
                  
                  {item.sizes && item.sizes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Available Sizes:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.sizes.map((size) => (
                          <span
                            key={size.id}
                            className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              size.is_available
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {size.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleAvailability(item.id, item.is_available)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.is_available
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={item.is_available ? 'Mark as unavailable' : 'Mark as available'}
                      >
                        <i className={`ri-${item.is_available ? 'eye-line' : 'eye-off-line'}`}></i>
                      </button>
                      <button
                        onClick={() => toggleFeatured(item.id, item.is_featured)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.is_featured
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={item.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <i className={`ri-star-${item.is_featured ? 'fill' : 'line'}`}></i>
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Edit item"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete item"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-restaurant-line text-4xl text-orange-600"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No menu items found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {filter === 'all' 
                ? "Start building your menu by adding your first delicious item."
                : `No items found in the selected ${filter === 'featured' ? 'featured' : 'category'} filter.`
              }
            </p>
            <Button
              onClick={() => setIsAddingItem(true)}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <i className="ri-add-line mr-2"></i>
              Add First Item
            </Button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default AdminMenu;
