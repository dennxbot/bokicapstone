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
                <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
                <p className="text-gray-600">Manage food categories for your menu</p>
              </div>
              <Button
                onClick={() => setIsAddingCategory(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Add Category
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Add/Edit Category Form */}
          {(isAddingCategory || editingCategory) && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                />

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    value={newCategory.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Brief description of this category..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={newCategory.is_active}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Active (visible to customers)
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
                <Button
                  onClick={cancelEdit}
                  variant="outline"
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Categories ({categories.length})
              </h2>
            </div>

            {categories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Menu Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              <img
                                className="h-12 w-12 rounded-lg object-cover"
                                src={category.image_url || `https://readdy.ai/api/search-image?query=delicious%20${category.name}%20food%20category&width=100&height=100&seq=${category.id}&orientation=square`}
                                alt={category.name}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {category.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {category.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {category.food_items_count || 0} items
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(category.id, category.is_active)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              category.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {category.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(category.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleEditCategory(category)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                            >
                              <i className="ri-edit-line mr-1"></i>
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDeleteCategory(category.id, category.name, category.food_items_count || 0)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                              disabled={(category.food_items_count || 0) > 0}
                            >
                              <i className="ri-delete-bin-line mr-1"></i>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="ri-folder-line text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No categories found</h3>
                <p className="text-gray-600 mb-4">Create your first category to organize your menu items.</p>
                <Button
                  onClick={() => setIsAddingCategory(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2"
                >
                  Add First Category
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;