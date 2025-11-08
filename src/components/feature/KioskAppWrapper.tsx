import React, { useEffect } from 'react';
import { useKioskAuth } from '../../hooks/useKioskAuth';

interface KioskAppWrapperProps {
  children: React.ReactNode;
}

/**
 * Kiosk App Wrapper Component
 * Ensures the app always runs in kiosk mode when loaded as a native app
 */
export const KioskAppWrapper: React.FC<KioskAppWrapperProps> = ({ children }) => {
  const { isKioskMode, isAutoLoggingIn, enableKioskMode } = useKioskAuth();

  useEffect(() => {
    // Force kiosk mode for native app
    const forceKioskMode = async () => {
      if (!isKioskMode && !isAutoLoggingIn) {
        console.log('🏪 Native App: Forcing kiosk mode...');
        await enableKioskMode();
      }
    };

    // Check if running as Capacitor app
    const isNativeApp = (window as any).Capacitor?.isNativePlatform?.() || false;
    
    if (isNativeApp) {
      forceKioskMode();
    }
  }, [isKioskMode, isAutoLoggingIn, enableKioskMode]);

  // Show loading state while auto-logging in
  if (isAutoLoggingIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">🏪 BOKI Kiosk</h2>
          <p className="text-gray-600">Initializing kiosk mode...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default KioskAppWrapper;