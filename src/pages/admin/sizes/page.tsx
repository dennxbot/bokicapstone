import React, { useState, useEffect } from 'react';
import { useSizes } from '../../../hooks/useSizes';
import { useAuth } from '../../../hooks/useAuth';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Size Management</h1>
              <p className="text-gray-600 mt-1">Create and manage custom sizes with pricing</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <i className="ri-add-line mr-2"></i>
              Add New Size
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <i className="ri-error-warning-line text-red-400 mr-2"></i>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSize ? 'Edit Size' : 'Add New Size'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Size Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Small, Medium, Large"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    maxLength={50}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      formErrors.price_multiplier ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.price_multiplier && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.price_multiplier}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    1.00 = same price, 1.25 = 25% more, 0.75 = 25% less
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      formErrors.sort_order ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.sort_order && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.sort_order}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Active (available for selection)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional description for this size"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      {editingSize ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line mr-2"></i>
                      {editingSize ? 'Update Size' : 'Create Size'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Sizes List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Existing Sizes</h2>
            <p className="text-gray-600 text-sm mt-1">
              {sizeOptions.length} size{sizeOptions.length !== 1 ? 's' : ''} configured
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <i className="ri-loader-4-line animate-spin text-2xl text-gray-400 mb-2"></i>
              <p className="text-gray-500">Loading sizes...</p>
            </div>
          ) : sizeOptions.length === 0 ? (
            <div className="p-8 text-center">
              <i className="ri-price-tag-3-line text-4xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sizes configured</h3>
              <p className="text-gray-500 mb-4">Create your first size to get started</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <i className="ri-add-line mr-2"></i>
                Add First Size
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sizeOptions.map((size) => (
                <div key={size.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {size.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          size.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {size.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                          {size.price_multiplier}x price
                        </span>
                      </div>
                      {size.description && (
                        <p className="text-gray-600 mt-1">{size.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Sort order: {size.sort_order}</span>
                        <span>Created: {new Date(size.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleEdit(size)}
                        variant="outline"
                        size="sm"
                      >
                        <i className="ri-edit-line mr-1"></i>
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(size)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
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
  );
}