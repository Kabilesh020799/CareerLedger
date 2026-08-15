import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Badge, Box, Button, Field, Flex, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useWorkspace, workspaceQueryKey } from '../contexts/WorkspaceContext'
import { workspaceService } from '../services/workspace.service'
import { PageHeader } from '../components/ui/PageHeader'
import { getApiErrorMessage } from '../utils/apiError'

const inviteSchema = z.object({ email: z.email('Enter a valid email address') })
const workspaceSchema = z.object({ name: z.string().trim().min(1, 'Enter a workspace name').max(80, 'Use 80 characters or fewer') })
type InviteForm = z.infer<typeof inviteSchema>
type WorkspaceForm = z.infer<typeof workspaceSchema>

export function TeamSettingsPage() {
  const { workspaceId, memberships } = useWorkspace()
  const client = useQueryClient()
  const [token, setToken] = useState<string | null>(null)
  const selected = memberships?.find((item) => item.workspace.id === workspaceId)
  const inviteForm = useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '' } })
  const workspaceForm = useForm<WorkspaceForm>({ resolver: zodResolver(workspaceSchema), defaultValues: { name: '' } })
  const members = useQuery({ queryKey: ['workspace', workspaceId, 'members'], queryFn: () => workspaceService.members(workspaceId!), enabled: Boolean(workspaceId) })
  const invite = useMutation({ mutationFn: ({ email }: InviteForm) => workspaceService.invite(workspaceId!, { email, role: 'MEMBER' }), onSuccess: (value) => { setToken(value.token ?? null); inviteForm.reset(); void client.invalidateQueries({ queryKey: ['workspace', workspaceId] }) } })
  const create = useMutation({ mutationFn: ({ name }: WorkspaceForm) => workspaceService.create(name.trim()), onSuccess: () => { workspaceForm.reset(); void client.invalidateQueries({ queryKey: workspaceQueryKey }) } })

  if (!workspaceId) return <Text>Loading workspace…</Text>
  const error = invite.error ?? members.error ?? create.error

  return <Stack gap="7" maxW="5xl">
    <PageHeader title="Team workspace" description={`Manage access to ${selected?.workspace.name ?? 'this workspace'} and create separate workspaces when needed.`} eyebrow="Settings" />
    {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Workspace action failed</Alert.Title><Alert.Description>{getApiErrorMessage(error, 'Please try again.')}</Alert.Description></Alert.Content></Alert.Root>}
    <SimpleGrid columns={{ base: 1, xl: 2 }} gap="6">
      <form aria-label="Create invitation" noValidate onSubmit={inviteForm.handleSubmit((values) => invite.mutate(values))}><Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" h="full" p={{ base: '5', md: '6' }}>
        <Box><Text fontSize="lg" fontWeight="semibold">Create an invitation</Text><Text color="fg.muted" fontSize="sm">Generate a one-time invitation token to share securely with a collaborator.</Text></Box>
        <Field.Root invalid={Boolean(inviteForm.formState.errors.email)} required><Field.Label>Email address</Field.Label><Input type="email" autoComplete="email" {...inviteForm.register('email')} /><Field.ErrorText>{inviteForm.formState.errors.email?.message}</Field.ErrorText></Field.Root>
        <Button alignSelf="start" colorPalette="purple" type="submit" loading={invite.isPending}>Create invitation</Button>
        {token && <Alert.Root status="info"><Alert.Indicator /><Alert.Content><Alert.Title>Copy this invitation now</Alert.Title><Alert.Description>This token is shown once. Send it to the collaborator through a trusted channel.</Alert.Description><Box as="code" bg="bg.muted" borderRadius="md" mt="2" overflowWrap="anywhere" p="3">{token}</Box></Alert.Content></Alert.Root>}
      </Stack></form>
      <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '6' }}>
        <Box><Text fontSize="lg" fontWeight="semibold">Current members</Text><Text color="fg.muted" fontSize="sm">People who can access this workspace.</Text></Box>
        {members.isPending && <Text color="fg.muted">Loading members…</Text>}
        {members.data?.map((member) => <Flex align="center" borderColor="border.muted" borderTopWidth="1px" gap="3" justify="space-between" key={member.user.id} pt="3"><Box minW="0"><Text fontWeight="medium" truncate>{member.user.name ?? member.user.email}</Text>{member.user.name && <Text color="fg.subtle" fontSize="xs" truncate>{member.user.email}</Text>}</Box><Badge variant="subtle">{member.role}</Badge></Flex>)}
      </Stack>
    </SimpleGrid>
    <Box asChild maxW="xl"><form aria-label="Create workspace" noValidate onSubmit={workspaceForm.handleSubmit((values) => create.mutate(values))}><Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '6' }}>
      <Box><Text fontSize="lg" fontWeight="semibold">Create another workspace</Text><Text color="fg.muted" fontSize="sm">Separate a different job search or team from this workspace.</Text></Box>
      <Field.Root invalid={Boolean(workspaceForm.formState.errors.name)} required><Field.Label>Workspace name</Field.Label><Input {...workspaceForm.register('name')} /><Field.ErrorText>{workspaceForm.formState.errors.name?.message}</Field.ErrorText></Field.Root>
      <Button alignSelf="start" type="submit" variant="outline" loading={create.isPending}>Create workspace</Button>
    </Stack></form></Box>
  </Stack>
}
