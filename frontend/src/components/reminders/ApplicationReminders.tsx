import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { useApplicationReminders } from '../../hooks/useApplicationReminders'
import { useCreateReminder } from '../../hooks/useCreateReminder'
import { useDeleteReminder } from '../../hooks/useDeleteReminder'
import { useUpdateReminder } from '../../hooks/useUpdateReminder'
import {
  emptyReminderForm,
  reminderFormSchema,
  reminderFormToInput,
  type ReminderFormValues,
} from '../../schemas/reminder.schema'
import type { Reminder } from '../../types/reminder'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatReminderDate, isReminderOverdue } from '../../utils/reminder'
import { DeleteReminderDialog } from './DeleteReminderDialog'

export function ApplicationReminders({ applicationId }: { applicationId: string }) {
  const remindersQuery = useApplicationReminders(applicationId)
  const createReminder = useCreateReminder()
  const updateReminder = useUpdateReminder()
  const deleteReminder = useDeleteReminder()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: emptyReminderForm(),
  })

  async function submit(values: ReminderFormValues) {
    await createReminder.mutateAsync({
      applicationId,
      input: reminderFormToInput(values),
    })
    reset(emptyReminderForm())
  }

  const mutationError =
    createReminder.error ?? updateReminder.error ?? deleteReminder.error

  return (
    <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p={{ base: '5', md: '8' }}>
      <Stack gap="7">
        <Box>
          <Heading as="h3" size="lg">Reminders</Heading>
          <Text color="fg.muted" mt="1">Schedule follow-ups and important application deadlines.</Text>
        </Box>

        {mutationError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Unable to update reminders</Alert.Title>
              <Alert.Description>
                {getApiErrorMessage(mutationError, 'Please try again.')}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <form onSubmit={handleSubmit(submit)} noValidate>
          <Stack gap="4">
            <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
              <Field.Root invalid={Boolean(errors.type)} required>
                <Field.Label>Reminder type<Field.RequiredIndicator /></Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field {...register('type')}>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="DEADLINE">Deadline</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Field.ErrorText>{errors.type?.message}</Field.ErrorText>
              </Field.Root>

              <Field.Root invalid={Boolean(errors.description)} required>
                <Field.Label>Description<Field.RequiredIndicator /></Field.Label>
                <Input
                  {...register('description')}
                  placeholder="Contact recruiter or submit assessment"
                />
                <Field.ErrorText>{errors.description?.message}</Field.ErrorText>
              </Field.Root>

              <Field.Root invalid={Boolean(errors.dueAt)} required>
                <Field.Label>Due date and time<Field.RequiredIndicator /></Field.Label>
                <Input {...register('dueAt')} type="datetime-local" />
                <Field.ErrorText>{errors.dueAt?.message}</Field.ErrorText>
              </Field.Root>
            </SimpleGrid>

            <Button
              alignSelf="start"
              colorPalette="purple"
              loading={createReminder.isPending}
              type="submit"
            >
              Add reminder
            </Button>
          </Stack>
        </form>

        <ReminderEntries
          reminders={remindersQuery.data}
          error={remindersQuery.isError ? remindersQuery.error : undefined}
          isPending={remindersQuery.isPending}
          deletingId={deleteReminder.isPending ? deleteReminder.variables : undefined}
          updatingId={updateReminder.isPending ? updateReminder.variables?.id : undefined}
          onDelete={(id) => deleteReminder.mutate(id)}
          onRetry={() => remindersQuery.refetch()}
          onToggle={(reminder) => updateReminder.mutate({
            id: reminder.id,
            completed: !reminder.completedAt,
          })}
        />
      </Stack>
    </Box>
  )
}

type ReminderEntriesProps = {
  reminders?: Reminder[]
  error?: unknown
  isPending: boolean
  deletingId?: string
  updatingId?: string
  onDelete: (id: string) => void
  onRetry: () => void
  onToggle: (reminder: Reminder) => void
}

function ReminderEntries({
  reminders,
  error,
  isPending,
  deletingId,
  updatingId,
  onDelete,
  onRetry,
  onToggle,
}: ReminderEntriesProps) {
  if (isPending) {
    return (
      <Flex align="center" aria-label="Loading application reminders" gap="3">
        <Spinner color="purple.fg" size="sm" />
        <Text color="fg.muted">Loading reminders…</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <Alert.Root status="error" borderRadius="md">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to load reminders</Alert.Title>
          <Alert.Description>{getApiErrorMessage(error, 'Please try again.')}</Alert.Description>
        </Alert.Content>
        <Button ml="auto" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
      </Alert.Root>
    )
  }

  if (!reminders?.length) {
    return (
      <Box bg="bg.subtle" borderRadius="lg" p="5">
        <Text fontWeight="medium">No reminders yet</Text>
        <Text color="fg.muted" fontSize="sm" mt="1">Add a follow-up or deadline to keep this application moving.</Text>
      </Box>
    )
  }

  return (
    <Stack gap="3">
      {reminders.map((reminder) => {
        const status = reminderStatus(reminder)
        return (
          <Stack
            as="article"
            aria-label={reminder.description}
            bg="bg.subtle"
            borderRadius="lg"
            gap="3"
            key={reminder.id}
            opacity={reminder.completedAt ? 0.7 : 1}
            p="4"
          >
            <Flex align="start" gap="3" justify="space-between" wrap="wrap">
              <Stack gap="2">
                <Flex gap="2" wrap="wrap">
                  <Badge colorPalette={reminder.type === 'DEADLINE' ? 'purple' : 'blue'}>
                    {reminder.type === 'DEADLINE' ? 'Deadline' : 'Follow-up'}
                  </Badge>
                  <Badge colorPalette={status === 'Overdue' ? 'red' : status === 'Completed' ? 'green' : 'purple'}>
                    {status}
                  </Badge>
                </Flex>
                <Text fontWeight="medium">{reminder.description}</Text>
                <Text color="fg.subtle" fontSize="sm">Due {formatReminderDate(reminder.dueAt)}</Text>
              </Stack>
              <Flex gap="2">
                <Button
                  loading={updatingId === reminder.id}
                  size="sm"
                  variant="outline"
                  onClick={() => onToggle(reminder)}
                >
                  {reminder.completedAt ? 'Reopen' : 'Complete'}
                </Button>
                <DeleteReminderDialog
                  isDeleting={deletingId === reminder.id}
                  onConfirm={() => onDelete(reminder.id)}
                />
              </Flex>
            </Flex>
          </Stack>
        )
      })}
    </Stack>
  )
}

function reminderStatus(reminder: Reminder) {
  if (reminder.completedAt) return 'Completed'
  return isReminderOverdue(reminder) ? 'Overdue' : 'Upcoming'
}
