
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

  const handleAddItem = async () => {
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

  const handleUpdateItem = async () => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      
      <div className="flex-1 ml-64">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
                <p className="text-gray-600">Manage your restaurant menu items</p>
              </div>
              <Button
                onClick={() => setIsAddingItem(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Add Item
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Add/Edit Item Modal */}
          {(isAddingItem || editingItem) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
                
                <div className="space-y-4">
                  <Input
                    label="Item Name"
                    name="name"
                    value={newItem.name}
                    onChange={handleInputChange}
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={newItem.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category_id"
                      value={newItem.category_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-8"
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

                  <Input
                    label="Image URL (optional)"
                    name="image_url"
                    value={newItem.image_url}
                    onChange={handleInputChange}
                  />

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_available"
                        checked={newItem.is_available}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Available for order
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="is_featured"
                        checked={newItem.is_featured || false}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        <i className="ri-star-line mr-1"></i>
                        Featured item
                      </label>
                    </div>
                  </div>

                  {/* Size Management Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Sizes (optional)
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {sizeOptions.map((size) => (
                        <div key={size.id} className="flex items-center">
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
                            className="mr-2"
                          />
                          <label htmlFor={`size-${size.id}`} className="text-sm text-gray-700 flex-1">
                            {size.name} {size.price_multiplier !== 1 && `(${size.price_multiplier}x price)`}
                          </label>
                        </div>
                      ))}
                      {sizeOptions.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No size options available</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which sizes are available for this menu item. If no sizes are selected, the item will use the default size.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 whitespace-nowrap"
                  >
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
                    className="flex-1 border-gray-300 text-gray-700 py-2 whitespace-nowrap"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex space-x-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setFilter('featured')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filter === 'featured'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <i className="ri-star-line mr-1"></i>
                Featured
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setFilter(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    filter === category.id
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.filter(item => item && item.id).map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="relative">
                  <img
                    src={item.image_url || `https://readdy.ai/api/search-image?query=delicious%20food%20photography%20with%20simple%20clean%20background&width=400&height=300&seq=${item.id}&orientation=landscape`}
                    alt={item.name || 'Food item'}
                    className="w-full h-48 object-cover object-top"
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <button
                      onClick={() => toggleAvailability(item.id, item.is_available)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.is_available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                    {item.is_featured && (
                      <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <i className="ri-star-fill mr-1"></i>
                        Featured
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <span className="text-lg font-bold text-orange-600">{formatPesoSimple(item.price)}</span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                      {item.category?.name || 'No Category'}
                    </span>
                  </div>

                  {/* Available Sizes Display */}
                  <div className="mb-3">
                    <div className="text-xs font-medium text-gray-700 mb-1">Available Sizes:</div>
                    {item.sizes && item.sizes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.sizes.map((size) => (
                          <span
                            key={size.id}
                            className={`text-xs px-2 py-1 rounded-full ${
                              size.is_available
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
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

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => toggleFeatured(item.id, item.is_featured)}
                      className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        item.is_featured
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <i className={`${item.is_featured ? 'ri-star-fill' : 'ri-star-line'} mr-1`}></i>
                      {item.is_featured ? 'Featured' : 'Feature'}
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
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
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <i className="ri-restaurant-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No menu items found</h3>
              <p className="text-gray-600 mb-4">No items match the selected category.</p>
              <Button
                onClick={() => setIsAddingItem(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 whitespace-nowrap"
              >
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
