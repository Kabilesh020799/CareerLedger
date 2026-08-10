import { Alert, Badge, Box, Button, Flex, Heading, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
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
import { LoadingSkeleton, Surface } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'

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
  const [filtersOpen, setFiltersOpen] = useState(false)

  const setQuery = (nextQuery: ApplicationDiscoveryQuery) => {
    setSearchParams(applicationDiscoveryToSearchParams(nextQuery))
  }

  const clearFilters = () => {
    setQuery(defaultApplicationDiscoveryQuery)
  }

  return (
    <Stack gap="6">
      <PageHeader title="Applications" description="Track, prioritize, and move every opportunity forward." action={{ label: 'Add application', to: '/applications/new' }} />

      <Flex align="center" justify="space-between" gap="3">
        <Text color="fg.muted" fontSize="sm">{applicationsQuery.data?.pagination.total ?? 0} application{applicationsQuery.data?.pagination.total === 1 ? '' : 's'}</Text>
        <Button aria-expanded={filtersOpen} display={{ base: 'inline-flex', md: 'none' }} size="sm" variant="outline" onClick={() => setFiltersOpen((value) => !value)}>Filters {hasFilters && <Badge colorPalette="purple" ml="2" variant="solid">On</Badge>}</Button>
      </Flex>
      <Box display={{ base: filtersOpen ? 'block' : 'none', md: 'block' }}>
        <ApplicationDiscoveryControls query={query} onChange={(value) => { setQuery(value); setFiltersOpen(false) }} onClear={clearFilters} />
      </Box>

      {applicationsQuery.isPending && (
        <LoadingSkeleton label="Loading applications" variant="table" />
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
          <Box
            aria-label="Scrollable applications table"
            bg="bg.panel"
            borderColor="border"
            borderWidth="1px"
            borderRadius="xl"
            display={{ base: 'none', md: 'block' }}
            maxW="full"
            overflowX="auto"
            overscrollBehaviorX="contain"
            role="region"
            tabIndex={0}
          >
            <Table.Root minW="50rem" variant="line" size="md">
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
                  <Table.Cell fontWeight="semibold"><Link to={`/applications/${application.id}`}>{application.company}</Link></Table.Cell>
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

          <SimpleGrid display={{ base: 'grid', md: 'none' }} gap="3">
            {applicationsQuery.data.data.map((application) => (
              <Surface as="article" key={application.id} p="4">
                <Link aria-label={`Open ${application.company} application`} to={`/applications/${application.id}`}>
                  <Stack gap="3">
                    <Flex align="start" gap="3" justify="space-between">
                      <Box minW="0"><Heading as="h3" fontSize="md" truncate>{application.company}</Heading><Text color="fg.muted" fontSize="sm" mt="0.5">{application.jobTitle}</Text></Box>
                      <StatusBadge status={application.status} />
                    </Flex>
                    <Flex color="fg.subtle" fontSize="xs" gap="3" justify="space-between"><Text>{application.source ?? 'Source not added'}</Text><Text>{formatDate(application.appliedAt)}</Text></Flex>
                  </Stack>
                </Link>
              </Surface>
            ))}
          </SimpleGrid>

          <Flex
            align={{ base: 'start', sm: 'center' }}
            direction={{ base: 'column', sm: 'row' }}
            gap="3"
            justify="space-between"
          >
            <Text color="fg.muted" fontSize="sm">
              Showing {applicationsQuery.data.data.length} of {applicationsQuery.data.pagination.total} applications
            </Text>
            <Flex align="center" gap="3" justify={{ base: 'space-between', sm: 'start' }} w={{ base: 'full', sm: 'auto' }} wrap="wrap">
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
