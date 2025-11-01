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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6">
      <div className="w-full bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🏪 BOKI Kiosk Terminal
          </h1>
          <p className="text-gray-600 text-base sm:text-lg md:text-xl">
            Self-Service Ordering System
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4 text-gray-700">System Status</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm sm:text-base">Kiosk Mode:</span>
              <span className={`font-semibold text-sm sm:text-base ${isKioskMode ? 'text-green-600' : 'text-red-600'}`}>
                {isKioskMode ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm sm:text-base">User Status:</span>
              <span className={`font-semibold text-sm sm:text-base ${user ? 'text-green-600' : 'text-gray-500'}`}>
                {user ? `✅ ${user.full_name}` : '⏳ Not logged in'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm sm:text-base">Auto-Login:</span>
              <span className={`font-semibold text-sm sm:text-base ${isAutoLoggingIn ? 'text-blue-600' : 'text-gray-500'}`}>
                {isAutoLoggingIn ? '🔄 In Progress' : '⏸️ Idle'}
              </span>
            </div>
          </div>

          {loginStatus && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 font-medium text-sm sm:text-base">{loginStatus}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 sm:space-y-4">
          {!isKioskMode && (
            <Button
              onClick={handleManualKioskLogin}
              className="w-full py-4 sm:py-5 text-base sm:text-lg md:text-xl font-semibold bg-orange-600 hover:bg-orange-700 min-h-[60px] sm:min-h-[70px]"
              disabled={isAutoLoggingIn}
            >
              {isAutoLoggingIn ? '🔄 Enabling Kiosk Mode...' : '🏪 Enable Kiosk Mode'}
            </Button>
          )}

          {isKioskMode && user && (
            <>
              <Button
                onClick={handleGoToMenu}
                className="w-full py-4 sm:py-5 text-base sm:text-lg md:text-xl font-semibold bg-green-600 hover:bg-green-700 min-h-[60px] sm:min-h-[70px]"
              >
                🍽️ Start Ordering (Menu)
              </Button>

              <Button
                onClick={disableKioskMode}
                className="w-full py-4 sm:py-5 text-base sm:text-lg md:text-xl font-semibold bg-red-600 hover:bg-red-700 min-h-[60px] sm:min-h-[70px]"
              >
                🚪 Exit Kiosk Mode
              </Button>
            </>
          )}
        </div>

        {/* Auto-Login Methods Info */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Auto-Login Methods:</h3>
          <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
            <li>• URL Parameter: <code className="text-xs">?kiosk=true</code></li>
            <li>• URL Path: <code className="text-xs">/kiosk</code></li>
            <li>• Environment: <code className="text-xs">VITE_KIOSK_MODE=true</code></li>
            <li>• Subdomain: <code className="text-xs">kiosk.your-app.com</code></li>
            <li>• Local Storage: <code className="text-xs">kioskMode=true</code></li>
          </ul>
        </div>

        {/* Instructions for Netlify */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">🚀 Netlify Deployment:</h3>
          <p className="text-xs sm:text-sm text-blue-700">
            Add <code className="text-xs">VITE_KIOSK_MODE=true</code> to your Netlify environment variables 
            for automatic kiosk mode, or access via <code className="text-xs">your-app.com/kiosk</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default KioskPage;