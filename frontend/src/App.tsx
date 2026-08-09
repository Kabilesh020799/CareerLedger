import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ApplicationDetailsPage } from './pages/ApplicationDetailsPage'
import { ApplicationBoardPage } from './pages/ApplicationBoardPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { EditApplicationPage } from './pages/EditApplicationPage'
import { NewApplicationPage } from './pages/NewApplicationPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/applications" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="board" element={<ApplicationBoardPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/new" element={<NewApplicationPage />} />
          <Route path="applications/:id" element={<ApplicationDetailsPage />} />
          <Route path="applications/:id/edit" element={<EditApplicationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
