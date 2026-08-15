import { Badge, Box, Button, Container, Flex, Heading, Link, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLogout } from '../hooks/useLogout'
import { useSession } from '../hooks/useSession'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useGmailUpdateReviews } from '../hooks/useGmailUpdateReviews'
import { Bell, BriefcaseBusiness, CalendarDays, Columns3, Database, FileText, Gauge, Mail, Menu, Puzzle, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { CustomSelect } from '../components/ui/CustomSelect'

const navigation = [
  { label: 'Workspace', items: [{ label: 'Dashboard', to: '/dashboard', icon: Gauge }] },
  { label: 'Applications', items: [
    { label: 'Applications', to: '/applications', icon: BriefcaseBusiness },
    { label: 'Board', to: '/board', icon: Columns3 },
  ] },
  { label: 'Documents', items: [{ label: 'Resumes', to: '/resumes', icon: FileText }] },
  { label: 'Automation', items: [
    { label: 'Email sync', to: '/gmail', icon: Mail },
    { label: 'Calendar', to: '/calendar', icon: CalendarDays },
    { label: 'Browser extension', to: '/browser-extension', icon: Puzzle },
  ] },
  { label: 'Settings', items: [
    { label: 'Profile', to: '/profile', icon: UserRound },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Team', to: '/team', icon: Users },
    { label: 'Data', to: '/data', icon: Database },
  ] },
]

const mobileNavigation = [
  { label: 'Dashboard', to: '/dashboard', icon: Gauge },
  { label: 'Applications', to: '/applications', icon: BriefcaseBusiness },
  { label: 'Board', to: '/board', icon: Columns3 },
]

export function AppLayout() {
  const session = useSession()
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const gmailReviews = useGmailUpdateReviews()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const workspace = useWorkspace()
  const pendingGmailUpdates = gmailReviews.data?.length ?? 0
  const visibleNavigation = session.data?.user?.isAdmin
    ? [...navigation, { label: 'Admin', items: [{ label: 'User accounts', to: '/admin/users', icon: ShieldCheck }] }]
    : navigation

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
        w={{ base: 'full', lg: '16rem' }}
        zIndex="docked"
      >
        <Stack gap={{ base: '0', lg: '7' }} minH={{ lg: '100vh' }} px={{ base: '4', sm: '6', lg: '5' }} py={{ base: '3', lg: '6' }} position={{ lg: 'sticky' }} top="0">
          <Flex align="center" gap="3" justify="space-between">
            <Flex align="center" gap="3" minW="0">
            <Flex align="center" bg="purple.solid" borderRadius="lg" color="purple.contrast" fontWeight="bold" h="9" justify="center" shadow="sm" w="9">JT</Flex>
            <Box minW="0">
              <Heading as="div" fontSize="md" letterSpacing="-0.02em" whiteSpace="nowrap">Job Tracker</Heading>
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
              {navigationOpen ? <X aria-hidden size={18} /> : <Menu aria-hidden size={18} />}
              <Text display={{ base: 'none', sm: 'block' }}>Menu</Text>
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
            <Stack gap="6" justify="space-between" minH={{ lg: 'calc(100vh - 7rem)' }}>
              <Stack as="nav" aria-label="Primary navigation" gap="5">
                {visibleNavigation.map((group) => (
                  <Stack gap="1" key={group.label}>
                    <Text color="fg.subtle" fontSize="2xs" fontWeight="bold" letterSpacing="0.1em" px="3" textTransform="uppercase">{group.label}</Text>
                    {group.items.map((item) => <Link asChild key={item.to} borderRadius="lg" minH="11" px="3" py="2" fontSize="sm" fontWeight="medium" color="fg.muted" _currentPage={{ bg: 'purple.subtle', color: 'purple.fg' }} _hover={{ bg: 'bg.muted', color: 'fg', textDecoration: 'none' }}>
                      <NavLink to={item.to}>
                        <Flex align="center" gap="3" justify="space-between" w="full">
                          <Flex align="center" gap="3"><item.icon aria-hidden size={18} /><Text>{item.label}</Text></Flex>
                          {item.to === '/gmail' && pendingGmailUpdates > 0 && (
                          <Badge
                            aria-label={`${pendingGmailUpdates} pending email ${pendingGmailUpdates === 1 ? 'update' : 'updates'}`}
                            borderRadius="full"
                            colorPalette="orange"
                            minW="6"
                            px="2"
                            textAlign="center"
                            variant="solid"
                          >
                            {pendingGmailUpdates > 99 ? '99+' : pendingGmailUpdates}
                          </Badge>
                        )}
                        </Flex>
                      </NavLink>
                    </Link>)}
                  </Stack>
                ))}
              </Stack>

              <Stack gap="3" pt="4" borderColor="border" borderTopWidth="1px">
                {workspace.workspaceId && <CustomSelect aria-label="Active workspace" value={workspace.workspaceId} options={(workspace.memberships??[]).map(item=>({label:item.workspace.name,value:item.workspace.id}))} onChange={workspace.setWorkspaceId} />}
                <Text fontSize="sm" fontWeight="medium" truncate>
                  {session.data?.user?.name ?? session.data?.user?.email}
                </Text>
                <Flex gap="2" wrap="nowrap" w="full">
                  <Button flex="1" minH="10" minW="0" whiteSpace="nowrap" variant="outline" size="sm" onClick={signOut} loading={logout.isPending}>
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
        <Container maxW="8xl" px={{ base: '4', sm: '6', lg: '10' }} pb={{ base: '24', lg: '12' }} pt={{ base: '6', sm: '8', lg: '10' }}>
          <Outlet />
        </Container>
      </Box>
      <Flex as="nav" aria-label="Mobile navigation" align="center" bg="bg.panel" borderColor="border" borderTopWidth="1px" bottom="0" display={{ base: 'flex', lg: 'none' }} h="18" justify="space-around" left="0" position="fixed" right="0" zIndex="docked">
        {mobileNavigation.map((item) => <Link asChild key={item.to} color="fg.muted" _currentPage={{ color: 'purple.fg' }} _hover={{ textDecoration: 'none' }}><NavLink aria-label={`${item.label} tab`} to={item.to}><Stack align="center" gap="0.5" minW="20"><item.icon aria-hidden size={20} /><Text fontSize="xs" fontWeight="semibold">{item.label}</Text></Stack></NavLink></Link>)}
        <Button aria-controls="responsive-primary-navigation" aria-expanded={navigationOpen} color="fg.muted" h="auto" minW="20" p="0" variant="plain" onClick={() => setNavigationOpen((open) => !open)}><Stack align="center" gap="0.5"><Menu aria-hidden size={20} /><Text fontSize="xs" fontWeight="semibold">More</Text></Stack></Button>
      </Flex>
    </Flex>
  )
}
