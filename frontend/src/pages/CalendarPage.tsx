import { Alert, Badge, Box, Button, Flex, Heading, Input, Spinner, Stack, Text } from '@chakra-ui/react'
import { CalendarDays, Clipboard, Download, Link2, RotateCw, Unlink } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { useFeedback } from '../components/ui/feedback-context'
import { useCalendarSubscription, useCreateCalendarSubscription, useDownloadCalendar, useRevokeCalendarSubscription } from '../hooks/useCalendar'
import { getApiErrorMessage } from '../utils/apiError'

/** Lets users download a calendar snapshot or manage a renewable calendar feed. */
export function CalendarPage() {
  const status = useCalendarSubscription()
  const create = useCreateCalendarSubscription()
  const revoke = useRevokeCalendarSubscription()
  const download = useDownloadCalendar()
  const feedback = useFeedback()
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null)
  const error = status.error ?? create.error ?? revoke.error ?? download.error

  async function createFeed() {
    const result = await create.mutateAsync()
    setSubscriptionUrl(result.url)
  }

  async function revokeFeed() {
    await revoke.mutateAsync()
    setSubscriptionUrl(null)
    feedback.show('Calendar subscription revoked')
  }

  async function copyFeed() {
    if (!subscriptionUrl) return
    await navigator.clipboard.writeText(subscriptionUrl)
    feedback.show('Calendar link copied', { description: 'Paste it into your calendar app as a subscribed calendar.' })
  }

  return (
    <Stack gap="6">
      <PageHeader title="Calendar" description="Keep interview milestones and application deadlines alongside the rest of your schedule." eyebrow="Automation" />

      {error && <Alert.Root status="error" borderRadius="lg"><Alert.Indicator /><Alert.Content><Alert.Title>Calendar action failed</Alert.Title><Alert.Description>{getApiErrorMessage(error, 'Please try again.')}</Alert.Description></Alert.Content></Alert.Root>}

      <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p={{ base: '5', md: '8' }}>
        <Flex align={{ base: 'start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="5" justify="space-between">
          <Flex align="start" gap="4"><Flex align="center" bg="purple.subtle" borderRadius="lg" color="purple.fg" h="11" justify="center" w="11"><Download aria-hidden size={21} /></Flex><Stack gap="1"><Heading as="h2" size="lg">Download calendar</Heading><Text color="fg.muted">Export a current snapshot as an .ics file for Apple Calendar, Google Calendar, Outlook, or another calendar app.</Text></Stack></Flex>
          <Button colorPalette="purple" loading={download.isPending} minW={{ sm: '10rem' }} onClick={() => download.mutate()}>Download .ics</Button>
        </Flex>
      </Box>

      <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="5" p={{ base: '5', md: '8' }}>
        <Flex align="start" gap="4"><Flex align="center" bg="blue.subtle" borderRadius="lg" color="blue.fg" h="11" justify="center" w="11"><CalendarDays aria-hidden size={21} /></Flex><Box><Flex align="center" gap="2" wrap="wrap"><Heading as="h2" size="lg">Subscribe for updates</Heading>{status.data && <Badge colorPalette={status.data.active ? 'green' : 'gray'}>{status.data.active ? 'Active' : 'Inactive'}</Badge>}</Flex><Text color="fg.muted" mt="1">A subscription stays updated as deadlines and interview milestones change. Calendar apps choose how often they refresh it.</Text></Box></Flex>

        {status.isPending && <Flex align="center" gap="3"><Spinner size="sm" /><Text color="fg.muted">Loading subscription…</Text></Flex>}

        {subscriptionUrl && <Alert.Root status="warning" borderRadius="lg"><Alert.Indicator /><Alert.Content><Alert.Title>Copy this private link now</Alert.Title><Alert.Description>It is shown only after creation. Anyone with this link can view your calendar events.</Alert.Description><Input aria-label="Calendar subscription URL" fontFamily="mono" mt="3" readOnly value={subscriptionUrl} /><Button alignSelf="start" mt="3" size="sm" variant="outline" onClick={copyFeed}><Clipboard aria-hidden size={16} />Copy link</Button></Alert.Content></Alert.Root>}

        {status.data && <Flex gap="3" wrap="wrap">
          <Button colorPalette="purple" loading={create.isPending} onClick={createFeed}>{status.data.active ? <RotateCw aria-hidden size={17} /> : <Link2 aria-hidden size={17} />}{status.data.active ? 'Replace subscription link' : 'Create subscription link'}</Button>
          {status.data.active && <Button colorPalette="red" loading={revoke.isPending} variant="outline" onClick={revokeFeed}><Unlink aria-hidden size={17} />Revoke link</Button>}
        </Flex>}
        <Text color="fg.subtle" fontSize="sm">Replacing or revoking the link immediately stops the previous link from receiving updates.</Text>
      </Stack>
    </Stack>
  )
}
