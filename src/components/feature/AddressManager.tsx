import React, { useState } from 'react';
import { useAddresses } from '../../hooks/useAddresses';
import type { UserAddress, CreateAddressData } from '../../hooks/useAddresses';
import Button from '../base/Button';
import Input from '../base/Input';

interface AddressFormData {
  label: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const AddressManager: React.FC = () => {
  const {
    addresses,
    isLoading,
    error,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    formatAddress,
  } = useAddresses();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>({
    label: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Philippines',
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      label: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Philippines',
      is_default: false,
    });
    setEditingAddress(null);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleEdit = (address: UserAddress) => {
    setFormData({
      label: address.label,
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      country: address.country,
      is_default: address.is_default,
    });
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.label.trim() || !formData.address_line_1.trim()) {
      alert('Please fill in the required fields (Label and Address Line 1)');
      return;
    }

    setIsSubmitting(true);

    try {
      const addressData: CreateAddressData = {
        label: formData.label.trim(),
        address_line_1: formData.address_line_1.trim(),
        address_line_2: formData.address_line_2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        country: formData.country,
        is_default: formData.is_default,
      };

      if (editingAddress) {
        await updateAddress({ ...addressData, id: editingAddress.id });
      } else {
        await createAddress(addressData);
      }

      resetForm();
    } catch (err) {
      console.error('Error saving address:', err);
      alert(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await deleteAddress(addressId);
    } catch (err) {
      console.error('Error deleting address:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId);
    } catch (err) {
      console.error('Error setting default address:', err);
      alert(err instanceof Error ? err.message : 'Failed to set default address');
    }
  };

  if (isLoading && addresses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <i className="ri-loader-4-line animate-spin text-2xl text-orange-600 mr-3"></i>
          <span className="text-gray-600">Loading addresses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <i className="ri-map-pin-line text-orange-600 mr-2"></i>
          My Addresses
        </h3>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          <i className="ri-add-line mr-2"></i>
          Add Address
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <i className="ri-error-warning-line text-red-500"></i>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Address List */}
      <div className="space-y-4 mb-6">
        {addresses.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center justify-center">
            <i className="ri-map-pin-line text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500 mb-4">No addresses saved yet</p>
            <Button
              onClick={() => setShowForm(true)}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              Add Your First Address
            </Button>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className={`border rounded-lg p-4 ${
                address.is_default ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-800">{address.label}</h4>
                    {address.is_default && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{formatAddress(address)}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="text-orange-600 hover:text-orange-700 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                      title="Set as default"
                    >
                      <i className="ri-star-line"></i>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit address"
                  >
                    <i className="ri-edit-line"></i>
                  </button>
                  {addresses.length > 1 && (
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete address"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Address Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Label *"
                  name="label"
                  value={formData.label}
                  onChange={handleInputChange}
                  placeholder="e.g., Home, Work, Office"
                  required
                />

                <Input
                  label="Address Line 1 *"
                  name="address_line_1"
                  value={formData.address_line_1}
                  onChange={handleInputChange}
                  placeholder="Street address, building name"
                  required
                />

                <Input
                  label="Address Line 2"
                  name="address_line_2"
                  value={formData.address_line_2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, unit, etc."
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
                  />

                  <Input
                    label="State/Province"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="State/Province"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Postal Code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="Postal Code"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    >
                      <option value="Philippines">Philippines</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleInputChange}
                    className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as default address
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        {editingAddress ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      <>
                        <i className={`${editingAddress ? 'ri-save-line' : 'ri-add-line'} mr-2`}></i>
                        {editingAddress ? 'Update Address' : 'Add Address'}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetForm}
                    variant="outline"
                    disabled={isSubmitting}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressManager;