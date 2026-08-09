import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AppProvider } from './components/ui/AppProvider'
import { queryClient } from './config/queryClient'
import { resolveRouterMode } from './config/routerMode'
import './index.css'

const Router = resolveRouterMode(import.meta.env.VITE_ROUTER_MODE) === 'hash'
  ? HashRouter
  : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
        </Router>
      </QueryClientProvider>
    </AppProvider>
  </StrictMode>,
)
