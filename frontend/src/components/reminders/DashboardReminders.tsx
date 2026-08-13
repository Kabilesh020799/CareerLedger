import { Alert, Badge, Box, Button, Flex, Heading, Link as ChakraLink, Spinner, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useOpenReminders } from '../../hooks/useOpenReminders'
import { useUpdateReminder } from '../../hooks/useUpdateReminder'
import type { ReminderWithApplication } from '../../types/reminder'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatReminderDate, partitionOpenReminders } from '../../utils/reminder'

export function DashboardReminders({ compact = false }: { compact?: boolean }) {
  const remindersQuery = useOpenReminders()
  const updateReminder = useUpdateReminder()

  return (
    <Stack gap="4">
      {!compact && <Stack gap="1">
        <Heading as="h3" size="lg">Reminders</Heading>
        <Text color="fg.muted" fontSize="sm">Upcoming actions and deadlines across your applications.</Text>
      </Stack>}
      {compact && <Heading as="h3" size="md">Reminders</Heading>}

      {updateReminder.isError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to complete reminder</Alert.Title>
            <Alert.Description>{getApiErrorMessage(updateReminder.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {remindersQuery.isPending && (
        <Flex align="center" aria-label="Loading dashboard reminders" gap="3">
          <Spinner color="purple.fg" size="sm" />
          <Text color="fg.muted">Loading reminders…</Text>
        </Flex>
      )}

      {remindersQuery.isError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load reminders</Alert.Title>
            <Alert.Description>{getApiErrorMessage(remindersQuery.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button ml="auto" size="sm" variant="outline" onClick={() => remindersQuery.refetch()}>Retry</Button>
        </Alert.Root>
      )}

      {remindersQuery.isSuccess && remindersQuery.data.length === 0 && (
        <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p="5">
          <Text fontWeight="medium">No open reminders</Text>
          <Text color="fg.muted" fontSize="sm" mt="1">New follow-ups and deadlines will appear here.</Text>
        </Box>
      )}

      {remindersQuery.isSuccess && remindersQuery.data.length > 0 && (
        <ReminderGroups
          reminders={remindersQuery.data.slice(0, 3)}
          updatingId={updateReminder.isPending ? updateReminder.variables?.id : undefined}
          onComplete={(id) => updateReminder.mutate({ id, completed: true })}
        />
      )}
      {remindersQuery.isSuccess && remindersQuery.data.length > 3 && (
        <ChakraLink asChild alignSelf="start" color="purple.fg" fontSize="sm" fontWeight="semibold">
          <Link to="/calendar">View all {remindersQuery.data.length} reminders</Link>
        </ChakraLink>
      )}
    </Stack>
  )
}

function ReminderGroups({
  reminders,
  updatingId,
  onComplete,
}: {
  reminders: ReminderWithApplication[]
  updatingId?: string
  onComplete: (id: string) => void
}) {
  const { overdue, upcoming } = partitionOpenReminders(reminders)

  return (
    <Stack gap="5">
      {overdue.length > 0 && (
        <ReminderGroup
          heading="Overdue"
          reminders={overdue}
          updatingId={updatingId}
          onComplete={onComplete}
        />
      )}
      {upcoming.length > 0 && (
        <ReminderGroup
          heading="Upcoming"
          reminders={upcoming}
          updatingId={updatingId}
          onComplete={onComplete}
        />
      )}
    </Stack>
  )
}

function ReminderGroup({
  heading,
  reminders,
  updatingId,
  onComplete,
}: {
  heading: 'Overdue' | 'Upcoming'
  reminders: ReminderWithApplication[]
  updatingId?: string
  onComplete: (id: string) => void
}) {
  return (
    <Stack gap="3">
      <Heading as="h4" color={heading === 'Overdue' ? 'fg.error' : 'fg'} size="sm">
        {heading} ({reminders.length})
      </Heading>
      <Stack gap="3">
        {reminders.map((reminder) => (
          <Flex
            align={{ base: 'start', md: 'center' }}
            as="article"
            aria-label={reminder.description}
            bg="bg.panel"
            borderColor={heading === 'Overdue' ? 'border.error' : 'border'}
            borderRadius="xl"
            borderWidth="1px"
            direction={{ base: 'column', md: 'row' }}
            gap="4"
            justify="space-between"
            key={reminder.id}
            p="4"
          >
            <Stack gap="2">
              <Flex gap="2" wrap="wrap">
                <Badge colorPalette={heading === 'Overdue' ? 'red' : 'purple'}>{heading}</Badge>
                <Badge colorPalette={reminder.type === 'DEADLINE' ? 'purple' : 'blue'}>
                  {reminder.type === 'DEADLINE' ? 'Deadline' : 'Follow-up'}
                </Badge>
              </Flex>
              <Text fontWeight="medium">{reminder.description}</Text>
              <Text color="fg.subtle" fontSize="sm">
                Due {formatReminderDate(reminder.dueAt)} ·{' '}
                <ChakraLink asChild color="purple.fg">
                  <Link to={`/applications/${reminder.application.id}`}>
                    {reminder.application.company} — {reminder.application.jobTitle}
                  </Link>
                </ChakraLink>
              </Text>
            </Stack>
            <Button
              alignSelf={{ base: 'stretch', md: 'auto' }}
              loading={updatingId === reminder.id}
              size="sm"
              variant="outline"
              onClick={() => onComplete(reminder.id)}
            >
              Complete
            </Button>
          </Flex>
        ))}
      </Stack>
    </Stack>
  )
}
