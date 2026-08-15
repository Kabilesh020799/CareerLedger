import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

/** Keeps administrator pages out of the client route tree for regular accounts. */
export function AdminRoute() {
  const session = useSession()
  return session.data?.user?.isAdmin ? <Outlet /> : <Navigate to="/applications" replace />
}
