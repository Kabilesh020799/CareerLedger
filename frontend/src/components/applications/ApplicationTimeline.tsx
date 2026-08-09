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
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { useApplicationEvents } from '../../hooks/useApplicationEvents'
import { useCreateApplicationEvent } from '../../hooks/useCreateApplicationEvent'
import {
  applicationEventFormSchema,
  applicationEventFormToInput,
  emptyApplicationEventForm,
  type ApplicationEventFormValues,
} from '../../schemas/application-event.schema'
import type { ApplicationEvent } from '../../types/application'
import { getApiErrorMessage } from '../../utils/apiError'
import { StatusBadge } from './StatusBadge'

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function ApplicationTimeline({ applicationId }: { applicationId: string }) {
  const eventsQuery = useApplicationEvents(applicationId)
  const createEvent = useCreateApplicationEvent()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationEventFormValues>({
    resolver: zodResolver(applicationEventFormSchema),
    defaultValues: emptyApplicationEventForm(),
  })

  async function submit(values: ApplicationEventFormValues) {
    await createEvent.mutateAsync({
      applicationId,
      input: applicationEventFormToInput(values),
    })
    reset(emptyApplicationEventForm())
  }

  return (
    <Box bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" p={{ base: '5', md: '8' }}>
      <Stack gap="7">
        <Box>
          <Heading as="h3" size="lg">Application timeline</Heading>
          <Text color="fg.muted" mt="1">Record notes and review status changes over time.</Text>
        </Box>

        <form onSubmit={handleSubmit(submit)} noValidate>
          <Stack gap="4">
            {createEvent.isError && (
              <Alert.Root status="error" borderRadius="md">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Unable to add timeline note</Alert.Title>
                  <Alert.Description>
                    {getApiErrorMessage(createEvent.error, 'Please try again.')}
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            <Field.Root invalid={Boolean(errors.description)} required>
              <Field.Label>Note<Field.RequiredIndicator /></Field.Label>
              <Textarea
                {...register('description')}
                minH="6rem"
                placeholder="Add an update, conversation, or next step…"
                resize="vertical"
              />
              <Field.ErrorText>{errors.description?.message}</Field.ErrorText>
            </Field.Root>

            <Flex align="end" direction={{ base: 'column', sm: 'row' }} gap="4">
              <Field.Root invalid={Boolean(errors.occurredAt)} required maxW={{ sm: '14rem' }}>
                <Field.Label>Occurrence date<Field.RequiredIndicator /></Field.Label>
                <Input {...register('occurredAt')} type="date" />
                <Field.ErrorText>{errors.occurredAt?.message}</Field.ErrorText>
              </Field.Root>
              <Button colorPalette="purple" loading={createEvent.isPending} type="submit">
                Add note
              </Button>
            </Flex>
          </Stack>
        </form>

        <TimelineEntries
          events={eventsQuery.data}
          error={eventsQuery.isError ? eventsQuery.error : undefined}
          isPending={eventsQuery.isPending}
          onRetry={() => eventsQuery.refetch()}
        />
      </Stack>
    </Box>
  )
}

type TimelineEntriesProps = {
  events?: ApplicationEvent[]
  error?: Error
  isPending: boolean
  onRetry: () => void
}

function TimelineEntries({ events, error, isPending, onRetry }: TimelineEntriesProps) {
  if (isPending) {
    return (
      <Flex align="center" gap="3" aria-label="Loading application timeline">
        <Spinner color="purple.fg" size="sm" />
        <Text color="fg.muted">Loading timeline…</Text>
      </Flex>
    )
  }

  if (error) {
    return (
      <Alert.Root status="error" borderRadius="md">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to load timeline</Alert.Title>
          <Alert.Description>{getApiErrorMessage(error, 'Please try again.')}</Alert.Description>
        </Alert.Content>
        <Button ml="auto" size="sm" variant="outline" onClick={onRetry}>Retry</Button>
      </Alert.Root>
    )
  }

  if (!events?.length) {
    return (
      <Box bg="bg.subtle" borderRadius="lg" p="5">
        <Text fontWeight="medium">No timeline activity yet</Text>
        <Text color="fg.muted" fontSize="sm" mt="1">Add a note or change the application status to begin its history.</Text>
      </Box>
    )
  }

  return (
    <Stack as="ol" gap="0" listStyleType="none">
      {events.map((event) => (
        <Box
          as="li"
          key={event.id}
          borderLeftWidth="2px"
          borderColor={event.type === 'STATUS_CHANGE' ? 'purple.emphasized' : 'border.emphasized'}
          pb="6"
          pl="5"
          position="relative"
          _last={{ pb: '0' }}
        >
          <Box
            aria-hidden="true"
            bg={event.type === 'STATUS_CHANGE' ? 'purple.solid' : 'bg.emphasized'}
            borderRadius="full"
            boxSize="2.5"
            left="-1.5"
            position="absolute"
            top="1.5"
          />
          <Flex align="center" gap="3" justify="space-between" wrap="wrap">
            <Badge colorPalette={event.type === 'STATUS_CHANGE' ? 'purple' : 'gray'}>
              {event.type === 'STATUS_CHANGE' ? 'Status change' : 'Note'}
            </Badge>
            <Text color="fg.subtle" fontSize="sm">{formatEventDate(event.occurredAt)}</Text>
          </Flex>
          <Text mt="2">{event.description}</Text>
          {event.fromStatus && event.toStatus && (
            <Flex align="center" gap="2" mt="3">
              <StatusBadge status={event.fromStatus} />
              <Text aria-hidden="true" color="fg.subtle">→</Text>
              <StatusBadge status={event.toStatus} />
            </Flex>
          )}
        </Box>
      ))}
    </Stack>
  )
}
