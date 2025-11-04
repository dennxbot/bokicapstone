
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { useBanStatus } from '../../hooks/useBanStatus';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import Button from '../../components/base/Button';
import Input from '../../components/base/Input';
import AddressManager from '../../components/feature/AddressManager';
import BannedUserWarning from '../../components/feature/BannedUserWarning';
import BottomNavigation from '../../components/feature/BottomNavigation';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, logout, isLoading: authLoading } = useAuth();
  const { favoritesCount } = useFavorites();
  const { isBanned } = useBanStatus();
  const { isKioskMode } = useKioskAuth();
  
  // All useState hooks must be called before any conditional returns
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailUpdates: true,
    smsUpdates: false,
    darkMode: false,
    language: 'en'
  });
  
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    contactNumber: user?.contact_number || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Redirect to menu if in kiosk mode
  useEffect(() => {
    if (isKioskMode) {
      navigate('/menu', { replace: true });
      return;
    }
  }, [isKioskMode, navigate]);

  // Redirect to login if not authenticated (only after loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || '',
        email: user.email || '',
        contactNumber: user.contact_number || ''
      });
    }
  }, [user]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Return null if not authenticated (will redirect via useEffect)
  if (!user) {
    return null;
  }

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (formData.contactNumber && !/^\+?[\d\s-()]+$/.test(formData.contactNumber)) {
      errors.contactNumber = 'Invalid contact number format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      await updateProfile({
        full_name: formData.fullName,
        email: formData.email,
        contact_number: formData.contactNumber
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    // Password update logic would go here
    alert('Password update functionality would be implemented here');
    setShowPasswordModal(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isBanned) {
    return <BannedUserWarning onLogout={handleLogout} />;
  }

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: 'ri-user-line' },
    { id: 'addresses', label: 'Addresses', icon: 'ri-map-pin-line' },
    { id: 'preferences', label: 'Preferences', icon: 'ri-settings-3-line' },
    { id: 'security', label: 'Security', icon: 'ri-shield-check-line' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 relative overflow-hidden pb-20 lg:pb-6">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200/30 to-red-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-orange-100/20 to-red-100/20 rounded-full blur-3xl"></div>
      </div>
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-xl border-b border-white/20 sticky top-0 z-40 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5"></div>
        <div className="max-w-6xl mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')} 
                className="mr-4 p-3 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-300 group border border-transparent hover:border-orange-200/50 hover:shadow-lg"
              >
                <i className="ri-arrow-left-line text-xl text-gray-700 group-hover:text-orange-600 transition-colors"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">My Profile</h1>
                <p className="text-sm text-gray-600 hidden sm:block font-medium">Manage your account and preferences</p>
              </div>
            </div>
            
            {/* Profile Stats */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-center px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-orange-200/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">12</div>
                <div className="text-xs text-gray-600 font-medium">Orders</div>
              </div>
              <div className="text-center px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-green-200/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">₱2,450</div>
                <div className="text-xs text-gray-600 font-medium">Saved</div>
              </div>
              <div className="text-center px-4 py-3 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Gold</div>
                <div className="text-xs text-gray-600 font-medium">Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Enhanced Profile Sidebar */}
          <div className="xl:col-span-1">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 sticky top-28 hover:shadow-3xl transition-all duration-500">
              {/* Profile Avatar */}
              <div className="text-center mb-8">
                <div className="relative inline-block">
                  <div className="w-28 h-28 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/50">
                    <i className="ri-user-line text-4xl text-white"></i>
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-xl flex items-center justify-center border-3 border-white hover:scale-110 transition-all duration-300 group">
                    <i className="ri-camera-line text-sm text-white group-hover:scale-110 transition-transform"></i>
                  </button>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mt-6 mb-2">{user?.full_name || 'User'}</h2>
                <p className="text-gray-600 mb-4 font-medium">{user?.email}</p>
                
                {/* Role Badge */}
                {user?.role === 'admin' && (
                  <span className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white text-sm font-semibold rounded-full shadow-xl ring-2 ring-blue-200/50 hover:scale-105 transition-all duration-300">
                    <i className="ri-vip-crown-line mr-2"></i>
                    Administrator
                  </span>
                )}
                {user?.role === 'customer' && (
                  <span className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-full shadow-xl ring-2 ring-green-200/50 hover:scale-105 transition-all duration-300">
                    <i className="ri-user-star-line mr-2"></i>
                    Customer
                  </span>
                )}
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-3">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-5 py-4 rounded-xl text-left transition-all duration-300 group ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl transform scale-105'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:shadow-lg hover:scale-102'
                    }`}
                  >
                    <i className={`${tab.icon} text-xl mr-4 ${activeTab === tab.id ? 'text-white' : 'text-orange-500 group-hover:text-orange-600'} transition-colors`}></i>
                    <span className="font-semibold">{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Quick Actions */}
              <div className="mt-8 pt-6 border-t border-gradient-to-r from-orange-200/30 to-red-200/30">
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/orders')}
                    className="w-full flex items-center px-5 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-102 group"
                  >
                    <i className="ri-shopping-bag-line text-xl mr-4 text-orange-500 group-hover:text-orange-600 transition-colors"></i>
                    <span className="font-semibold">My Orders</span>
                  </button>
                  
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="w-full flex items-center px-5 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-102 group"
                    >
                      <i className="ri-dashboard-line text-xl mr-4 text-blue-500 group-hover:text-blue-600 transition-colors"></i>
                      <span className="font-semibold">Admin Panel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Main Content */}
          <div className="xl:col-span-3">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center">
                      <i className="ri-user-settings-line text-orange-500 mr-3 text-2xl"></i>
                      Personal Information
                    </h3>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 ${
                        isEditing
                          ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg'
                          : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-xl'
                      }`}
                      disabled={isLoading}
                    >
                      <i className={`${isEditing ? 'ri-close-line' : 'ri-edit-line'} text-lg mr-2`}></i>
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <Input
                        label="Full Name"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        error={formErrors.fullName}
                        className={isEditing ? 'border-orange-200 focus:border-orange-500 focus:ring-orange-200' : ''}
                      />
                    </div>
                    <div>
                      <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        error={formErrors.email}
                        className={isEditing ? 'border-orange-200 focus:border-orange-500' : ''}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Contact Number"
                        name="contactNumber"
                        type="tel"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        error={formErrors.contactNumber}
                        placeholder="Enter your phone number"
                        className={isEditing ? 'border-orange-200 focus:border-orange-500' : ''}
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-xl font-bold shadow-xl disabled:opacity-50 transition-all duration-300 hover:scale-105"
                      >
                        <i className={`${isLoading ? 'ri-loader-4-line animate-spin' : 'ri-save-line'} mr-2 text-lg`}></i>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        disabled={isLoading}
                        className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 py-4 rounded-xl font-bold disabled:opacity-50 transition-all duration-300 hover:scale-105"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Account Statistics */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-8 flex items-center">
                    <i className="ri-bar-chart-line text-orange-500 mr-3 text-2xl"></i>
                    Account Statistics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">12</div>
                      <div className="text-sm font-medium text-gray-600">Total Orders</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">₱2,450</div>
                      <div className="text-sm font-medium text-gray-600">Total Spent</div>
                    </div>
                    <button
                      onClick={() => navigate('/favorites')}
                      className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-200/50"
                    >
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">{favoritesCount}</div>
                      <div className="text-sm font-medium text-gray-600">Favorites</div>
                    </button>
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Gold</div>
                      <div className="text-sm font-medium text-gray-600">Member Status</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-8 flex items-center">
                  <i className="ri-map-pin-line text-orange-500 mr-3 text-2xl"></i>
                  Delivery Addresses
                </h3>
                <AddressManager />
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-8 flex items-center">
                    <i className="ri-notification-line text-orange-500 mr-3 text-2xl"></i>
                    Notification Preferences
                  </h3>
                  <div className="space-y-6">
                    {[
                      { key: 'notifications', label: 'Push Notifications', desc: 'Receive notifications about order updates' },
                      { key: 'emailUpdates', label: 'Email Updates', desc: 'Get promotional emails and order confirmations' },
                      { key: 'smsUpdates', label: 'SMS Updates', desc: 'Receive SMS notifications for important updates' }
                    ].map((pref) => (
                      <div key={pref.key} className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102">
                        <div>
                          <span className="font-bold text-gray-800 block text-lg">{pref.label}</span>
                          <span className="text-sm text-gray-600 font-medium">{pref.desc}</span>
                        </div>
                        <button
                          onClick={() => handlePreferenceChange(pref.key as keyof typeof preferences)}
                          className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-lg hover:scale-110 ${
                            preferences[pref.key as keyof typeof preferences] ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-lg transition-transform duration-300 ${
                            preferences[pref.key as keyof typeof preferences] ? 'translate-x-7' : 'translate-x-0.5'
                          }`}></div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-8 flex items-center">
                    <i className="ri-palette-line text-orange-500 mr-3 text-2xl"></i>
                    Display Preferences
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <div>
                        <span className="font-bold text-gray-800 block text-lg">Dark Mode</span>
                        <span className="text-sm text-gray-600 font-medium">Switch to dark theme</span>
                      </div>
                      <button
                        onClick={() => handlePreferenceChange('darkMode')}
                        className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-lg hover:scale-110 ${
                          preferences.darkMode ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-lg transition-transform duration-300 ${
                          preferences.darkMode ? 'translate-x-7' : 'translate-x-0.5'
                        }`}></div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <div>
                        <span className="font-bold text-gray-800 block text-lg">Language</span>
                        <span className="text-sm text-gray-600 font-medium">Choose your preferred language</span>
                      </div>
                      <select 
                        value={preferences.language}
                        onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                        className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200/50 bg-white/80 backdrop-blur-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <option value="en">English</option>
                        <option value="fil">Filipino</option>
                        <option value="es">Español</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-8 flex items-center">
                    <i className="ri-shield-check-line text-orange-500 mr-3 text-2xl"></i>
                    Security Settings
                  </h3>
                  <div className="space-y-6">
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full flex items-center justify-between p-6 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-300 group hover:shadow-xl hover:scale-102"
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-xl flex items-center justify-center mr-4 group-hover:from-orange-200 group-hover:to-red-200 transition-all duration-300 shadow-lg">
                          <i className="ri-lock-line text-xl text-orange-600"></i>
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-gray-800 block text-lg">Change Password</span>
                          <span className="text-sm text-gray-600 font-medium">Update your account password</span>
                        </div>
                      </div>
                      <i className="ri-arrow-right-s-line text-xl text-gray-400 group-hover:text-orange-600 transition-colors duration-300"></i>
                    </button>

                    <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm shadow-lg">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                          <i className="ri-shield-check-line text-xl text-green-600"></i>
                        </div>
                        <div>
                          <span className="font-medium text-gray-800 block">Two-Factor Authentication</span>
                          <span className="text-sm text-gray-600">Add an extra layer of security</span>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        Enabled
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <i className="ri-history-line text-lg text-blue-600"></i>
                        </div>
                        <div>
                          <span className="font-medium text-gray-800 block">Login History</span>
                          <span className="text-sm text-gray-600">View recent login activity</span>
                        </div>
                      </div>
                      <i className="ri-arrow-right-s-line text-gray-400"></i>
                    </div>
                  </div>
                </div>

                {/* Logout Section */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <i className="ri-logout-box-line text-red-600 mr-2"></i>
                    Account Actions
                  </h3>
                  <Button
                    onClick={handleLogout}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-semibold shadow-lg transition-all"
                  >
                    <i className="ri-logout-box-line mr-2"></i>
                    Logout from Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <i className="ri-close-line text-xl text-gray-600"></i>
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
              />
              <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handlePasswordUpdate}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-3 rounded-lg font-semibold shadow-lg transition-all"
              >
                Update Password
              </Button>
              <Button
                onClick={() => setShowPasswordModal(false)}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-semibold transition-all"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Profile;
