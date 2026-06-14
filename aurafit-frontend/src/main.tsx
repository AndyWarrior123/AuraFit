import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
    position='top-right'
    toastOptions={{
      style: {
        background: "#12122d",
        border: '1px solid rgba(168, 85, 247, 0.3)',
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui',
      },
    }}
    />
  </StrictMode>,
)
