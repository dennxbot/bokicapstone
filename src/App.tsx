import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppRoutes } from './router'
import CartNotification from './components/feature/CartNotification'
import KioskNavigation from './components/feature/KioskNavigation'


function App() {
  return (
    <BrowserRouter 
      basename={__BASE_PATH__}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <KioskNavigation />
      <AppRoutes />
      <CartNotification />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  )
}

export default App