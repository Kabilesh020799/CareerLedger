import { Alert, Button, Flex, Heading, NativeSelect, Spinner, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DisconnectGmailDialog } from '../components/gmail/DisconnectGmailDialog'
import { GmailUpdateReviewCard } from '../components/gmail/GmailUpdateReviewCard'
import { useApplicationOptions } from '../hooks/useApplicationOptions'
import { useDisconnectGmail } from '../hooks/useDisconnectGmail'
import { useGmailStatus } from '../hooks/useGmailStatus'
import { useGmailUpdateReviews } from '../hooks/useGmailUpdateReviews'
import { useSyncGmail } from '../hooks/useSyncGmail'
import { useUpdateGmailSchedule } from '../hooks/useUpdateGmailSchedule'
import type { GmailSyncInterval } from '../types/gmail'
import { gmailConnectUrl } from '../services/gmail.service'
import { getApiErrorMessage } from '../utils/apiError'

const authorizationErrors: Record<string, string> = {
  denied: 'Gmail access was not approved.',
  oauth: 'Google could not complete Gmail authorization. Please try again.',
  state: 'Gmail authorization expired or could not be verified. Please try again.',
}

export function GmailSyncPage() {
  const statusQuery = useGmailStatus()
  const synchronize = useSyncGmail()
  const disconnect = useDisconnectGmail()
  const updateSchedule = useUpdateGmailSchedule()
  const [intervalMinutes, setIntervalMinutes] = useState<GmailSyncInterval>(60)
  const connected = Boolean(statusQuery.data?.connected)
  const reviewsQuery = useGmailUpdateReviews(connected)
  const applicationsQuery = useApplicationOptions(connected)
  const [searchParams] = useSearchParams()
  const authorizationError = searchParams.get('error')
  const automaticSync = statusQuery.data?.automaticSync ?? {
    enabled: false,
    intervalMinutes: 60 as GmailSyncInterval,
    lastAttemptAt: null,
    lastError: null,
  }

  useEffect(() => {
    setIntervalMinutes(automaticSync.intervalMinutes)
  }, [automaticSync.intervalMinutes])

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Heading as="h2" size="2xl">Gmail synchronization</Heading>
        <Text color="fg.muted">
          Synchronize Gmail, review detected recruitment updates, and decide what changes your applications.
        </Text>
      </Stack>

      {searchParams.get('connected') === 'true' && (
        <Alert.Root status="success" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Gmail connected</Alert.Title>
            <Alert.Description>Run a synchronization when you are ready.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {authorizationError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Gmail authorization failed</Alert.Title>
            <Alert.Description>
              {authorizationErrors[authorizationError] ?? 'Please try connecting Gmail again.'}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {statusQuery.isPending && (
        <Flex align="center" aria-label="Loading Gmail status" justify="center" minH="18rem">
          <Spinner color="purple.fg" size="xl" />
        </Flex>
      )}

      {statusQuery.isError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load Gmail status</Alert.Title>
            <Alert.Description>{getApiErrorMessage(statusQuery.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => statusQuery.refetch()}>
            Retry
          </Button>
        </Alert.Root>
      )}

      {statusQuery.isSuccess && !statusQuery.data.configured && (
        <Alert.Root status="info" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Gmail integration is unavailable</Alert.Title>
            <Alert.Description>
              An administrator must configure Google OAuth credentials and a Gmail callback URL.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {statusQuery.isSuccess && statusQuery.data.configured && !statusQuery.data.connected && (
        <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '6', md: '8' }}>
          <Heading as="h3" size="lg">Connect Gmail</Heading>
          <Text color="fg.muted">
            Job Tracker requests read-only message metadata access and stores authorization securely on the server. Google may ask you to approve this restricted Gmail scope.
          </Text>
          <Button alignSelf="start" asChild colorPalette="purple">
            <a href={gmailConnectUrl}>Authorize Gmail</a>
          </Button>
        </Stack>
      )}

      {statusQuery.isSuccess && statusQuery.data.connected && (
        <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="5" p={{ base: '6', md: '8' }}>
          <Stack gap="1">
            <Heading as="h3" size="lg">Connected account</Heading>
            <Text fontWeight="semibold">{statusQuery.data.gmailEmail}</Text>
            <Text color="fg.muted" fontSize="sm">
              {statusQuery.data.lastSyncedAt
                ? `Last synchronized ${formatDateTime(statusQuery.data.lastSyncedAt)}`
                : 'Not synchronized yet'}
            </Text>
            <Text color="fg.subtle" fontSize="sm">
              {statusQuery.data.synchronizedMessages} unique message reference{statusQuery.data.synchronizedMessages === 1 ? '' : 's'} stored
            </Text>
          </Stack>

          {synchronize.isSuccess && (
            <Alert.Root status="success" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Synchronization complete</Alert.Title>
                <Alert.Description>
                  {synchronize.data.newMessages} new and {synchronize.data.duplicateMessages} previously stored message{synchronize.data.fetchedMessages === 1 ? '' : 's'} processed by {synchronize.data.synchronizationType} synchronization.
                  {' '}{synchronize.data.analyzedMessages} message{synchronize.data.analyzedMessages === 1 ? '' : 's'} checked and {synchronize.data.detectedUpdates} new recruitment update{synchronize.data.detectedUpdates === 1 ? '' : 's'} added for review.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {synchronize.isError && (
            <Alert.Root status="error" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Synchronization failed</Alert.Title>
                <Alert.Description>{getApiErrorMessage(synchronize.error, 'Gmail could not be synchronized. Try again.')}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {disconnect.isError && (
            <Alert.Root status="error" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Could not disconnect Gmail</Alert.Title>
                <Alert.Description>{getApiErrorMessage(disconnect.error, 'Please try again.')}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <Flex align={{ base: 'stretch', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="3">
            <Button colorPalette="purple" loading={synchronize.isPending} onClick={() => synchronize.mutate()}>
              Sync now
            </Button>
            <DisconnectGmailDialog
              isDisconnecting={disconnect.isPending}
              onConfirm={() => disconnect.mutate()}
            />
          </Flex>

          <Stack borderColor="border" borderRadius="lg" borderWidth="1px" gap="3" p="4">
            <Heading as="h4" size="md">Automatic synchronization</Heading>
            <Text color="fg.muted" fontSize="sm">
              A background worker checks only Gmail history newer than the last successful synchronization. Temporary failures retry automatically.
            </Text>
            <Flex align={{ base: 'stretch', sm: 'end' }} direction={{ base: 'column', sm: 'row' }} gap="3">
              <Stack flex="1" gap="1">
                <Text fontSize="sm" fontWeight="medium">Check Gmail every</Text>
                <NativeSelect.Root disabled={automaticSync.enabled || updateSchedule.isPending}>
                  <NativeSelect.Field
                    id="gmail-sync-interval"
                    aria-label="Automatic synchronization interval"
                    value={intervalMinutes}
                    onChange={(event) => setIntervalMinutes(Number(event.target.value) as GmailSyncInterval)}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="180">3 hours</option>
                    <option value="360">6 hours</option>
                    <option value="720">12 hours</option>
                    <option value="1440">24 hours</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Stack>
              <Button
                loading={updateSchedule.isPending}
                variant={automaticSync.enabled ? 'outline' : 'solid'}
                onClick={() => updateSchedule.mutate({
                  enabled: !automaticSync.enabled,
                  intervalMinutes: automaticSync.enabled
                    ? automaticSync.intervalMinutes
                    : intervalMinutes,
                })}
              >
                {automaticSync.enabled ? 'Disable automatic sync' : 'Enable automatic sync'}
              </Button>
            </Flex>
            <Text color="fg.subtle" fontSize="sm">
              {automaticSync.enabled
                ? `Enabled every ${formatInterval(automaticSync.intervalMinutes)}.`
                : 'Automatic synchronization is disabled.'}
            </Text>
            {automaticSync.lastAttemptAt && (
              <Text color="fg.subtle" fontSize="sm">
                Last automatic attempt {formatDateTime(automaticSync.lastAttemptAt)}.
              </Text>
            )}
            {automaticSync.lastError && (
              <Alert.Root status="warning" borderRadius="md">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Automatic synchronization will retry</Alert.Title>
                  <Alert.Description>{automaticSync.lastError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}
            {updateSchedule.isError && (
              <Alert.Root status="error" borderRadius="md">
                <Alert.Indicator />
                <Alert.Content><Alert.Description>{getApiErrorMessage(updateSchedule.error, 'Could not update the schedule.')}</Alert.Description></Alert.Content>
              </Alert.Root>
            )}
          </Stack>
        </Stack>
      )}

      {statusQuery.isSuccess && statusQuery.data.connected && (
        <Stack gap="4">
          <Stack gap="1">
            <Heading as="h3" size="xl">Pending Gmail updates</Heading>
            <Text color="fg.muted">
              Nothing changes until you confirm a suggestion. You can correct the application and status first.
            </Text>
          </Stack>

          {reviewsQuery.isPending && (
            <Flex align="center" aria-label="Loading Gmail updates" justify="center" minH="12rem">
              <Spinner color="purple.fg" size="lg" />
            </Flex>
          )}

          {reviewsQuery.isError && (
            <Alert.Root status="error" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Unable to load Gmail updates</Alert.Title>
                <Alert.Description>{getApiErrorMessage(reviewsQuery.error, 'Please try again.')}</Alert.Description>
              </Alert.Content>
              <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => reviewsQuery.refetch()}>
                Retry
              </Button>
            </Alert.Root>
          )}

          {applicationsQuery.isError && (
            <Alert.Root status="warning" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Application choices are unavailable</Alert.Title>
                <Alert.Description>You can retry or create a new application from a suggestion.</Alert.Description>
              </Alert.Content>
              <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => applicationsQuery.refetch()}>
                Retry
              </Button>
            </Alert.Root>
          )}

          {reviewsQuery.isSuccess && reviewsQuery.data.length === 0 && (
            <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="2" p={{ base: '6', md: '8' }}>
              <Heading as="h4" size="md">Review queue is clear</Heading>
              <Text color="fg.muted">Run a synchronization whenever you want to check for new recruitment updates.</Text>
            </Stack>
          )}

          {reviewsQuery.data?.map((review) => (
            <GmailUpdateReviewCard
              key={review.id}
              review={review}
              applications={applicationsQuery.data ?? []}
              applicationsLoading={applicationsQuery.isPending}
            />
          ))}
        </Stack>
      )}

      <Text color="fg.subtle" fontSize="sm">
        Synchronization reads message metadata and a transient snippet for deterministic classification. Message bodies and snippets are not stored, and only detected recruitment updates retain the subject and sender needed for review.
      </Text>
    </Stack>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatInterval(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`
  const hours = minutes / 60
  return `${hours} hour${hours === 1 ? '' : 's'}`
}
