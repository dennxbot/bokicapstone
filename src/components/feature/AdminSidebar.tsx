
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const menuItems = [
    {
      icon: 'ri-dashboard-line',
      label: 'Dashboard',
      path: '/admin',
      active: location.pathname === '/admin',
      description: 'Overview & Analytics'
    },
    {
      icon: 'ri-shopping-bag-line',
      label: 'Online Orders',
      path: '/admin/orders',
      active: location.pathname === '/admin/orders',
      description: 'Manage Online Orders'
    },
    {
      icon: 'ri-money-dollar-circle-line',
      label: 'Kiosk Orders',
      path: '/admin/cashier',
      active: location.pathname === '/admin/cashier',
      description: 'Process Kiosk Payments'
    },
    {
      icon: 'ri-restaurant-line',
      label: 'Menu',
      path: '/admin/menu',
      active: location.pathname === '/admin/menu',
      description: 'Food Items'
    },
    {
      icon: 'ri-folder-line',
      label: 'Categories',
      path: '/admin/categories',
      active: location.pathname === '/admin/categories',
      description: 'Menu Categories'
    },
    {
      icon: 'ri-price-tag-3-line',
      label: 'Sizes',
      path: '/admin/sizes',
      active: location.pathname === '/admin/sizes',
      description: 'Size Options'
    },
    {
      icon: 'ri-user-line',
      label: 'Customers',
      path: '/admin/customers',
      active: location.pathname === '/admin/customers',
      description: 'Customer Data'
    },
    {
      icon: 'ri-bar-chart-line',
      label: 'Reports',
      path: '/admin/reports',
      active: location.pathname === '/admin/reports',
      description: 'Analytics & Reports'
    },
    {
      icon: 'ri-notification-line',
      label: 'Notifications',
      path: '/admin/notifications',
      active: location.pathname === '/admin/notifications',
      description: 'System Alerts'
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl h-screen fixed left-0 top-0 z-40 border-r border-slate-700">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-orange-600/10 to-amber-600/10">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
            <i className="ri-restaurant-line text-xl text-white"></i>
          </div>
          <div>
            <h1 className="font-bold text-xl text-white" style={{ fontFamily: '"Pacifico", serif' }}>
              BOKI
            </h1>
            <p className="text-xs text-slate-400 font-medium">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.path}>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full group flex items-center px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                  item.active
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25 transform scale-[1.02]'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:transform hover:scale-[1.01]'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-all duration-200 ${
                  item.active 
                    ? 'bg-white/20 shadow-inner' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <i className={`${item.icon} text-lg ${item.active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${item.active ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>
                    {item.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${item.active ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-300'}`}>
                    {item.description}
                  </div>
                </div>
                {item.active && (
                  <div className="w-1 h-8 bg-white/30 rounded-full"></div>
                )}
              </button>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
        <button
          onClick={handleLogout}
          className="w-full group flex items-center px-4 py-3.5 rounded-xl text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
        >
          <div className="w-10 h-10 bg-red-500/10 group-hover:bg-red-500/20 rounded-lg flex items-center justify-center mr-3 transition-all duration-200">
            <i className="ri-logout-box-line text-lg"></i>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Logout</div>
            <div className="text-xs text-red-400/70 group-hover:text-red-300/70 mt-0.5">Sign out safely</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
