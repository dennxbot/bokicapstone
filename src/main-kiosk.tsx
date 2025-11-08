import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import KioskAppWrapper from './components/feature/KioskAppWrapper.tsx';

// Kiosk-specific entry point
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <KioskAppWrapper>
      <App />
    </KioskAppWrapper>
  </React.StrictMode>
);