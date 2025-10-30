import React, { useState, useEffect } from 'react';
import { useSizes } from '../../../hooks/useSizes';
import { useAuth } from '../../../hooks/useAuth';
import AdminSidebar from '../../../components/feature/AdminSidebar';
import Button from '../../../components/base/Button';
import type { SizeOption } from '../../../types';

interface SizeFormData {
  name: string;
  description: string;
  price_multiplier: string;
  is_active: boolean;
  sort_order: string;
}

export default function AdminSizes() {
  const { user } = useAuth();
  const { 
    sizeOptions, 
    isLoading, 
    error, 
    fetchAllSizeOptions, 
    createSizeOption, 
    updateSizeOption, 
    deleteSizeOption 
  } = useSizes();

  const [showForm, setShowForm] = useState(false);
  const [editingSize, setEditingSize] = useState<SizeOption | null>(null);
  const [formData, setFormData] = useState<SizeFormData>({
    name: '',
    description: '',
    price_multiplier: '1.00',
    is_active: true,
    sort_order: '0'
  });
  const [formErrors, setFormErrors] = useState<Partial<SizeFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAllSizeOptions();
    }
  }, [user]);

  const validateForm = (): boolean => {
    const errors: Partial<SizeFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Size name is required';
    } else if (formData.name.length > 50) {
      errors.name = 'Size name must be 50 characters or less';
    }

    const multiplier = parseFloat(formData.price_multiplier);
    if (isNaN(multiplier) || multiplier <= 0) {
      errors.price_multiplier = 'Price multiplier must be a positive number';
    } else if (multiplier > 9.99) {
      errors.price_multiplier = 'Price multiplier cannot exceed 9.99';
    }

    const sortOrder = parseInt(formData.sort_order);
    if (isNaN(sortOrder) || sortOrder < 0) {
      errors.sort_order = 'Sort order must be a non-negative number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error for this field
    if (formErrors[name as keyof SizeFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const sizeData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price_multiplier: parseFloat(formData.price_multiplier),
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order)
      };

      if (editingSize) {
        await updateSizeOption(editingSize.id, sizeData);
      } else {
        await createSizeOption(sizeData);
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error('Error saving size:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (size: SizeOption) => {
    setEditingSize(size);
    setFormData({
      name: size.name,
      description: size.description || '',
      price_multiplier: size.price_multiplier.toString(),
      is_active: size.is_active,
      sort_order: size.sort_order.toString()
    });
    setShowForm(true);
  };

  const handleDelete = async (size: SizeOption) => {
    if (window.confirm(`Are you sure you want to delete the "${size.name}" size? This action cannot be undone.`)) {
      try {
        await deleteSizeOption(size.id);
      } catch (err) {
        console.error('Error deleting size:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_multiplier: '1.00',
      is_active: true,
      sort_order: '0'
    });
    setFormErrors({});
    setEditingSize(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex">
        <AdminSidebar />
        
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-shield-cross-line text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
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
                  Size Management
                </h1>
                <p className="text-slate-600 mt-1 font-medium">Create and manage custom sizes with pricing multipliers</p>
              </div>
              
              {/* Size Stats */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{sizeOptions.length}</div>
                  <div className="text-xs text-gray-600 font-medium">Total Sizes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{sizeOptions.filter(size => size.is_active).length}</div>
                  <div className="text-xs text-gray-600 font-medium">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{sizeOptions.filter(size => !size.is_active).length}</div>
                  <div className="text-xs text-gray-600 font-medium">Inactive</div>
                </div>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center"
                >
                  <i className="ri-add-line mr-2"></i>
                  Add New Size
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Enhanced Error Display */}
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mr-4">
                  <i className="ri-error-warning-line text-white"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Add/Edit Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-3">
                      <i className={`${editingSize ? 'ri-edit-line' : 'ri-add-line'} text-white`}></i>
                    </div>
                    {editingSize ? 'Edit Size' : 'Add New Size'}
                  </h2>
                  <button
                    onClick={handleCancel}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <i className="ri-close-line text-gray-600"></i>
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Size Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., Small, Medium, Large"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                            formErrors.name ? 'border-red-300 bg-red-50/50' : 'border-gray-300'
                          }`}
                          maxLength={50}
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-xs mt-2 flex items-center">
                            <i className="ri-error-warning-line mr-1"></i>
                            {formErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price Multiplier *
                        </label>
                        <input
                          type="number"
                          name="price_multiplier"
                          value={formData.price_multiplier}
                          onChange={handleInputChange}
                          placeholder="1.00"
                          step="0.01"
                          min="0.01"
                          max="9.99"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                            formErrors.price_multiplier ? 'border-red-300 bg-red-50/50' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.price_multiplier && (
                          <p className="text-red-500 text-xs mt-2 flex items-center">
                            <i className="ri-error-warning-line mr-1"></i>
                            {formErrors.price_multiplier}
                          </p>
                        )}
                        <div className="bg-blue-50/50 rounded-lg p-3 mt-2">
                          <p className="text-xs text-blue-700 font-medium">
                            <i className="ri-information-line mr-1"></i>
                            1.00 = same price, 1.25 = 25% more, 0.75 = 25% less
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          name="sort_order"
                          value={formData.sort_order}
                          onChange={handleInputChange}
                          placeholder="0"
                          min="0"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                            formErrors.sort_order ? 'border-red-300 bg-red-50/50' : 'border-gray-300'
                          }`}
                        />
                        {formErrors.sort_order && (
                          <p className="text-red-500 text-xs mt-2 flex items-center">
                            <i className="ri-error-warning-line mr-1"></i>
                            {formErrors.sort_order}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          <i className="ri-sort-asc mr-1"></i>
                          Lower numbers appear first in the list
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description (optional)
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Optional description for this size"
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        />
                      </div>

                      <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <i className="ri-settings-line text-blue-600 mr-2"></i>
                          Size Settings
                        </h4>
                        <div className="flex items-center p-3 bg-white/50 rounded-lg">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleInputChange}
                            className="mr-3 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Active Size
                            </label>
                            <p className="text-xs text-gray-500">Make this size available for selection</p>
                          </div>
                        </div>
                      </div>

                      {/* Preview */}
                      {formData.name && (
                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <i className="ri-eye-line text-purple-600 mr-2"></i>
                            Preview
                          </h4>
                          <div className="bg-white/50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{formData.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formData.description || 'No description'}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  formData.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {formData.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-medium">
                                  {formData.price_multiplier}x price
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-6">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      {isSubmitting ? (
                        <>
                          <i className="ri-loader-4-line animate-spin mr-2"></i>
                          {editingSize ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <i className={`${editingSize ? 'ri-check-line' : 'ri-save-line'} mr-2`}></i>
                          {editingSize ? 'Update Size' : 'Create Size'}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCancel}
                      variant="outline"
                      className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 font-semibold rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <i className="ri-close-line mr-2"></i>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Enhanced Sizes List */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <i className="ri-price-tag-3-line text-white text-sm"></i>
                  </div>
                  Existing Sizes
                </h2>
                <div className="text-sm text-gray-600 font-medium">
                  {sizeOptions.length} size{sizeOptions.length !== 1 ? 's' : ''} configured
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Loading Sizes</h3>
                <p className="text-gray-600">Please wait while we fetch your data...</p>
              </div>
            ) : sizeOptions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className="ri-price-tag-3-line text-3xl text-gray-400"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">No sizes configured</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first size to get started. Sizes help customers choose different portions with custom pricing.
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-8 py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <i className="ri-add-line mr-2"></i>
                  Add First Size
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200/50">
                {sizeOptions.map((size) => (
                  <div key={size.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {size.name}
                          </h3>
                          <span className={`px-3 py-1.5 text-xs font-bold rounded-xl ${
                            size.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <i className={`${size.is_active ? 'ri-check-line' : 'ri-close-line'} mr-1`}></i>
                            {size.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 rounded-xl font-bold">
                            <i className="ri-money-dollar-circle-line mr-1"></i>
                            {size.price_multiplier}x price
                          </span>
                        </div>
                        
                        {size.description && (
                          <p className="text-gray-600 mb-3 leading-relaxed">{size.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span className="flex items-center">
                            <i className="ri-sort-asc mr-1"></i>
                            Sort order: {size.sort_order}
                          </span>
                          <span className="flex items-center">
                            <i className="ri-calendar-line mr-1"></i>
                            Created: {new Date(size.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={() => handleEdit(size)}
                          variant="outline"
                          size="sm"
                          className="bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                        >
                          <i className="ri-edit-line mr-1"></i>
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(size)}
                          variant="outline"
                          size="sm"
                          className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 px-4 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                        >
                          <i className="ri-delete-bin-line mr-1"></i>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}