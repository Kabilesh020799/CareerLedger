import { Alert, Badge, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { ApplicationBoard } from '../components/applications/ApplicationBoard'
import { useApplicationBoard } from '../hooks/useApplicationBoard'
import { useMoveApplication } from '../hooks/useMoveApplication'
import { useStartSprint } from '../hooks/useStartSprint'
import type { ApplicationStatus } from '../types/application'
import { getApiErrorMessage } from '../utils/apiError'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function ApplicationBoardPage() {
  const boardQuery = useApplicationBoard()
  const moveApplication = useMoveApplication()
  const startSprint = useStartSprint()

  const move = (id: string, status: ApplicationStatus) => {
    moveApplication.mutate({ id, status })
  }

  const start = () => startSprint.mutate({})

  return (
    <Stack gap="6">
      <PageHeader title="Application board" description="Move opportunities through each stage of your pipeline." action={{ label: 'Add application', to: '/applications/new' }} />

      {boardQuery.isSuccess && (
        <Flex align={{ base: 'start', sm: 'center' }} bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" justify="space-between" p="4" wrap="wrap">
          <Stack gap="1">
            <Text color="fg.muted" fontSize="sm">Current sprint</Text>
            {boardQuery.data.sprint ? (
              <Flex align="center" gap="2" wrap="wrap">
                <Heading as="h2" size="md">{boardQuery.data.sprint.name}</Heading>
                <Badge colorPalette="green">Active</Badge>
                <Text color="fg.muted" fontSize="sm">Sprint {boardQuery.data.sprint.sequence}</Text>
                <Text color="fg.muted" fontSize="sm">{boardQuery.data.applications.length} application{boardQuery.data.applications.length === 1 ? '' : 's'}</Text>
              </Flex>
            ) : (
              <Heading as="h2" size="md">No active sprint</Heading>
            )}
            <Text color="fg.muted" fontSize="sm">
              {boardQuery.data.sprint ? 'Rejected applications stay archived when this sprint closes; other applications carry forward.' : 'Start a sprint to organize the applications already in your pipeline.'}
            </Text>
          </Stack>
          {boardQuery.data.sprint && (
            <Button colorPalette="brand" loading={startSprint.isPending} onClick={start}>Start new sprint</Button>
          )}
        </Flex>
      )}

      {startSprint.isError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to start sprint</Alert.Title>
            <Alert.Description>{getApiErrorMessage(startSprint.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => startSprint.reset()}>Dismiss</Button>
        </Alert.Root>
      )}

      {startSprint.isSuccess && startSprint.data && (
        <Alert.Root aria-live="polite" status="success" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Sprint started</Alert.Title>
            <Alert.Description>
              {countLabel(startSprint.data.carriedOverCount, 'application', 'applications')} carried over. {countLabel(startSprint.data.closedRejectedCount, 'rejected application', 'rejected applications')} closed in the previous sprint.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {moveApplication.isError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to move application</Alert.Title>
            <Alert.Description>
              {getApiErrorMessage(
                moveApplication.error,
                'The application was returned to its previous status. Try again.',
              )}
            </Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => moveApplication.reset()}>
            Dismiss
          </Button>
        </Alert.Root>
      )}

      <Text aria-live="polite" srOnly>
        {moveApplication.isPending && 'Updating application status.'}
        {moveApplication.isSuccess && `Application moved to ${moveApplication.data.status}.`}
        {startSprint.isSuccess && startSprint.data && `${startSprint.data.sprint.name} started.`}
      </Text>

      {boardQuery.isPending && (
        <LoadingSkeleton label="Loading application board" variant="board" />
      )}

      {boardQuery.isError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load application board</Alert.Title>
            <Alert.Description>
              {getApiErrorMessage(boardQuery.error, 'Please try again.')}
            </Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => boardQuery.refetch()}>
            Retry
          </Button>
        </Alert.Root>
      )}

      {boardQuery.isSuccess && !boardQuery.data.sprint && (
        <Stack align="center" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="3" p={{ base: '8', md: '12' }} textAlign="center">
          <Heading as="h3" size="lg">Start your first sprint</Heading>
          <Text color="fg.muted">Applications already in your pipeline will be included when you start.</Text>
          <Button colorPalette="brand" onClick={start} loading={startSprint.isPending}>Start sprint</Button>
        </Stack>
      )}

      {boardQuery.isSuccess && boardQuery.data.sprint && boardQuery.data.applications.length === 0 && (
        <Stack
          align="center"
          bg="bg.panel"
          borderColor="border"
          borderRadius="xl"
          borderWidth="1px"
          gap="3"
          p={{ base: '8', md: '12' }}
          textAlign="center"
        >
          <Heading as="h3" size="lg">No applications on your board</Heading>
          <Text color="fg.muted">Create your first application to start building your pipeline.</Text>
          <Button asChild colorPalette="brand" mt="2">
            <Link to="/applications/new">Create your first application</Link>
          </Button>
        </Stack>
      )}

      {boardQuery.isSuccess && boardQuery.data.sprint && boardQuery.data.applications.length > 0 && (
        <ApplicationBoard
          applications={boardQuery.data.applications}
          movingApplicationId={moveApplication.isPending ? moveApplication.variables?.id : undefined}
          onMove={move}
        />
      )}
    </Stack>
  )
}
