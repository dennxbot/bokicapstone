import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import KioskAppWrapper from './components/feature/KioskAppWrapper'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KioskAppWrapper>
      <App />
    </KioskAppWrapper>
  </StrictMode>,
)