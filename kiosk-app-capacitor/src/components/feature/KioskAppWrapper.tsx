import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface KioskAppWrapperProps {
  children: React.ReactNode;
}

const KioskAppWrapper: React.FC<KioskAppWrapperProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if running as native app
    const isNativeApp = Capacitor.isNativePlatform();
    setIsNative(isNativeApp);

    if (isNativeApp) {
      // Force enable kiosk mode for native app
      localStorage.setItem('kiosk_mode', 'true');
      console.log('🏪 BOKI Kiosk: Native app mode enabled');
    }

    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>🏪 BOKI Kiosk</h1>
          <p>Initializing kiosk mode...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default KioskAppWrapper;