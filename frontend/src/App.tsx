import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoadingSkeleton } from './components/ui/LoadingSkeleton'

const ApplicationDetailsPage = lazy(() => import('./pages/ApplicationDetailsPage').then((module) => ({ default: module.ApplicationDetailsPage })))
const ApplicationBoardPage = lazy(() => import('./pages/ApplicationBoardPage').then((module) => ({ default: module.ApplicationBoardPage })))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage').then((module) => ({ default: module.ApplicationsPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const EditApplicationPage = lazy(() => import('./pages/EditApplicationPage').then((module) => ({ default: module.EditApplicationPage })))
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage').then((module) => ({ default: module.NewApplicationPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const GmailSyncPage = lazy(() => import('./pages/GmailSyncPage').then((module) => ({ default: module.GmailSyncPage })))
const ResumeVersionsPage = lazy(() => import('./pages/ResumeVersionsPage').then((module) => ({ default: module.ResumeVersionsPage })))
const BrowserExtensionPage = lazy(() => import('./pages/BrowserExtensionPage').then((module) => ({ default: module.BrowserExtensionPage })))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage').then((module) => ({ default: module.NotificationSettingsPage })))

function App() {
  const load = (page: ReactNode) => <Suspense fallback={<LoadingSkeleton label="Loading page" />}>{page}</Suspense>
  return (
    <Routes>
      <Route path="login" element={load(<LoginPage />)} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/applications" replace />} />
          <Route path="dashboard" element={load(<DashboardPage />)} />
          <Route path="board" element={load(<ApplicationBoardPage />)} />
          <Route path="resumes" element={load(<ResumeVersionsPage />)} />
          <Route path="gmail" element={load(<GmailSyncPage />)} />
          <Route path="browser-extension" element={load(<BrowserExtensionPage />)} />
          <Route path="notifications" element={load(<NotificationSettingsPage />)} />
          <Route path="applications" element={load(<ApplicationsPage />)} />
          <Route path="applications/new" element={load(<NewApplicationPage />)} />
          <Route path="applications/:id" element={load(<ApplicationDetailsPage />)} />
          <Route path="applications/:id/edit" element={load(<EditApplicationPage />)} />
          <Route path="*" element={load(<NotFoundPage />)} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
