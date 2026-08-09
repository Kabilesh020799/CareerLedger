import { Alert, Button, Flex, Heading, Spinner, Stack, Text } from '@chakra-ui/react'
import { useSearchParams } from 'react-router-dom'
import { DisconnectGmailDialog } from '../components/gmail/DisconnectGmailDialog'
import { useDisconnectGmail } from '../hooks/useDisconnectGmail'
import { useGmailStatus } from '../hooks/useGmailStatus'
import { useSyncGmail } from '../hooks/useSyncGmail'
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
  const [searchParams] = useSearchParams()
  const authorizationError = searchParams.get('error')

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Heading as="h2" size="2xl">Gmail synchronization</Heading>
        <Text color="fg.muted">
          Connect Gmail and manually collect new message references without changing your applications.
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
        </Stack>
      )}

      <Text color="fg.subtle" fontSize="sm">
        Synchronization currently records provider message identifiers for deduplication. It does not read message bodies, classify email, or update applications.
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
