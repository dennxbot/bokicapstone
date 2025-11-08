import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useKioskAuth } from '../../hooks/useKioskAuth';

interface KioskNavigationProps {
  showCloseButton?: boolean;
  onClose?: () => void;
}

export default function KioskNavigation({ showCloseButton = true, onClose }: KioskNavigationProps) {
  const navigate = useNavigate();
  const { isKioskMode } = useKioskAuth();

  useEffect(() => {
    if (!isKioskMode) return;

    // Handle back button on Android
    const handleBackButton = () => {
      // Navigate back if possible, otherwise show confirmation
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Show confirmation dialog before exiting
        if (confirm('Are you sure you want to exit the kiosk?')) {
          App.exitApp();
        }
      }
    };

    // Add back button listener for mobile
    App.addListener('backButton', handleBackButton);

    return () => {
      App.removeAllListeners();
    };
  }, [isKioskMode, navigate]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (isKioskMode && Capacitor.isNativePlatform()) {
      // Show confirmation before exiting
      if (confirm('Are you sure you want to exit the kiosk?')) {
        App.exitApp();
      }
    } else {
      // Fallback to home for web version
      navigate('/');
    }
  };

  if (!isKioskMode || !showCloseButton) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={handleClose}
        className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        title="Exit Kiosk"
      >
        <i className="ri-close-line text-xl"></i>
      </button>
    </div>
  );
}