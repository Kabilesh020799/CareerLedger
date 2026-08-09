import { Box, Button, Container, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
  const location = useLocation()
  const [navigationOpen, setNavigationOpen] = useState(false)

  useEffect(() => {
    setNavigationOpen(false)
  }, [location.pathname])

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <Flex minH="100vh" maxW="100vw" overflowX="clip" bg="bg.subtle" color="fg" direction={{ base: 'column', lg: 'row' }}>
      <Box
        as="header"
        bg="bg.panel"
        borderColor="border"
        borderRightWidth={{ lg: '1px' }}
        borderBottomWidth={{ base: '1px', lg: '0' }}
        flexShrink="0"
        position={{ base: 'sticky', lg: 'static' }}
        top="0"
        w={{ base: 'full', lg: '17rem' }}
        zIndex="docked"
      >
        <Stack gap={{ base: '0', lg: '8' }} px={{ base: '4', sm: '6' }} py={{ base: '3', lg: '7' }} position={{ lg: 'sticky' }} top="0">
          <Flex align="center" gap="3" justify="space-between">
            <Flex align="center" gap="3" minW="0">
            <Flex align="center" bg="purple.solid" borderRadius="xl" color="purple.contrast" fontWeight="bold" h="10" justify="center" shadow="sm" w="10">JT</Flex>
            <Box minW="0">
              <Heading as="h1" color="purple.fg" size="lg" whiteSpace="nowrap">Job Tracker</Heading>
              <Text color="fg.muted" display={{ base: 'none', lg: 'block' }} fontSize="sm" mt="1">Keep your search moving.</Text>
            </Box>
            </Flex>
            <Button
              aria-controls="responsive-primary-navigation"
              aria-expanded={navigationOpen}
              aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
              display={{ base: 'inline-flex', lg: 'none' }}
              minH="11"
              variant="outline"
              onClick={() => setNavigationOpen((open) => !open)}
            >
              <Text aria-hidden="true" fontSize="lg">{navigationOpen ? '×' : '☰'}</Text>
              Menu
            </Button>
          </Flex>

          <Box
            bg="bg.panel"
            borderColor="border"
            borderBottomWidth={{ base: '1px', lg: '0' }}
            boxShadow={{ base: 'lg', lg: 'none' }}
            display={{ base: navigationOpen ? 'block' : 'none', lg: 'block' }}
            id="responsive-primary-navigation"
            left={{ base: '0', lg: 'auto' }}
            maxH={{ base: 'calc(100dvh - 4rem)', lg: 'none' }}
            overflowY={{ base: 'auto', lg: 'visible' }}
            p={{ base: '4', lg: '0' }}
            position={{ base: 'absolute', lg: 'static' }}
            right={{ base: '0', lg: 'auto' }}
            top={{ base: 'full', lg: 'auto' }}
          >
            <Stack gap="6">
              <Stack as="nav" aria-label="Primary navigation" gap="2">
                {navigation.map((item) => (
                  <Link asChild key={item.to} borderRadius="lg" minH="11" px="3" py="2.5" fontWeight="medium" color="fg.muted" _currentPage={{ bg: 'purple.subtle', color: 'purple.fg' }} _hover={{ bg: 'purple.subtle', color: 'purple.fg', textDecoration: 'none' }}>
                    <NavLink to={item.to}>{item.label}</NavLink>
                  </Link>
                ))}
              </Stack>

              <Stack gap="3" pt="4" borderColor="border" borderTopWidth="1px">
                <Text fontSize="sm" fontWeight="medium" truncate>
                  {session.data?.user?.name ?? session.data?.user?.email}
                </Text>
                <Flex gap="2" wrap="wrap">
                  <Button variant="outline" size="sm" onClick={signOut} loading={logout.isPending}>
                    Sign out
                  </Button>
                  <ThemeToggle />
                </Flex>
                {logout.isError && <Text color="fg.error" fontSize="sm">Could not sign out. Try again.</Text>}
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box as="main" flex="1" minW="0" overflowWrap="break-word" w="full">
        <Container maxW="7xl" px={{ base: '4', sm: '6', lg: '10' }} py={{ base: '6', sm: '8', lg: '12' }}>
          <Outlet />
        </Container>
      </Box>
    </Flex>
  )
}
