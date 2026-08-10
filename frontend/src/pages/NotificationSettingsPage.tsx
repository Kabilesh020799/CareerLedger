import { Alert, Badge, Box, Button, Flex, Heading, Stack, Switch, Text } from '@chakra-ui/react'
import { useBrowserPushSubscription, useNotificationSettings, useUpdateNotificationSettings } from '../hooks/useNotificationSettings'
import { getApiErrorMessage } from '../utils/apiError'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'

export function NotificationSettingsPage() {
  const settings = useNotificationSettings()
  const update = useUpdateNotificationSettings()
  const subscription = useBrowserPushSubscription()

  if (settings.isPending) return <LoadingSkeleton variant="cards" />
  if (settings.isError) return <Alert.Root status="error"><Alert.Indicator /><Alert.Title>Unable to load notification settings</Alert.Title><Button ml="auto" onClick={() => settings.refetch()}>Retry</Button></Alert.Root>

  const value = settings.data
  const toggleEmail = () => update.mutate({ emailEnabled: !value.emailEnabled, browserPushEnabled: value.browserPushEnabled })
  const toggleBrowser = async () => {
    if (!value.vapidPublicKey) return
    const enabled = !(value.browserPushEnabled && value.browserSubscribed)
    subscription.mutate({ enabled, publicKey: value.vapidPublicKey }, {
      onSuccess: () => update.mutate({ emailEnabled: value.emailEnabled, browserPushEnabled: enabled }),
    })
  }

  return <Stack gap="6">
    <PageHeader title="Notifications" description="Choose how Job Tracker alerts you when a reminder becomes due." eyebrow="Account" />
    {(update.isError || subscription.isError) && <Alert.Root status="error"><Alert.Indicator /><Alert.Title>{getApiErrorMessage(update.error ?? subscription.error, 'Unable to update notification delivery.')}</Alert.Title></Alert.Root>}
    <Stack gap="4">
      <ChannelCard title="Email reminders" description="Send due reminders to the email address on your account." available={value.emailAvailable} enabled={value.emailEnabled} loading={update.isPending} onToggle={toggleEmail} unavailable="An administrator must configure SMTP before email delivery can be enabled." />
      <ChannelCard title="Browser push" description="Receive reminders from this browser even when Job Tracker is not open." available={value.browserPushAvailable && 'serviceWorker' in navigator && 'PushManager' in window} enabled={value.browserPushEnabled && value.browserSubscribed} loading={subscription.isPending || update.isPending} onToggle={toggleBrowser} unavailable="Push notifications require HTTPS, browser support, and configured VAPID keys." />
    </Stack>
    <Text color="fg.subtle" fontSize="sm">A successful notification is recorded once per reminder and channel. Failed background deliveries retry automatically.</Text>
  </Stack>
}

function ChannelCard({ title, description, available, enabled, loading, onToggle, unavailable }: { title: string; description: string; available: boolean; enabled: boolean; loading: boolean; onToggle: () => void; unavailable: string }) {
  return <Flex align={{ base: 'start', sm: 'center' }} bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" direction={{ base: 'column', sm: 'row' }} gap="4" justify="space-between" p={{ base: '5', md: '6' }}>
    <Box><Flex align="center" gap="2"><Heading as="h3" size="md">{title}</Heading><Badge colorPalette={available ? enabled ? 'green' : 'gray' : 'orange'} variant="subtle">{available ? enabled ? 'Enabled' : 'Available' : 'Unavailable'}</Badge></Flex><Text color="fg.muted" mt="1">{description}</Text>{!available && <Text color="fg.warning" fontSize="sm" mt="2">{unavailable}</Text>}</Box>
    <Switch.Root checked={enabled} disabled={!available || loading} size="lg" onCheckedChange={onToggle}>
      <Switch.HiddenInput />
      <Switch.Control><Switch.Thumb /></Switch.Control>
      <Switch.Label>{title}: {enabled ? 'enabled' : 'disabled'}</Switch.Label>
    </Switch.Root>
  </Flex>
}
