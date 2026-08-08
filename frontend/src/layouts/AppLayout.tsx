import { Box, Button, Container, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLogout } from '../hooks/useLogout'
import { useSession } from '../hooks/useSession'

const navigation = [
  { label: 'Applications', to: '/applications' },
  { label: 'Dashboard', to: '/dashboard' },
]

export function AppLayout() {
  const session = useSession()
  const logout = useLogout()
  const navigate = useNavigate()

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <Flex minH="100vh" bg="gray.50" direction={{ base: 'column', md: 'row' }}>
      <Box as="header" bg="white" borderRightWidth={{ md: '1px' }} borderBottomWidth={{ base: '1px', md: '0' }} w={{ md: '17rem' }}>
        <Stack gap="8" px="6" py="7" position={{ md: 'sticky' }} top="0">
          <Box>
            <Heading as="h1" size="lg" color="teal.700">Job Tracker</Heading>
            <Text color="gray.600" fontSize="sm" mt="1">Keep your search moving.</Text>
          </Box>

          <Stack as="nav" aria-label="Primary navigation" gap="2">
            {navigation.map((item) => (
              <Link asChild key={item.to} borderRadius="md" px="3" py="2" fontWeight="medium" color="gray.700" _hover={{ bg: 'teal.50', color: 'teal.800', textDecoration: 'none' }}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </Link>
            ))}
          </Stack>

          <Stack gap="2" pt="4" borderTopWidth="1px">
            <Text fontSize="sm" fontWeight="medium" truncate>
              {session.data?.user?.name ?? session.data?.user?.email}
            </Text>
            <Button variant="outline" size="sm" onClick={signOut} loading={logout.isPending}>
              Sign out
            </Button>
            {logout.isError && <Text color="red.600" fontSize="sm">Could not sign out. Try again.</Text>}
          </Stack>
        </Stack>
      </Box>

      <Box as="main" flex="1" minW="0">
        <Container maxW="6xl" px={{ base: '5', lg: '10' }} py={{ base: '8', lg: '12' }}>
          <Outlet />
        </Container>
      </Box>
    </Flex>
  )
}
