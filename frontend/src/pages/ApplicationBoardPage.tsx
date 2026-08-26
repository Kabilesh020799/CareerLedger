import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Alert,
  Badge,
  Button,
  CloseButton,
  Dialog,
  Field,
  Flex,
  Heading,
  Input,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { ApplicationBoard } from '../components/applications/ApplicationBoard'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'
import { useApplicationBoard } from '../hooks/useApplicationBoard'
import { useCancelScheduledSprint } from '../hooks/useCancelScheduledSprint'
import { useMoveApplication } from '../hooks/useMoveApplication'
import { useScheduleSprint } from '../hooks/useScheduleSprint'
import { useScheduledSprints, useSprintTimelineNow } from '../hooks/useScheduledSprints'
import { useStartSprint } from '../hooks/useStartSprint'
import { useUpdateScheduledSprint } from '../hooks/useUpdateScheduledSprint'
import type {
  ApplicationStatus,
  ScheduleSprintInput,
  Sprint,
  StartSprintInput,
  UpdateScheduledSprintInput,
} from '../types/application'
import { getApiErrorMessage } from '../utils/apiError'
import {
  calculatedSprintEndAt,
  earliestFutureSprintDate,
  formatSprintDate,
  formatSprintDateTime,
  getLocalSprintTimeZone,
  localSprintDateInputToIso,
  nextAvailableSprintDate,
  toLocalSprintDateInput,
} from '../utils/sprint'

const DEFAULT_SPRINT_DURATION_DAYS = 14
const MAX_SPRINT_DURATION_DAYS = 90

const sprintStartSchema = z.object({
  name: z.string().trim().max(100, 'Sprint name must contain at most 100 characters'),
  durationDays: z.number({ error: 'Enter a sprint duration' })
    .int('Sprint duration must be a whole number of days')
    .min(1, 'Sprint duration must be at least 1 day')
    .max(MAX_SPRINT_DURATION_DAYS, `Sprint duration must be ${MAX_SPRINT_DURATION_DAYS} days or fewer`),
})

const sprintScheduleSchema = z.object({
  name: z.string().trim().max(100, 'Sprint name must contain at most 100 characters'),
  durationDays: z.number({ error: 'Enter a sprint duration' })
    .int('Sprint duration must be a whole number of days')
    .min(1, 'Sprint duration must be at least 1 day')
    .max(MAX_SPRINT_DURATION_DAYS, `Sprint duration must be ${MAX_SPRINT_DURATION_DAYS} days or fewer`),
  startsAt: z.string()
    .min(1, 'Choose when the sprint should start')
    .refine((value) => {
      const timestamp = new Date(`${value}T00:00:00`).getTime()
      return Number.isFinite(timestamp) && timestamp > Date.now()
    }, 'Scheduled start must be in the future'),
})

type SprintStartFormValues = z.infer<typeof sprintStartSchema>
type SprintScheduleFormValues = z.infer<typeof sprintScheduleSchema>

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function useSprintHasEnded(endsAt?: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!endsAt) return undefined
    const endTimestamp = Date.parse(endsAt)
    if (!Number.isFinite(endTimestamp)) return undefined

    let timeoutId: number | undefined
    const refresh = () => {
      setNow(Date.now())
      const remaining = endTimestamp - Date.now()
      if (remaining > 0) {
        timeoutId = window.setTimeout(refresh, Math.min(remaining + 10, 86_400_000))
      }
    }

    refresh()
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [endsAt])

  if (!endsAt) return false
  const endTimestamp = Date.parse(endsAt)
  return Number.isFinite(endTimestamp) && endTimestamp <= now
}

function sprintStartErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error, 'Please try again.')
  if (!axios.isAxiosError<{ error?: string; endsAt?: string; scheduledStartAt?: string }>(error)) return message
  if (error.response?.status !== 409) return message
  if (error.response.data?.scheduledStartAt) {
    return `${message} The scheduled sprint starts at ${formatSprintDateTime(error.response.data.scheduledStartAt)}.`
  }
  if (!error.response.data?.endsAt) return message

  return `${message} The current sprint remains active until ${formatSprintDateTime(error.response.data.endsAt)}.`
}

function defaultSprintFormValues(sprint: Sprint | null): SprintStartFormValues {
  return {
    name: '',
    durationDays: sprint?.durationDays ?? DEFAULT_SPRINT_DURATION_DAYS,
  }
}

function defaultSprintScheduleValues(
  currentSprint: Sprint | null,
  scheduledSprints: Sprint[],
  scheduledSprint?: Sprint | null,
): SprintScheduleFormValues {
  if (scheduledSprint) {
    return {
      name: scheduledSprint.name,
      durationDays: scheduledSprint.durationDays,
      startsAt: toLocalSprintDateInput(scheduledSprint.scheduledStartAt),
    }
  }

  return {
    name: '',
    durationDays: currentSprint?.durationDays ?? scheduledSprints[scheduledSprints.length - 1]?.durationDays ?? DEFAULT_SPRINT_DURATION_DAYS,
    startsAt: nextAvailableSprintDate(currentSprint, scheduledSprints),
  }
}

export function ApplicationBoardPage() {
  const boardQuery = useApplicationBoard()
  const scheduledQuery = useScheduledSprints()
  const moveApplication = useMoveApplication()
  const scheduleSprint = useScheduleSprint()
  const updateScheduledSprint = useUpdateScheduledSprint()
  const cancelScheduledSprint = useCancelScheduledSprint()
  const startSprint = useStartSprint()
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [editingScheduledSprint, setEditingScheduledSprint] = useState<Sprint | null>(null)
  const [cancelingScheduledSprint, setCancelingScheduledSprint] = useState<Sprint | null>(null)
  const currentSprint = boardQuery.data?.sprint ?? null
  const scheduledSprints = scheduledQuery.data ?? []
  const sprintHasEnded = useSprintHasEnded(currentSprint?.endsAt)
  const timelineNow = useSprintTimelineNow()
  const canStartNewSprint = sprintHasEnded && scheduledQuery.isSuccess && scheduledSprints.length === 0
  const nextDueScheduledSprint = scheduledSprints.find((scheduledSprint) => {
    const timestamp = Date.parse(scheduledSprint.scheduledStartAt ?? '')
    return Number.isFinite(timestamp) && timestamp <= timelineNow
  })
  const sprintForm = useForm<SprintStartFormValues>({
    resolver: zodResolver(sprintStartSchema),
    defaultValues: defaultSprintFormValues(null),
  })
  const scheduleForm = useForm<SprintScheduleFormValues>({
    resolver: zodResolver(sprintScheduleSchema),
    defaultValues: defaultSprintScheduleValues(null, []),
  })
  const scheduleMinimumDate = editingScheduledSprint
    ? earliestFutureSprintDate()
    : nextAvailableSprintDate(currentSprint, scheduledSprints)

  const move = (id: string, status: ApplicationStatus) => {
    moveApplication.mutate({ id, status })
  }

  const openStartDialog = () => {
    startSprint.reset()
    sprintForm.reset(defaultSprintFormValues(currentSprint))
    setIsStartDialogOpen(true)
  }

  const closeStartDialog = () => {
    if (startSprint.isError) startSprint.reset()
    setIsStartDialogOpen(false)
  }

  const openScheduleDialog = (scheduledSprint?: Sprint) => {
    scheduleSprint.reset()
    updateScheduledSprint.reset()
    setEditingScheduledSprint(scheduledSprint ?? null)
    scheduleForm.reset(defaultSprintScheduleValues(currentSprint, scheduledSprints, scheduledSprint))
    setIsScheduleDialogOpen(true)
  }

  const closeScheduleDialog = () => {
    if (scheduleSprint.isError) scheduleSprint.reset()
    if (updateScheduledSprint.isError) updateScheduledSprint.reset()
    setIsScheduleDialogOpen(false)
    setEditingScheduledSprint(null)
  }

  const closeCancelDialog = () => {
    if (cancelScheduledSprint.isError) cancelScheduledSprint.reset()
    setCancelingScheduledSprint(null)
  }

  const submitStartSprint = (values: SprintStartFormValues) => {
    const input: StartSprintInput = {
      durationDays: values.durationDays,
    }
    const name = values.name.trim()
    if (name) input.name = name

    startSprint.mutate(input, {
      onSuccess: () => setIsStartDialogOpen(false),
    })
  }

  const submitScheduleSprint = (values: SprintScheduleFormValues) => {
    const startsAt = localSprintDateInputToIso(values.startsAt)
    const name = values.name.trim()
    if (editingScheduledSprint) {
      const input: UpdateScheduledSprintInput = {
        durationDays: values.durationDays,
        startsAt,
      }
      if (name) input.name = name

      updateScheduledSprint.mutate({ id: editingScheduledSprint.id, input }, {
        onSuccess: () => closeScheduleDialog(),
      })
      return
    }

    const input: ScheduleSprintInput = { startsAt, durationDays: values.durationDays }
    if (name) input.name = name

    scheduleSprint.mutate(input, { onSuccess: () => closeScheduleDialog() })
  }

  const confirmCancelScheduledSprint = () => {
    if (!cancelingScheduledSprint) return
    cancelScheduledSprint.mutate(cancelingScheduledSprint.id, {
      onSuccess: () => closeCancelDialog(),
    })
  }

  const canStartScheduledSprint = !currentSprint || sprintHasEnded

  const startScheduledSprint = (scheduledSprintId: string) => {
    startSprint.reset()
    startSprint.mutate({ scheduledSprintId })
  }

  return (
    <Stack gap="6">
      <PageHeader title="Application board" description="Move opportunities through each stage of your pipeline." action={{ label: 'Add application', to: '/applications/new' }} />

      {boardQuery.isSuccess && (
        <Flex align={{ base: 'start', sm: 'center' }} bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" justify="space-between" p="4" wrap="wrap">
          <Stack gap="1">
            <Text color="fg.muted" fontSize="sm">Current sprint</Text>
            {currentSprint ? (
              <Flex align="center" gap="2" wrap="wrap">
                <Heading as="h2" size="md">{currentSprint.name}</Heading>
                <Badge colorPalette="green">Active</Badge>
                <Text color="fg.muted" fontSize="sm">Sprint {currentSprint.sequence}</Text>
                <Text color="fg.muted" fontSize="sm">{boardQuery.data.applications.length} application{boardQuery.data.applications.length === 1 ? '' : 's'}</Text>
              </Flex>
            ) : (
              <Heading as="h2" size="md">No active sprint</Heading>
            )}
            <Text color="fg.muted" fontSize="sm">
              {currentSprint ? 'Rejected applications stay archived when this sprint closes; other applications carry forward.' : 'Start a sprint to organize the applications already in your pipeline.'}
            </Text>
            {currentSprint && (
              <>
                <Text color="fg.muted" fontSize="sm">
                  Duration: {countLabel(currentSprint.durationDays ?? DEFAULT_SPRINT_DURATION_DAYS, 'day', 'days')} · Ends {currentSprint.endsAt ? formatSprintDateTime(currentSprint.endsAt) : 'date unavailable'}
                </Text>
                <Text
                  id="sprint-transition-status"
                  aria-live="polite"
                  color={sprintHasEnded ? 'fg.success' : 'fg.muted'}
                  fontSize="sm"
                >
                  {sprintHasEnded
                    ? scheduledSprints.length > 0
                      ? 'This sprint has ended. Start the next due plan from Upcoming sprints.'
                      : 'This sprint has ended. You can start the next sprint when you are ready.'
                    : `The current sprint remains active until ${currentSprint.endsAt ? formatSprintDateTime(currentSprint.endsAt) : 'its configured end date'}. You can start the next sprint after that time.`}
                </Text>
              </>
            )}
          </Stack>
          <Flex gap="2" wrap="wrap">
            {currentSprint && (
              <Button
                aria-describedby="sprint-transition-status"
                colorPalette="brand"
                disabled={!canStartNewSprint}
                loading={startSprint.isPending}
                onClick={openStartDialog}
              >
                Start new sprint
              </Button>
            )}
            {currentSprint && (
              <Button variant="outline" onClick={() => openScheduleDialog()}>Schedule sprint</Button>
            )}
          </Flex>
        </Flex>
      )}

      {currentSprint && sprintHasEnded && (
        <Alert.Root aria-live="polite" borderRadius="lg" status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Sprint ended</Alert.Title>
            <Alert.Description>
              {nextDueScheduledSprint
                ? `${currentSprint.name} has ended. The next scheduled sprint is ready to start.`
                : scheduledQuery.isSuccess && scheduledSprints.length > 0
                  ? `${currentSprint.name} has ended. Review the upcoming timeline and start the next plan when its date arrives.`
                  : `${currentSprint.name} has ended. Start the next sprint when you are ready.`}
            </Alert.Description>
          </Alert.Content>
          {scheduledQuery.isSuccess && nextDueScheduledSprint && (
            <Button
              colorPalette="brand"
              loading={startSprint.isPending && startSprint.variables?.scheduledSprintId === nextDueScheduledSprint.id}
              onClick={() => startScheduledSprint(nextDueScheduledSprint.id)}
            >
              Start next sprint
            </Button>
          )}
          {scheduledQuery.isSuccess && !nextDueScheduledSprint && scheduledSprints.length > 0 && (
            <Button asChild variant="outline">
              <a href="#upcoming-sprints-heading">View upcoming sprints</a>
            </Button>
          )}
          {scheduledQuery.isSuccess && scheduledSprints.length === 0 && (
            <Button colorPalette="brand" loading={startSprint.isPending} onClick={openStartDialog}>
              Start next sprint
            </Button>
          )}
        </Alert.Root>
      )}

      <Dialog.Root
        open={isStartDialogOpen}
        onOpenChange={(details) => {
          if (!details.open && !startSprint.isPending) closeStartDialog()
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxH="calc(100dvh - 2rem)" maxW={{ base: 'calc(100vw - 2rem)', sm: 'lg' }} overflowY="auto">
              <form noValidate onSubmit={sprintForm.handleSubmit(submitStartSprint)}>
                <Dialog.Header>
                  <Dialog.Title>{currentSprint ? 'Configure the next sprint' : 'Configure your first sprint'}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Stack gap="4">
                    <Text color="fg.muted" fontSize="sm">
                      {currentSprint
                        ? 'Choose how long the next sprint should run. The current sprint will close and unfinished applications will carry over only after its end date.'
                        : 'Set a name and duration for the first sprint. Applications already in your pipeline will be included.'}
                    </Text>
                    <Field.Root invalid={Boolean(sprintForm.formState.errors.name)}>
                      <Field.Label>Sprint name (optional)</Field.Label>
                      <Input maxLength={100} {...sprintForm.register('name')} />
                      <Field.ErrorText>{sprintForm.formState.errors.name?.message}</Field.ErrorText>
                    </Field.Root>
                    <Field.Root invalid={Boolean(sprintForm.formState.errors.durationDays)} required>
                      <Field.Label>Sprint duration (days)</Field.Label>
                      <Input
                        inputMode="numeric"
                        max={MAX_SPRINT_DURATION_DAYS}
                        min={1}
                        type="number"
                        {...sprintForm.register('durationDays', { valueAsNumber: true })}
                      />
                      <Field.HelperText>Use a whole number from 1 to {MAX_SPRINT_DURATION_DAYS} days.</Field.HelperText>
                      <Field.ErrorText>{sprintForm.formState.errors.durationDays?.message}</Field.ErrorText>
                    </Field.Root>
                    {startSprint.isError && (
                      <Alert.Root role="alert" status="error">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>Unable to start sprint</Alert.Title>
                          <Alert.Description>{sprintStartErrorMessage(startSprint.error)}</Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    )}
                  </Stack>
                </Dialog.Body>
                <Dialog.Footer alignItems={{ base: 'stretch', sm: 'center' }} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
                  <Button type="button" variant="outline" w={{ base: 'full', sm: 'auto' }} onClick={closeStartDialog}>Cancel</Button>
                  <Button colorPalette="brand" loading={startSprint.isPending} type="submit" w={{ base: 'full', sm: 'auto' }}>Start sprint</Button>
                </Dialog.Footer>
              </form>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close sprint configuration" size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root
        open={isScheduleDialogOpen}
        onOpenChange={(details) => {
          if (!details.open && !scheduleSprint.isPending) closeScheduleDialog()
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxH="calc(100dvh - 2rem)" maxW={{ base: 'calc(100vw - 2rem)', sm: 'lg' }} overflowY="auto">
              <form noValidate onSubmit={scheduleForm.handleSubmit(submitScheduleSprint)}>
                <Dialog.Header>
                  <Dialog.Title>{editingScheduledSprint ? 'Edit scheduled sprint' : 'Schedule a sprint'}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Stack gap="4">
                    <Text color="fg.muted" fontSize="sm">
                      {editingScheduledSprint
                        ? 'Correct the sprint plan before it starts. Its application assignments will remain unchanged.'
                        : 'Plan an upcoming sprint by date. You will start the scheduled sprint when its start date arrives and the current sprint has ended.'}
                    </Text>
                    <Field.Root invalid={Boolean(scheduleForm.formState.errors.name)}>
                      <Field.Label>Sprint name (optional)</Field.Label>
                      <Input maxLength={100} {...scheduleForm.register('name')} />
                      <Field.ErrorText>{scheduleForm.formState.errors.name?.message}</Field.ErrorText>
                    </Field.Root>
                    <Field.Root invalid={Boolean(scheduleForm.formState.errors.durationDays)} required>
                      <Field.Label>Sprint duration (days)</Field.Label>
                      <Input
                        inputMode="numeric"
                        max={MAX_SPRINT_DURATION_DAYS}
                        min={1}
                        type="number"
                        {...scheduleForm.register('durationDays', { valueAsNumber: true })}
                      />
                      <Field.HelperText>Use a whole number from 1 to {MAX_SPRINT_DURATION_DAYS} days.</Field.HelperText>
                      <Field.ErrorText>{scheduleForm.formState.errors.durationDays?.message}</Field.ErrorText>
                    </Field.Root>
                    <Field.Root invalid={Boolean(scheduleForm.formState.errors.startsAt)} required>
                      <Field.Label>
                        Scheduled start <Text as="span" color="fg.muted" fontSize="sm" fontWeight="normal">({getLocalSprintTimeZone()})</Text>
                      </Field.Label>
                      <Input min={scheduleMinimumDate} type="date" {...scheduleForm.register('startsAt')} />
                      <Field.HelperText>Starts at midnight in {getLocalSprintTimeZone()}. Choose a future date.</Field.HelperText>
                      <Field.ErrorText>{scheduleForm.formState.errors.startsAt?.message}</Field.ErrorText>
                    </Field.Root>
                    {(scheduleSprint.isError || updateScheduledSprint.isError) && (
                      <Alert.Root role="alert" status="error">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{editingScheduledSprint ? 'Unable to update sprint' : 'Unable to schedule sprint'}</Alert.Title>
                          <Alert.Description>
                            {getApiErrorMessage(
                              editingScheduledSprint ? updateScheduledSprint.error : scheduleSprint.error,
                              'Please check the details and try again.',
                            )}
                          </Alert.Description>
                        </Alert.Content>
                      </Alert.Root>
                    )}
                  </Stack>
                </Dialog.Body>
                <Dialog.Footer alignItems={{ base: 'stretch', sm: 'center' }} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
                  <Button type="button" variant="outline" w={{ base: 'full', sm: 'auto' }} onClick={closeScheduleDialog}>Cancel</Button>
                  <Button
                    colorPalette="brand"
                    loading={scheduleSprint.isPending || updateScheduledSprint.isPending}
                    type="submit"
                    w={{ base: 'full', sm: 'auto' }}
                  >
                    {editingScheduledSprint ? 'Save changes' : 'Schedule sprint'}
                  </Button>
                </Dialog.Footer>
              </form>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close sprint scheduling" size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(cancelingScheduledSprint)}
        role="alertdialog"
        onOpenChange={(details) => {
          if (!details.open && !cancelScheduledSprint.isPending) closeCancelDialog()
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxH="calc(100dvh - 2rem)" maxW={{ base: 'calc(100vw - 2rem)', sm: 'md' }} overflowY="auto">
              <Dialog.Header>
                <Dialog.Title>Cancel scheduled sprint?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="3">
                  <Text>
                    {cancelingScheduledSprint
                      ? `${cancelingScheduledSprint.name} will be removed from your upcoming sprint timeline. Application assignments will not change.`
                      : 'This sprint will be removed from your upcoming sprint timeline.'}
                  </Text>
                  {cancelScheduledSprint.isError && (
                    <Alert.Root role="alert" status="error">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>Unable to cancel sprint</Alert.Title>
                        <Alert.Description>{getApiErrorMessage(cancelScheduledSprint.error, 'Please try again.')}</Alert.Description>
                      </Alert.Content>
                    </Alert.Root>
                  )}
                </Stack>
              </Dialog.Body>
              <Dialog.Footer alignItems={{ base: 'stretch', sm: 'center' }} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
                <Button disabled={cancelScheduledSprint.isPending} type="button" variant="outline" w={{ base: 'full', sm: 'auto' }} onClick={closeCancelDialog}>Keep sprint</Button>
                <Button colorPalette="red" loading={cancelScheduledSprint.isPending} type="button" w={{ base: 'full', sm: 'auto' }} onClick={confirmCancelScheduledSprint}>Cancel sprint</Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton aria-label="Close sprint cancellation" size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {startSprint.isError && !isStartDialogOpen && (
        <Alert.Root role="alert" status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to start sprint</Alert.Title>
            <Alert.Description>{sprintStartErrorMessage(startSprint.error)}</Alert.Description>
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

      {scheduleSprint.isSuccess && scheduleSprint.data && (
        <Alert.Root aria-live="polite" status="success" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Sprint scheduled</Alert.Title>
            <Alert.Description>{scheduleSprint.data.name} was added to your upcoming sprint timeline.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {updateScheduledSprint.isSuccess && updateScheduledSprint.data && (
        <Alert.Root aria-live="polite" status="success" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Sprint updated</Alert.Title>
            <Alert.Description>{updateScheduledSprint.data.name} was updated in your upcoming sprint timeline.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {cancelScheduledSprint.isSuccess && (
        <Alert.Root aria-live="polite" status="success" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Sprint canceled</Alert.Title>
            <Alert.Description>The sprint was removed from your upcoming timeline.</Alert.Description>
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

      {boardQuery.isSuccess && !currentSprint && (
        <Stack align="center" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="3" p={{ base: '8', md: '12' }} textAlign="center">
          <Heading as="h3" size="lg">Start your first sprint</Heading>
          <Text color="fg.muted">Applications already in your pipeline will be included when you start. Schedule future sprints after this one is active.</Text>
          <Button
            colorPalette="brand"
            disabled={!scheduledQuery.isSuccess || scheduledSprints.length > 0}
            onClick={openStartDialog}
            loading={startSprint.isPending}
          >
            Start sprint
          </Button>
        </Stack>
      )}

      {boardQuery.isSuccess && currentSprint && boardQuery.data.applications.length === 0 && (
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

      {boardQuery.isSuccess && currentSprint && boardQuery.data.applications.length > 0 && (
        <ApplicationBoard
          applications={boardQuery.data.applications}
          movingApplicationId={moveApplication.isPending ? moveApplication.variables?.id : undefined}
          onMove={move}
        />
      )}

      <Stack
        aria-labelledby="upcoming-sprints-heading"
        as="section"
        bg="bg.panel"
        borderColor="border"
        borderRadius="xl"
        borderWidth="1px"
        gap="4"
        p={{ base: '5', md: '6' }}
      >
        <Stack gap="1">
          <Heading as="h2" id="upcoming-sprints-heading" size="lg">Upcoming sprints</Heading>
          <Text color="fg.muted" fontSize="sm">Plan future work and start each sprint when its scheduled window is ready.</Text>
        </Stack>

        {scheduledQuery.isPending && (
          <LoadingSkeleton label="Loading upcoming sprints" />
        )}

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
            {scheduledSprints.map((scheduledSprint) => {
              const startTimestamp = Date.parse(scheduledSprint.scheduledStartAt ?? '')
              const startHasArrived = Number.isFinite(startTimestamp) && startTimestamp <= timelineNow
              const endAt = calculatedSprintEndAt(scheduledSprint)
              const canStart = startHasArrived && canStartScheduledSprint
              const isStarting = startSprint.isPending && startSprint.variables?.scheduledSprintId === scheduledSprint.id

              return (
                <Flex
                  align={{ base: 'start', sm: 'center' }}
                  aria-label={`${scheduledSprint.name}, upcoming sprint`}
                  as="article"
                  borderColor="border"
                  borderRadius="lg"
                  borderWidth="1px"
                  direction={{ base: 'column', sm: 'row' }}
                  gap="4"
                  justify="space-between"
                  key={scheduledSprint.id}
                  p="4"
                >
                  <Stack gap="1">
                    <Flex align="center" gap="2" wrap="wrap">
                      <Heading as="h3" size="md">{scheduledSprint.name}</Heading>
                      <Badge colorPalette="blue">Scheduled</Badge>
                    </Flex>
                    <Text color="fg.muted" fontSize="sm">
                      Duration: {countLabel(scheduledSprint.durationDays, 'day', 'days')}
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                      Scheduled start: {scheduledSprint.scheduledStartAt ? formatSprintDate(scheduledSprint.scheduledStartAt) : 'date unavailable'} · {getLocalSprintTimeZone()}
                    </Text>
                    <Text color="fg.muted" fontSize="sm">
                      Ends: {endAt ? formatSprintDateTime(endAt) : 'date unavailable'}
                    </Text>
                  </Stack>
                  <Flex align={{ base: 'start', sm: 'center' }} gap="2" justify="flex-end" wrap="wrap">
                    {canStart ? (
                      <Button
                        colorPalette="brand"
                        loading={isStarting}
                        onClick={() => startScheduledSprint(scheduledSprint.id)}
                      >
                        Start scheduled sprint
                      </Button>
                    ) : (
                      <Text color="fg.muted" fontSize="sm">
                        {startHasArrived ? 'Ready after the current sprint ends.' : 'Waiting for the scheduled start time.'}
                      </Text>
                    )}
                    <Button
                      aria-label={`Edit scheduled sprint ${scheduledSprint.name}`}
                      size="sm"
                      variant="outline"
                      onClick={() => openScheduleDialog(scheduledSprint)}
                    >
                      Edit
                    </Button>
                    <Button
                      aria-label={`Cancel scheduled sprint ${scheduledSprint.name}`}
                      colorPalette="red"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        cancelScheduledSprint.reset()
                        setCancelingScheduledSprint(scheduledSprint)
                      }}
                    >
                      Cancel
                    </Button>
                  </Flex>
                </Flex>
              )
            })}
          </Stack>
        )}
      </Stack>

    </Stack>
  )
}
