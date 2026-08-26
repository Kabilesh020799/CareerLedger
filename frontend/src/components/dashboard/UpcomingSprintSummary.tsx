import { Alert, Button, Flex, Heading, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useScheduledSprints } from '../../hooks/useScheduledSprints'
import { getApiErrorMessage } from '../../utils/apiError'
import { calculatedSprintEndAt, formatSprintDate, formatSprintDateTime, getLocalSprintTimeZone } from '../../utils/sprint'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'

/** Keeps the next sprint plans visible without requiring a visit to the board. */
export function UpcomingSprintSummary() {
  const scheduledQuery = useScheduledSprints()
  const scheduledSprints = scheduledQuery.data ?? []

  return (
    <Stack
      aria-labelledby="upcoming-sprint-summary-heading"
      as="section"
      bg="bg.panel"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap="4"
      p={{ base: '5', md: '6' }}
    >
      <Flex align={{ base: 'start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="3" justify="space-between">
        <Stack gap="1">
          <Heading as="h2" id="upcoming-sprint-summary-heading" size="lg">Upcoming sprint schedule</Heading>
          <Text color="fg.muted" fontSize="sm">A quick look at the sprint plans coming next.</Text>
        </Stack>
        <Button asChild size="sm" variant="outline">
          <Link to="/board#upcoming-sprints-heading">Manage on Board</Link>
        </Button>
      </Flex>

      {scheduledQuery.isPending && <LoadingSkeleton label="Loading upcoming sprint schedule" />}

      {scheduledQuery.isError && (
        <Alert.Root role="alert" status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load upcoming sprints</Alert.Title>
            <Alert.Description>{getApiErrorMessage(scheduledQuery.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => scheduledQuery.refetch()}>
            Retry
          </Button>
        </Alert.Root>
      )}

      {scheduledQuery.isSuccess && scheduledSprints.length === 0 && (
        <Text color="fg.muted">No upcoming sprints scheduled.</Text>
      )}

      {scheduledQuery.isSuccess && scheduledSprints.length > 0 && (
        <Stack gap="3">
          {scheduledSprints.slice(0, 3).map((sprint) => (
            <Stack
              aria-label={`${sprint.name}, upcoming sprint summary`}
              as="article"
              borderColor="border"
              borderRadius="lg"
              borderWidth="1px"
              gap="1"
              key={sprint.id}
              p="4"
            >
              <ChakraLink asChild color="brand.fg" fontWeight="semibold">
                <Link to="/board#upcoming-sprints-heading">{sprint.name}</Link>
              </ChakraLink>
              <Text color="fg.muted" fontSize="sm">
                Starts {sprint.scheduledStartAt ? formatSprintDate(sprint.scheduledStartAt) : 'date unavailable'} · {getLocalSprintTimeZone()}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Ends {formatSprintDateTime(calculatedSprintEndAt(sprint))}
              </Text>
            </Stack>
          ))}
          {scheduledSprints.length > 3 && (
            <Text color="fg.muted" fontSize="sm">{scheduledSprints.length - 3} more scheduled sprint{scheduledSprints.length - 3 === 1 ? '' : 's'} on the Board.</Text>
          )}
        </Stack>
      )}
    </Stack>
  )
}
