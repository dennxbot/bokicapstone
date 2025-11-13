import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// This is a basic App component that works with the KioskAppWrapper
// The actual kiosk functionality comes from your hosted Netlify app

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<KioskRedirect />} />
          <Route path="*" element={<KioskRedirect />} />
        </Routes>
      </div>
    </Router>
  );
};

const KioskRedirect: React.FC = () => {
  // This component will be replaced by the actual kiosk functionality
  // when running in the Capacitor wrapper
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
        <p>Loading kiosk interface...</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          This app loads your kiosk from: https://bokicapstone.vercel.app/kiosk
        </p>
      </div>
    </div>
  );
};

export default App;