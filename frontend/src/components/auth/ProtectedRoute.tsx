import { Center, Spinner, Stack, Text } from '@chakra-ui/react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'

export function ProtectedRoute() {
  const session = useSession()
  const location = useLocation()

  if (session.isPending) {
    return (
      <Center minH="100vh">
        <Stack align="center" gap="3">
          <Spinner color="brand.fg" />
          <Text color="fg.muted">Checking your session…</Text>
        </Stack>
      </Center>
    )
  }

  if (session.isError) {
    return (
      <Center minH="100vh" px="6">
        <Stack align="center" gap="3" textAlign="center">
          <Text fontWeight="semibold">We could not verify your session.</Text>
          <Text color="fg.muted">Refresh the page to try again.</Text>
        </Stack>
      </Center>
    )
  }

  if (!session.data.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
