import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@flower-marketplace/frontend-core/styles/theme.css'
import './index.css'
import App from './App.tsx'
import { NoticeProvider } from './components/NoticeCenter.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NoticeProvider>
      <App />
    </NoticeProvider>
  </StrictMode>,
)
