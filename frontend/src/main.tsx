import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AppProvider } from './components/ui/AppProvider'
import { queryClient } from './config/queryClient'
import './index.css'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { initializeSentry } from './config/sentry'

initializeSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorkspaceProvider><App /></WorkspaceProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppProvider>
  </StrictMode>,
)
