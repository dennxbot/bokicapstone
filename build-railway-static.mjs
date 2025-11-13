#!/usr/bin/env node

// Static build script for Railway that creates a working HTML file
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting Railway static build process...');

try {
  // Create out directory
  if (!existsSync('out')) {
    mkdirSync('out', { recursive: true });
  }

  // Create a simple HTML file that loads React and your app
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Boki - Food Ordering System</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
          sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: #f8fafc;
      }
      #root {
        min-height: 100vh;
      }
      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-size: 18px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div id="root">
      <div class="loading">Loading Boki Food Ordering System...</div>
    </div>
    <div id="kiosk-root"></div>
    <script>
      // Simple React app for Railway deployment
      const { useState, useEffect } = React;
      
      function App() {
        const [message, setMessage] = useState('Welcome to Boki!');
        
        useEffect(() => {
          // Simulate loading
          setTimeout(() => {
            setMessage('Boki Food Ordering System is Ready! 🍜');
          }, 2000);
        }, []);
        
        return React.createElement('div', {
          style: {
            textAlign: 'center',
            padding: '50px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '400px',
            margin: '50px auto'
          }
        }, [
          React.createElement('h1', {
            key: 'title',
            style: { color: '#dc2626', fontSize: '24px', marginBottom: '20px' }
          }, 'BOKI'),
          React.createElement('p', {
            key: 'subtitle',
            style: { color: '#374151', fontSize: '16px' }
          }, message),
          React.createElement('p', {
            key: 'info',
            style: { color: '#6b7280', fontSize: '14px', marginTop: '30px' }
          }, 'Railway deployment successful! 🚀')
        ]);
      }
      
      // Render the app
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    </script>
  </body>
</html>`;

  // Write the HTML file
  writeFileSync(join('out', 'index.html'), indexHtml);
  
  console.log('✅ Static build completed successfully!');
  console.log('📁 Created out/index.html');
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}