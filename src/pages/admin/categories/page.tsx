import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import AdminSidebar from '../../../components/feature/AdminSidebar';
import Button from '../../../components/base/Button';
import Input from '../../../components/base/Input';

interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  food_items_count?: number;
}

const AdminCategories = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    image_url: '',
    is_active: true
  });

  useEffect(() => {
    // Wait for auth to load before checking
    if (isLoading) return;

    // If not authenticated or not admin, redirect to login
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }

    fetchCategories();
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  const fetchCategories = async () => {
    try {
      setLoading(true);

      // Fetch categories with food items count
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          *,
          food_items(count)
        `)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Transform the data to include food_items_count
      const categoriesWithCount = categoriesData?.map(category => ({
        ...category,
        food_items_count: category.food_items?.[0]?.count || 0
      })) || [];

      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setNewCategory(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const imageUrl = newCategory.image_url || `https://readdy.ai/api/search-image?query=delicious%20${newCategory.name}%20food%20category%20with%20appetizing%20presentation%2C%20restaurant%20quality%20photography%2C%20clean%20background&width=400&height=300&seq=${Date.now()}&orientation=landscape`;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || null,
          image_url: imageUrl,
          is_active: newCategory.is_active
        }])
        .select('*');

      if (error) throw error;

      if (data) {
        const newCategoryWithCount = {
          ...data[0],
          food_items_count: 0
        };
        setCategories([...categories, newCategoryWithCount]);
      }

      setNewCategory({
        name: '',
        description: '',
        image_url: '',
        is_active: true
      });
      setIsAddingCategory(false);
      window.location.reload();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category. Please try again.');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      is_active: category.is_active
    });
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategory.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || null,
          image_url: newCategory.image_url || null,
          is_active: newCategory.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCategory.id)
        .select('*');

      if (error) throw error;

      if (data) {
        const updatedCategoryWithCount = {
          ...data[0],
          food_items_count: editingCategory.food_items_count
        };
        setCategories(categories.map(category => 
          category.id === editingCategory.id ? updatedCategoryWithCount : category
        ));
      }

      setEditingCategory(null);
      setNewCategory({
        name: '',
        description: '',
        image_url: '',
        is_active: true
      });
      window.location.reload();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string, foodItemsCount: number) => {
    if (foodItemsCount > 0) {
      alert(`Cannot delete "${categoryName}" because it has ${foodItemsCount} menu item(s) assigned to it. Please reassign or delete those items first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.filter(category => category.id !== categoryId));
      window.location.reload();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category. Please try again.');
    }
  };

  const handleToggleActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(categories.map(category => 
        category.id === categoryId 
          ? { ...category, is_active: !currentStatus }
          : category
      ));
      window.location.reload();
    } catch (error) {
      console.error('Error updating category status:', error);
      alert('Error updating category status. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setIsAddingCategory(false);
    setNewCategory({
      name: '',
      description: '',
      image_url: '',
      is_active: true
    });
  };

  // Show loading while checking authentication
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
        <AdminSidebar />
        
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Categories</h3>
            <p className="text-gray-600">Please wait while we fetch your data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
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
                  Category Management
                </h1>
                <p className="text-slate-600 mt-1 font-medium">Organize your menu with food categories</p>
              </div>
              
              {/* Category Stats */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Total Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{categories.filter(cat => cat.is_active).length}</div>
                  <div className="text-xs text-gray-600 font-medium">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{categories.reduce((sum, cat) => sum + (cat.food_items_count || 0), 0)}</div>
                  <div className="text-xs text-gray-600 font-medium">Total Items</div>
                </div>
                <Button
                  onClick={() => setIsAddingCategory(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center"
                >
                  <i className="ri-add-line mr-2"></i>
                  Add Category
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Enhanced Add/Edit Category Form */}
          {(isAddingCategory || editingCategory) && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-3">
                      <i className={`${editingCategory ? 'ri-edit-line' : 'ri-add-line'} text-white`}></i>
                    </div>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  <button
                    onClick={cancelEdit}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <i className="ri-close-line text-gray-600"></i>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input
                      label="Category Name"
                      name="name"
                      value={newCategory.name}
                      onChange={handleInputChange}
                      required
                    />

                    <Input
                      label="Image URL (optional)"
                      name="image_url"
                      value={newCategory.image_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/image.jpg"
                    />

                    <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="ri-settings-line text-blue-600 mr-2"></i>
                        Category Settings
                      </h4>
                      <div className="flex items-center p-3 bg-white/50 rounded-lg">
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={newCategory.is_active}
                          onChange={handleInputChange}
                          className="mr-3 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Active Category
                          </label>
                          <p className="text-xs text-gray-500">Make this category visible to customers</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        name="description"
                        value={newCategory.description}
                        onChange={handleInputChange}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        placeholder="Brief description of this category..."
                      />
                    </div>

                    {/* Preview */}
                    {(newCategory.name || newCategory.image_url) && (
                      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <i className="ri-eye-line text-purple-600 mr-2"></i>
                          Preview
                        </h4>
                        <div className="bg-white/50 rounded-lg p-4 flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                            {newCategory.image_url ? (
                              <img
                                src={newCategory.image_url}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <i className="ri-image-line text-gray-400"></i>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {newCategory.name || 'Category Name'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {newCategory.description || 'No description'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <Button
                    onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <i className={`${editingCategory ? 'ri-check-line' : 'ri-add-line'} mr-2`}></i>
                    {editingCategory ? 'Update Category' : 'Add Category'}
                  </Button>
                  <Button
                    onClick={cancelEdit}
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

          {/* Enhanced Categories Grid */}
          {categories.length > 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <i className="ri-folder-line text-white text-sm"></i>
                    </div>
                    All Categories
                  </h2>
                  <div className="text-sm text-gray-600 font-medium">
                    {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                {categories.map((category) => (
                  <div key={category.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="relative">
                      <img
                        src={category.image_url || `https://readdy.ai/api/search-image?query=delicious%20${category.name}%20food%20category%20with%20appetizing%20presentation%2C%20restaurant%20quality%20photography%2C%20clean%20background&width=400&height=200&seq=${category.id}&orientation=landscape`}
                        alt={category.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => handleToggleActive(category.id, category.is_active)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
                            category.is_active
                              ? 'bg-green-500/90 text-white'
                              : 'bg-red-500/90 text-white'
                          }`}
                        >
                          <i className={`${category.is_active ? 'ri-check-line' : 'ri-close-line'} mr-1`}></i>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <div className="text-white drop-shadow-lg">
                          <h3 className="text-xl font-bold">{category.name}</h3>
                          <p className="text-sm opacity-90">{category.food_items_count || 0} menu items</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                          {category.description || 'No description provided for this category.'}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-xs text-gray-500">
                          <i className="ri-calendar-line mr-1"></i>
                          Created {new Date(category.created_at).toLocaleDateString()}
                        </div>
                        <div className={`text-xs font-medium px-3 py-1.5 rounded-xl ${
                          (category.food_items_count || 0) > 0 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <i className="ri-restaurant-line mr-1"></i>
                          {category.food_items_count || 0} items
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="flex items-center px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105"
                        >
                          <i className="ri-edit-line mr-1"></i>
                          Edit
                        </button>
                        
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name, category.food_items_count || 0)}
                          disabled={(category.food_items_count || 0) > 0}
                          className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                            (category.food_items_count || 0) > 0
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-100 hover:bg-red-200 text-red-600 hover:scale-105'
                          }`}
                        >
                          <i className="ri-delete-bin-line mr-1"></i>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="ri-folder-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">No categories found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your first category to organize your menu items. Categories help customers navigate your menu more easily.
              </p>
              <Button
                onClick={() => setIsAddingCategory(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <i className="ri-add-line mr-2"></i>
                Add First Category
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;