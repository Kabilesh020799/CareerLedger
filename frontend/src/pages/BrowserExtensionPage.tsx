import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, Flex, Heading, Input, Spinner, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useBrowserExtensionTokens, useCreateBrowserExtensionToken, useRevokeBrowserExtensionToken } from '../hooks/useBrowserExtensionTokens'
import { getApiErrorMessage } from '../utils/apiError'

const tokenSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(80) })
type TokenForm = z.infer<typeof tokenSchema>

export function BrowserExtensionPage() {
  const tokens = useBrowserExtensionTokens()
  const createToken = useCreateBrowserExtensionToken()
  const revokeToken = useRevokeBrowserExtensionToken()
  const [createdToken, setCreatedToken] = useState<string | null>(null)
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
      <Stack gap="1"><Heading as="h2" size="2xl">Browser extension</Heading><Text color="fg.muted">Create revocable access for capturing job postings without sharing your password or browser session.</Text></Stack>

      <Stack as="form" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '8' }} onSubmit={submit}>
        <Heading as="h3" size="lg">Create extension token</Heading>
        <Field.Root invalid={Boolean(errors.name)}><Field.Label>Device name</Field.Label><Input {...register('name')} /><Field.ErrorText>{errors.name?.message}</Field.ErrorText></Field.Root>
        <Button alignSelf="start" colorPalette="purple" loading={createToken.isPending} type="submit">Create token</Button>
        {createToken.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{getApiErrorMessage(createToken.error, 'Could not create token.')}</Alert.Description></Alert.Root>}
        {createdToken && (
          <Alert.Root status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>Copy this token now</Alert.Title><Alert.Description>The complete token is shown once. Paste it into the extension settings.</Alert.Description><Input aria-label="New browser extension token" fontFamily="mono" readOnly value={createdToken} /></Alert.Content></Alert.Root>
        )}
      </Stack>

      <Stack gap="3"><Heading as="h3" size="lg">Active tokens</Heading>
        {tokens.isPending && <Spinner aria-label="Loading extension tokens" />}
        {tokens.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>Tokens could not be loaded.</Alert.Description></Alert.Root>}
        {tokens.isSuccess && tokens.data.length === 0 && <Text color="fg.muted">No extension tokens created.</Text>}
        {tokens.data?.map((token) => (
          <Flex key={token.id} align={{ base: 'start', sm: 'center' }} bg="bg.panel" borderColor="border" borderRadius="lg" borderWidth="1px" direction={{ base: 'column', sm: 'row' }} gap="3" justify="space-between" p="4">
            <Stack gap="1"><Text fontWeight="semibold">{token.name}</Text><Text color="fg.subtle" fontFamily="mono" fontSize="sm">{token.tokenPrefix}…</Text><Text color="fg.muted" fontSize="sm">Expires {new Date(token.expiresAt).toLocaleDateString()}</Text></Stack>
            <Button colorPalette="red" loading={revokeToken.isPending} size="sm" variant="outline" onClick={() => revokeToken.mutate(token.id)}>Revoke</Button>
          </Flex>
        ))}
      </Stack>
    </Stack>
  )
}
