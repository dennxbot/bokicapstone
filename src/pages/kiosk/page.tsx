import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskAuth } from '../../hooks/useKioskAuth';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/base/Button';

const KioskPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    isKioskMode, 
    isAutoLoggingIn, 
    enableKioskMode, 
    disableKioskMode 
  } = useKioskAuth();
  
  const [loginStatus, setLoginStatus] = useState<string>('');

  useEffect(() => {
    if (isKioskMode && user) {
      setLoginStatus(`✅ Kiosk logged in as: ${user.full_name}`);
    } else if (isKioskMode && !user && !isAutoLoggingIn) {
      setLoginStatus('❌ Kiosk mode detected but login failed');
    } else if (isAutoLoggingIn) {
      setLoginStatus('🔄 Auto-logging in to kiosk mode...');
    }
  }, [isKioskMode, user, isAutoLoggingIn]);

  const handleManualKioskLogin = async () => {
    setLoginStatus('🔄 Enabling kiosk mode...');
    const success = await enableKioskMode();
    if (success) {
      setLoginStatus('✅ Kiosk mode enabled successfully!');
    } else {
      setLoginStatus('❌ Failed to enable kiosk mode');
    }
  };

  const handleGoToMenu = () => {
    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏪 BOKI Kiosk Terminal
          </h1>
          <p className="text-gray-600 text-lg">
            Self-Service Ordering System
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">System Status</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Kiosk Mode:</span>
              <span className={`font-semibold ${isKioskMode ? 'text-green-600' : 'text-red-600'}`}>
                {isKioskMode ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">User Status:</span>
              <span className={`font-semibold ${user ? 'text-green-600' : 'text-gray-500'}`}>
                {user ? `✅ ${user.full_name}` : '⏳ Not logged in'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Auto-Login:</span>
              <span className={`font-semibold ${isAutoLoggingIn ? 'text-blue-600' : 'text-gray-500'}`}>
                {isAutoLoggingIn ? '🔄 In Progress' : '⏸️ Idle'}
              </span>
            </div>
          </div>

          {loginStatus && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium">{loginStatus}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {!isKioskMode && (
            <Button
              onClick={handleManualKioskLogin}
              className="w-full py-4 text-lg font-semibold bg-orange-600 hover:bg-orange-700"
              disabled={isAutoLoggingIn}
            >
              {isAutoLoggingIn ? '🔄 Enabling Kiosk Mode...' : '🏪 Enable Kiosk Mode'}
            </Button>
          )}

          {isKioskMode && user && (
            <>
              <Button
                onClick={handleGoToMenu}
                className="w-full py-4 text-lg font-semibold bg-green-600 hover:bg-green-700"
              >
                🍽️ Start Ordering (Menu)
              </Button>

              <Button
                onClick={disableKioskMode}
                className="w-full py-4 text-lg font-semibold bg-red-600 hover:bg-red-700"
              >
                🚪 Exit Kiosk Mode
              </Button>
            </>
          )}
        </div>

        {/* Auto-Login Methods Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Auto-Login Methods:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• URL Parameter: <code>?kiosk=true</code></li>
            <li>• URL Path: <code>/kiosk</code></li>
            <li>• Environment: <code>VITE_KIOSK_MODE=true</code></li>
            <li>• Subdomain: <code>kiosk.your-app.com</code></li>
            <li>• Local Storage: <code>kioskMode=true</code></li>
          </ul>
        </div>

        {/* Instructions for Netlify */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🚀 Netlify Deployment:</h3>
          <p className="text-sm text-blue-700">
            Add <code>VITE_KIOSK_MODE=true</code> to your Netlify environment variables 
            for automatic kiosk mode, or access via <code>your-app.com/kiosk</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KioskPage;