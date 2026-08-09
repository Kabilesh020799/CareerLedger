import { Alert, Button, Flex, Heading, Spinner, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { ApplicationBoard } from '../components/applications/ApplicationBoard'
import { useApplicationBoard } from '../hooks/useApplicationBoard'
import { useMoveApplication } from '../hooks/useMoveApplication'
import type { ApplicationStatus } from '../types/application'
import { getApiErrorMessage } from '../utils/apiError'

export function ApplicationBoardPage() {
  const boardQuery = useApplicationBoard()
  const moveApplication = useMoveApplication()

  const move = (id: string, status: ApplicationStatus) => {
    moveApplication.mutate({ id, status })
  }

  return (
    <Stack gap="6">
      <Flex
        align={{ base: 'start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap="4"
        justify="space-between"
      >
        <Stack gap="1">
          <Heading as="h2" size="2xl">Application board</Heading>
          <Text color="gray.600">Move opportunities as they progress through your pipeline.</Text>
        </Stack>
        <Button asChild colorPalette="teal">
          <Link to="/applications/new">Add application</Link>
        </Button>
      </Flex>

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
      </Text>

      {boardQuery.isPending && (
        <Flex align="center" aria-label="Loading application board" justify="center" minH="20rem">
          <Spinner color="teal.600" size="xl" />
        </Flex>
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

      {boardQuery.isSuccess && boardQuery.data.length === 0 && (
        <Stack
          align="center"
          bg="white"
          borderRadius="xl"
          borderWidth="1px"
          gap="3"
          p={{ base: '8', md: '12' }}
          textAlign="center"
        >
          <Heading as="h3" size="lg">No applications on your board</Heading>
          <Text color="gray.600">Create your first application to start building your pipeline.</Text>
          <Button asChild colorPalette="teal" mt="2">
            <Link to="/applications/new">Create your first application</Link>
          </Button>
        </Stack>
      )}

      {boardQuery.isSuccess && boardQuery.data.length > 0 && (
        <ApplicationBoard
          applications={boardQuery.data}
          movingApplicationId={moveApplication.isPending ? moveApplication.variables?.id : undefined}
          onMove={move}
        />
      )}
    </Stack>
  )
}
