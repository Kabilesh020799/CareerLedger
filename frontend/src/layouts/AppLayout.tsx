import { Box, Button, Container, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useLogout } from '../hooks/useLogout'
import { useSession } from '../hooks/useSession'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const navigation = [
  { label: 'Applications', to: '/applications' },
  { label: 'Board', to: '/board' },
  { label: 'Resumes', to: '/resumes' },
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
    <Flex minH="100vh" bg="bg.subtle" color="fg" direction={{ base: 'column', md: 'row' }}>
      <Box as="header" bg="bg.panel" borderColor="border" borderRightWidth={{ md: '1px' }} borderBottomWidth={{ base: '1px', md: '0' }} w={{ md: '17rem' }}>
        <Stack gap="8" px="6" py="7" position={{ md: 'sticky' }} top="0">
          <Flex align="center" gap="3">
            <Flex align="center" bg="purple.solid" borderRadius="xl" color="purple.contrast" fontWeight="bold" h="10" justify="center" shadow="sm" w="10">JT</Flex>
            <Box>
              <Heading as="h1" size="lg" color="purple.fg">Job Tracker</Heading>
              <Text color="fg.muted" fontSize="sm" mt="1">Keep your search moving.</Text>
            </Box>
          </Flex>

          <Stack as="nav" aria-label="Primary navigation" gap="2">
            {navigation.map((item) => (
              <Link asChild key={item.to} borderRadius="lg" px="3" py="2.5" fontWeight="medium" color="fg.muted" _currentPage={{ bg: 'purple.subtle', color: 'purple.fg' }} _hover={{ bg: 'purple.subtle', color: 'purple.fg', textDecoration: 'none' }}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </Link>
            ))}
          </Stack>

          <Stack gap="2" pt="4" borderColor="border" borderTopWidth="1px">
            <Text fontSize="sm" fontWeight="medium" truncate>
              {session.data?.user?.name ?? session.data?.user?.email}
            </Text>
            <Button variant="outline" size="sm" onClick={signOut} loading={logout.isPending}>
              Sign out
            </Button>
            <ThemeToggle />
            {logout.isError && <Text color="fg.error" fontSize="sm">Could not sign out. Try again.</Text>}
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
