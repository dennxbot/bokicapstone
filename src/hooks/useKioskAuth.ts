import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface KioskConfig {
  isKioskMode: boolean;
  autoLogin: boolean;
  sessionTimeout: number; // minutes
  kioskUser: {
    email: string;
    password: string;
    name: string;
  };
}

export const useKioskAuth = () => {
  const { login, user, logout } = useAuth();
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  // Kiosk configuration
  const kioskConfig: KioskConfig = {
    isKioskMode: false,
    autoLogin: true,
    sessionTimeout: 30, // 30 minutes
    kioskUser: {
      email: 'kiosk@boki.com',
      password: 'kiosk_terminal_2024',
      name: 'BOKI Kiosk Terminal'
    }
  };

  // Detect kiosk mode from various sources
  const detectKioskMode = (): boolean => {
    // Method 1: URL parameter (?kiosk=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('kiosk') === 'true') {
      return true;
    }

    // Method 2: URL path (/kiosk)
    if (window.location.pathname.startsWith('/kiosk')) {
      return true;
    }

    // Method 3: Environment variable
    if (import.meta.env.VITE_KIOSK_MODE === 'true') {
      return true;
    }

    // Method 4: Subdomain (kiosk.your-app.com)
    if (window.location.hostname.startsWith('kiosk.')) {
      return true;
    }

    // Method 5: Local storage flag (for persistent kiosk mode)
    if (localStorage.getItem('kioskMode') === 'true') {
      return true;
    }

    return false;
  };

  // Auto-login for kiosk mode
  const autoLoginKiosk = async (): Promise<boolean> => {
    try {
      setIsAutoLoggingIn(true);
      
      console.log('🏪 Attempting kiosk auto-login...');
      
      const result = await login(
        kioskConfig.kioskUser.email,
        kioskConfig.kioskUser.password
      );

      if (result.success) {
        console.log('✅ Kiosk auto-login successful');
        localStorage.setItem('kioskMode', 'true');
        return true;
      } else {
        console.error('❌ Kiosk auto-login failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Kiosk auto-login error:', error);
      return false;
    } finally {
      setIsAutoLoggingIn(false);
    }
  };

  // Enable kiosk mode manually
  const enableKioskMode = async (): Promise<boolean> => {
    setIsKioskMode(true);
    localStorage.setItem('kioskMode', 'true');
    return await autoLoginKiosk();
  };

  // Disable kiosk mode
  const disableKioskMode = () => {
    setIsKioskMode(false);
    localStorage.removeItem('kioskMode');
    logout();
  };

  // Setup auto-logout timer for kiosk sessions
  const setupAutoLogout = () => {
    if (!isKioskMode) return;

    const timeoutMs = kioskConfig.sessionTimeout * 60 * 1000;
    
    const resetTimer = () => {
      clearTimeout(window.kioskLogoutTimer);
      window.kioskLogoutTimer = setTimeout(() => {
        console.log('🕐 Kiosk session timeout - auto logout');
        autoLoginKiosk(); // Re-login instead of logout for kiosk
      }, timeoutMs);
    };

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    resetTimer(); // Start initial timer
  };

  // Initialize kiosk mode on component mount
  useEffect(() => {
    const kioskModeDetected = detectKioskMode();
    setIsKioskMode(kioskModeDetected);

    if (kioskModeDetected && kioskConfig.autoLogin && !user) {
      autoLoginKiosk();
    }
  }, []);

  // Setup auto-logout when kiosk mode is enabled
  useEffect(() => {
    if (isKioskMode && user) {
      setupAutoLogout();
    }

    return () => {
      if (window.kioskLogoutTimer) {
        clearTimeout(window.kioskLogoutTimer);
      }
    };
  }, [isKioskMode, user]);

  return {
    isKioskMode,
    isAutoLoggingIn,
    autoLoginKiosk,
    enableKioskMode,
    disableKioskMode,
    kioskConfig
  };
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    kioskLogoutTimer: NodeJS.Timeout;
  }
}