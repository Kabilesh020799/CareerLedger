import { Alert, Badge, Box, Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useWorkspace, workspaceQueryKey } from '../contexts/WorkspaceContext'
import { workspaceService } from '../services/workspace.service'
import { PageHeader } from '../components/ui/PageHeader'
import { getApiErrorMessage } from '../utils/apiError'

export function TeamSettingsPage() {
  const { workspaceId, memberships } = useWorkspace()
  const client = useQueryClient()
  const [email, setEmail] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const selected = memberships?.find((item) => item.workspace.id === workspaceId)
  const members = useQuery({ queryKey: ['workspace', workspaceId, 'members'], queryFn: () => workspaceService.members(workspaceId!), enabled: Boolean(workspaceId) })
  const invite = useMutation({ mutationFn: () => workspaceService.invite(workspaceId!, { email, role: 'MEMBER' }), onSuccess: (value) => { setToken(value.token ?? null); setEmail(''); void client.invalidateQueries({ queryKey: ['workspace', workspaceId] }) } })
  const create = useMutation({ mutationFn: (name: string) => workspaceService.create(name), onSuccess: () => { setWorkspaceName(''); void client.invalidateQueries({ queryKey: workspaceQueryKey }) } })

  if (!workspaceId) return <Text>Loading workspace…</Text>
  const error = invite.error ?? members.error ?? create.error

  return <Stack gap="7">
    <PageHeader title="Team workspace" description={`Invite collaborators and review access to ${selected?.workspace.name ?? 'this workspace'}.`} eyebrow="Settings" />
    {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Workspace action failed</Alert.Title><Alert.Description>{getApiErrorMessage(error, 'Please try again.')}</Alert.Description></Alert.Content></Alert.Root>}
    <Flex align="start" direction={{ base: 'column', xl: 'row' }} gap="6">
      <Stack as="form" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" flex="1" gap="4" p={{ base: '5', md: '7' }} w="full" onSubmit={(event) => { event.preventDefault(); invite.mutate() }}>
        <Box><Text fontSize="lg" fontWeight="semibold">Invite a collaborator</Text><Text color="fg.muted" fontSize="sm">They will receive member access after accepting the one-time invitation.</Text></Box>
        <Field.Root required><Field.Label>Email address</Field.Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field.Root>
        <Button alignSelf="start" colorPalette="purple" type="submit" disabled={!email} loading={invite.isPending}>Create invitation</Button>
        {token && <Alert.Root status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>Copy this invitation now</Alert.Title><Alert.Description>This one-time token is shown only after creation.</Alert.Description><Box as="code" bg="bg.muted" borderRadius="md" mt="2" overflowWrap="anywhere" p="3">{token}</Box></Alert.Content></Alert.Root>}
      </Stack>
      <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" flex="1" gap="4" p={{ base: '5', md: '7' }} w="full">
        <Box><Text fontSize="lg" fontWeight="semibold">Members</Text><Text color="fg.muted" fontSize="sm">People who can currently access this workspace.</Text></Box>
        {members.isPending && <Text color="fg.muted">Loading members…</Text>}
        {members.data?.map((member) => <Flex align="center" borderColor="border.muted" borderTopWidth="1px" gap="3" justify="space-between" key={member.user.id} pt="3"><Text fontWeight="medium">{member.user.name ?? member.user.email}</Text><Badge>{member.role}</Badge></Flex>)}
      </Stack>
    </Flex>
    <Stack as="form" bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" maxW="2xl" p={{ base: '5', md: '7' }} onSubmit={(event) => { event.preventDefault(); if (workspaceName.trim()) create.mutate(workspaceName.trim()) }}>
      <Box><Text fontSize="lg" fontWeight="semibold">Create another workspace</Text><Text color="fg.muted" fontSize="sm">Keep a separate job search or team in its own workspace.</Text></Box>
      <Field.Root required><Field.Label>Workspace name</Field.Label><Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} /></Field.Root>
      <Button alignSelf="start" type="submit" variant="outline" disabled={!workspaceName.trim()} loading={create.isPending}>Create workspace</Button>
    </Stack>
  </Stack>
}
