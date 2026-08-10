import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Badge, Box, Button, Field, Flex, Heading, Input, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useBrowserExtensionTokens, useCreateBrowserExtensionToken, useRevokeBrowserExtensionToken } from '../hooks/useBrowserExtensionTokens'
import { getApiErrorMessage } from '../utils/apiError'
import { PageHeader } from '../components/ui/PageHeader'
import { CheckCircle2, Clipboard, Download, KeyRound, ScanSearch } from 'lucide-react'
import { useFeedback } from '../components/ui/feedback-context'

const tokenSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(80) })
type TokenForm = z.infer<typeof tokenSchema>

export function BrowserExtensionPage() {
  const tokens = useBrowserExtensionTokens()
  const createToken = useCreateBrowserExtensionToken()
  const revokeToken = useRevokeBrowserExtensionToken()
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const feedback = useFeedback()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TokenForm>({
    resolver: zodResolver(tokenSchema), defaultValues: { name: 'Chrome extension' },
  })

  const submit = handleSubmit(async ({ name }) => {
    const created = await createToken.mutateAsync(name)
    setCreatedToken(created.token)
    reset({ name })
  })

  return (
    <Stack gap="6">
      <PageHeader title="Browser extension" description="Capture job postings securely without sharing your password or browser session." eyebrow="Automation" />

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="3">
        {[{ label: 'Load the extension', icon: Download }, { label: 'Create and paste a token', icon: KeyRound }, { label: 'Review and capture a job', icon: ScanSearch }].map((step, index) => <Flex align="center" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="3" key={step.label} p="4"><Flex align="center" bg="purple.subtle" borderRadius="full" color="purple.fg" fontWeight="bold" h="9" justify="center" w="9"><step.icon aria-hidden size={18} /></Flex><Stack gap="0"><Text color="fg.subtle" fontSize="xs">Step {index + 1}</Text><Text fontSize="sm" fontWeight="semibold">{step.label}</Text></Stack></Flex>)}
      </SimpleGrid>

      <Stack as="form" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '8' }} onSubmit={submit}>
        <Box><Badge colorPalette="purple" mb="2" variant="subtle">Step 2</Badge><Heading as="h3" size="lg">Connect this browser</Heading><Text color="fg.muted" fontSize="sm" mt="1">Name the browser so you can recognize and revoke its access later.</Text></Box>
        <Field.Root invalid={Boolean(errors.name)}><Field.Label>Device name</Field.Label><Input {...register('name')} /><Field.ErrorText>{errors.name?.message}</Field.ErrorText></Field.Root>
        <Button alignSelf="start" colorPalette="purple" loading={createToken.isPending} type="submit">Create token</Button>
        {createToken.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{getApiErrorMessage(createToken.error, 'Could not create token.')}</Alert.Description></Alert.Root>}
        {createdToken && (
          <Alert.Root status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>Copy this token now</Alert.Title><Alert.Description>The complete token is shown once. Paste it into the extension settings.</Alert.Description><Input aria-label="New browser extension token" fontFamily="mono" readOnly value={createdToken} /><Button alignSelf="start" mt="2" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(createdToken); feedback.show('Token copied', { description: 'Paste it into the browser extension settings.' }) }}><Clipboard aria-hidden size={16} />Copy token</Button></Alert.Content></Alert.Root>
        )}
      </Stack>

      <Stack gap="3"><Flex align="center" justify="space-between"><Heading as="h3" size="lg">Connected browsers</Heading><Badge variant="subtle">{tokens.data?.length ?? 0} active</Badge></Flex>
        {tokens.isPending && <Spinner aria-label="Loading extension tokens" />}
        {tokens.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>Tokens could not be loaded.</Alert.Description></Alert.Root>}
        {tokens.isSuccess && tokens.data.length === 0 && <Text color="fg.muted">No extension tokens created.</Text>}
        {tokens.data?.map((token) => (
          <Flex key={token.id} align={{ base: 'start', sm: 'center' }} bg="bg.panel" borderColor="border" borderRadius="lg" borderWidth="1px" direction={{ base: 'column', sm: 'row' }} gap="3" justify="space-between" p="4">
            <Stack gap="1"><Flex align="center" gap="2"><CheckCircle2 aria-hidden color="var(--chakra-colors-green-fg)" size={17} /><Text fontWeight="semibold">{token.name}</Text></Flex><Text color="fg.subtle" fontFamily="mono" fontSize="sm">{token.tokenPrefix}…</Text><Text color="fg.muted" fontSize="sm">Expires {new Date(token.expiresAt).toLocaleDateString()}</Text></Stack>
            <Button colorPalette="red" loading={revokeToken.isPending} size="sm" variant="outline" onClick={() => revokeToken.mutate(token.id)}>Revoke</Button>
          </Flex>
        ))}
      </Stack>
    </Stack>
  )
}
