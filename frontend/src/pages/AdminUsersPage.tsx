import { Alert, Badge, Box, Button, Flex, Input, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { useAdminUsers } from '../hooks/useAdminUsers'
import { getApiErrorMessage } from '../utils/apiError'

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const usersQuery = useAdminUsers(page, search)

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <Stack gap="7">
      <PageHeader eyebrow="Administration" title="User accounts" description="Review account access and high-level usage without opening private user data." />

      {usersQuery.isPending && <LoadingSkeleton label="Loading user accounts" />}
      {usersQuery.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Unable to load users</Alert.Title><Alert.Description>{getApiErrorMessage(usersQuery.error, 'Please try again.')}</Alert.Description></Alert.Content><Button ml="auto" variant="outline" onClick={() => usersQuery.refetch()}>Retry</Button></Alert.Root>}

      {usersQuery.data && <>
        <SimpleGrid columns={{ base: 2, lg: 4 }} gap="4">
          <Metric label="Total users" value={usersQuery.data.summary.totalUsers} />
          <Metric label="Verified emails" value={usersQuery.data.summary.verifiedUsers} />
          <Metric label="Password accounts" value={usersQuery.data.summary.passwordUsers} />
          <Metric label="Google accounts" value={usersQuery.data.summary.googleUsers} />
        </SimpleGrid>

        <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" overflow="hidden">
          <Box as="form" borderBottomWidth="1px" borderColor="border" p="4" onSubmit={submitSearch}>
            <Flex gap="3" direction={{ base: 'column', sm: 'row' }}>
              <Input aria-label="Search users" placeholder="Search name, username, or email" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
              <Button type="submit" colorPalette="brand">Search</Button>
            </Flex>
          </Box>

          {usersQuery.data.users.length === 0 ? <Text color="fg.muted" p="8" textAlign="center">No matching users.</Text> : <Box overflowX="auto">
            <Table.Root aria-label="User accounts" minW="58rem" variant="line">
              <Table.Header><Table.Row><Table.ColumnHeader>User</Table.ColumnHeader><Table.ColumnHeader>Access</Table.ColumnHeader><Table.ColumnHeader>Verified</Table.ColumnHeader><Table.ColumnHeader>Applications</Table.ColumnHeader><Table.ColumnHeader>Workspaces</Table.ColumnHeader><Table.ColumnHeader>Joined</Table.ColumnHeader></Table.Row></Table.Header>
              <Table.Body>{usersQuery.data.users.map((user) => <Table.Row key={user.id}>
                <Table.Cell><Stack gap="0"><Text fontWeight="semibold">{user.name ?? user.username ?? 'Unnamed user'}</Text><Text color="fg.muted" fontSize="sm">{user.email}</Text>{user.username && <Text color="fg.subtle" fontSize="xs">@{user.username}</Text>}</Stack></Table.Cell>
                <Table.Cell><Flex gap="1" wrap="wrap">{user.authMethods.password && <Badge>Password</Badge>}{user.authMethods.google && <Badge colorPalette="blue">Google</Badge>}</Flex></Table.Cell>
                <Table.Cell><Badge colorPalette={user.emailVerifiedAt ? 'green' : 'orange'}>{user.emailVerifiedAt ? 'Verified' : 'Unverified'}</Badge></Table.Cell>
                <Table.Cell>{user.applicationCount}</Table.Cell><Table.Cell>{user.workspaceCount}</Table.Cell>
                <Table.Cell>{new Date(user.createdAt).toLocaleDateString()}</Table.Cell>
              </Table.Row>)}</Table.Body>
            </Table.Root>
          </Box>}

          <Flex align="center" borderTopWidth="1px" borderColor="border" justify="space-between" p="4">
            <Text color="fg.muted" fontSize="sm">Page {usersQuery.data.pagination.page} of {Math.max(1, usersQuery.data.pagination.totalPages)} · {usersQuery.data.pagination.totalItems} result{usersQuery.data.pagination.totalItems === 1 ? '' : 's'}</Text>
            <Flex gap="2"><Button disabled={page <= 1} variant="outline" onClick={() => setPage((value) => value - 1)}>Previous</Button><Button disabled={page >= usersQuery.data.pagination.totalPages} variant="outline" onClick={() => setPage((value) => value + 1)}>Next</Button></Flex>
          </Flex>
        </Box>
      </>}
    </Stack>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="1" p="5"><Text color="fg.muted" fontSize="sm">{label}</Text><Text fontSize="3xl" fontWeight="bold">{value}</Text></Stack>
}
