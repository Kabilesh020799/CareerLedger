import { Alert, Box, Button, Flex, Heading, Spinner, Stack, Table, Text } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApplicationDiscoveryControls } from '../components/applications/ApplicationDiscoveryControls'
import { StatusBadge } from '../components/applications/StatusBadge'
import { useApplications } from '../hooks/useApplications'
import {
  applicationDiscoveryFromSearchParams,
  applicationDiscoveryToSearchParams,
  defaultApplicationDiscoveryQuery,
  hasApplicationDiscoveryFilters,
} from '../schemas/application-discovery.schema'
import type { ApplicationDiscoveryQuery } from '../types/application'
import { getApiErrorMessage } from '../utils/apiError'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

export function ApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(
    () => applicationDiscoveryFromSearchParams(searchParams),
    [searchParams],
  )
  const applicationsQuery = useApplications(query)
  const hasFilters = hasApplicationDiscoveryFilters(query)

  const setQuery = (nextQuery: ApplicationDiscoveryQuery) => {
    setSearchParams(applicationDiscoveryToSearchParams(nextQuery))
  }

  const clearFilters = () => {
    setQuery(defaultApplicationDiscoveryQuery)
  }

  return (
    <Stack gap="6">
      <Flex align={{ base: 'start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="4" justify="space-between">
        <Stack gap="1">
          <Heading as="h2" size="2xl">Applications</Heading>
          <Text color="fg.muted">Track every opportunity in one place.</Text>
        </Stack>
        <Button asChild colorPalette="purple">
          <Link to="/applications/new">Add application</Link>
        </Button>
      </Flex>

      <ApplicationDiscoveryControls
        query={query}
        onChange={setQuery}
        onClear={clearFilters}
      />

      {applicationsQuery.isPending && (
        <Flex align="center" justify="center" minH="16rem" aria-label="Loading applications">
          <Spinner color="purple.fg" size="xl" />
        </Flex>
      )}

      {applicationsQuery.isError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load applications</Alert.Title>
            <Alert.Description>{getApiErrorMessage(applicationsQuery.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => applicationsQuery.refetch()}>Retry</Button>
        </Alert.Root>
      )}

      {applicationsQuery.isSuccess && applicationsQuery.data.pagination.total === 0 && !hasFilters && (
        <Stack align="center" bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" p={{ base: '8', md: '12' }} textAlign="center" gap="3">
          <Heading as="h3" size="lg">No applications yet</Heading>
          <Text color="fg.muted">Add your first opportunity to start tracking your job search.</Text>
          <Button asChild colorPalette="purple" mt="2">
            <Link to="/applications/new">Create your first application</Link>
          </Button>
        </Stack>
      )}

      {applicationsQuery.isSuccess && applicationsQuery.data.pagination.total === 0 && hasFilters && (
        <Stack align="center" bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" p={{ base: '8', md: '12' }} textAlign="center" gap="3">
          <Heading as="h3" size="lg">No matching applications</Heading>
          <Text color="fg.muted">Try changing your search or clearing the filters.</Text>
          <Button colorPalette="purple" mt="2" onClick={clearFilters}>Clear filters</Button>
        </Stack>
      )}

      {applicationsQuery.isSuccess && applicationsQuery.data.pagination.total > 0 && applicationsQuery.data.data.length === 0 && (
        <Stack align="center" bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" p="8" textAlign="center" gap="3">
          <Heading as="h3" size="lg">No applications on this page</Heading>
          <Button
            colorPalette="purple"
            onClick={() => setQuery({ ...query, page: Math.max(1, query.page - 1) })}
          >
            Previous page
          </Button>
        </Stack>
      )}

      {applicationsQuery.isSuccess && applicationsQuery.data.data.length > 0 && (
        <Stack gap="3">
          <Box bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" overflowX="auto">
            <Table.Root variant="line" size="md">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Company</Table.ColumnHeader>
                <Table.ColumnHeader>Position</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Applied date</Table.ColumnHeader>
                <Table.ColumnHeader>Source</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {applicationsQuery.data.data.map((application) => (
                <Table.Row key={application.id}>
                  <Table.Cell fontWeight="medium">{application.company}</Table.Cell>
                  <Table.Cell>{application.jobTitle}</Table.Cell>
                  <Table.Cell><StatusBadge status={application.status} /></Table.Cell>
                  <Table.Cell>{formatDate(application.appliedAt)}</Table.Cell>
                  <Table.Cell>{application.source ?? '—'}</Table.Cell>
                  <Table.Cell textAlign="end">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/applications/${application.id}`}>View</Link>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
            </Table.Root>
          </Box>

          <Flex
            align={{ base: 'start', sm: 'center' }}
            direction={{ base: 'column', sm: 'row' }}
            gap="3"
            justify="space-between"
          >
            <Text color="fg.muted" fontSize="sm">
              Showing {applicationsQuery.data.data.length} of {applicationsQuery.data.pagination.total} applications
            </Text>
            <Flex align="center" gap="3">
              <Button
                disabled={query.page <= 1}
                size="sm"
                variant="outline"
                onClick={() => setQuery({ ...query, page: query.page - 1 })}
              >
                Previous
              </Button>
              <Text fontSize="sm">
                Page {query.page} of {Math.max(1, applicationsQuery.data.pagination.pages)}
              </Text>
              <Button
                disabled={query.page >= applicationsQuery.data.pagination.pages}
                size="sm"
                variant="outline"
                onClick={() => setQuery({ ...query, page: query.page + 1 })}
              >
                Next
              </Button>
            </Flex>
          </Flex>
        </Stack>
      )}
    </Stack>
  )
}
