import { Alert, Box, Button, Flex, Heading, Spinner, Stack, Table, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/applications/StatusBadge'
import { useApplications } from '../hooks/useApplications'
import { getApiErrorMessage } from '../utils/apiError'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

export function ApplicationsPage() {
  const applicationsQuery = useApplications()

  return (
    <Stack gap="6">
      <Flex align={{ base: 'start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="4" justify="space-between">
        <Stack gap="1">
          <Heading as="h2" size="2xl">Applications</Heading>
          <Text color="gray.600">Track every opportunity in one place.</Text>
        </Stack>
        <Button asChild colorPalette="teal">
          <Link to="/applications/new">Add application</Link>
        </Button>
      </Flex>

      {applicationsQuery.isPending && (
        <Flex align="center" justify="center" minH="16rem" aria-label="Loading applications">
          <Spinner color="teal.600" size="xl" />
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

      {applicationsQuery.isSuccess && applicationsQuery.data.length === 0 && (
        <Stack align="center" bg="white" borderWidth="1px" borderRadius="xl" p={{ base: '8', md: '12' }} textAlign="center" gap="3">
          <Heading as="h3" size="lg">No applications yet</Heading>
          <Text color="gray.600">Add your first opportunity to start tracking your job search.</Text>
          <Button asChild colorPalette="teal" mt="2">
            <Link to="/applications/new">Create your first application</Link>
          </Button>
        </Stack>
      )}

      {applicationsQuery.isSuccess && applicationsQuery.data.length > 0 && (
        <Box bg="white" borderWidth="1px" borderRadius="xl" overflowX="auto">
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
              {applicationsQuery.data.map((application) => (
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
      )}
    </Stack>
  )
}
