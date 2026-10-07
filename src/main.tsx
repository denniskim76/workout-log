// React 앱을 마운트하는 진입점
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { UpdateBanner } from './UpdateBanner'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UpdateBanner />
    <App />
  </StrictMode>,
)
