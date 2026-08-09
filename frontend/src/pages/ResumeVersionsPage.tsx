import { Alert, Box, Button, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { DeleteResumeVersionDialog } from '../components/resumes/DeleteResumeVersionDialog'
import { ResumeVersionForm } from '../components/resumes/ResumeVersionForm'
import { useCreateResumeVersion } from '../hooks/useCreateResumeVersion'
import { useDeleteResumeVersion } from '../hooks/useDeleteResumeVersion'
import { useResumeVersions } from '../hooks/useResumeVersions'
import { useUpdateResumeVersion } from '../hooks/useUpdateResumeVersion'
import {
  emptyResumeVersionForm,
  resumeVersionFormToInput,
  resumeVersionToFormValues,
} from '../schemas/resume-version.schema'
import type { ResumeVersion } from '../types/resume'
import { getApiErrorMessage } from '../utils/apiError'

export function ResumeVersionsPage() {
  const resumeVersions = useResumeVersions()
  const createResumeVersion = useCreateResumeVersion()
  const updateResumeVersion = useUpdateResumeVersion()
  const deleteResumeVersion = useDeleteResumeVersion()
  const [editingId, setEditingId] = useState<string>()
  const mutationError = createResumeVersion.error ?? updateResumeVersion.error ?? deleteResumeVersion.error

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Heading as="h2" size="2xl">Resume versions</Heading>
        <Text color="fg.muted">Name the resume variants you use and keep their positioning notes together.</Text>
      </Stack>

      <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p={{ base: '5', md: '7' }}>
        <Stack gap="5">
          <Stack gap="1">
            <Heading as="h3" size="lg">Add resume version</Heading>
            <Text color="fg.muted" fontSize="sm">This stores version metadata only; document upload can be added separately.</Text>
          </Stack>
          <ResumeVersionForm
            initialValues={emptyResumeVersionForm}
            isSubmitting={createResumeVersion.isPending}
            resetAfterSubmit
            submitLabel="Add resume version"
            onSubmit={async (values) => {
              await createResumeVersion.mutateAsync(resumeVersionFormToInput(values))
            }}
          />
        </Stack>
      </Box>

      {mutationError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to save resume versions</Alert.Title>
            <Alert.Description>{getApiErrorMessage(mutationError, 'Please try again.')}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {resumeVersions.isPending && (
        <Flex align="center" aria-label="Loading resume versions" gap="3">
          <Spinner color="purple.fg" />
          <Text color="fg.muted">Loading resume versions…</Text>
        </Flex>
      )}

      {resumeVersions.isError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load resume versions</Alert.Title>
            <Alert.Description>{getApiErrorMessage(resumeVersions.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button ml="auto" size="sm" variant="outline" onClick={() => resumeVersions.refetch()}>Retry</Button>
        </Alert.Root>
      )}

      {resumeVersions.isSuccess && resumeVersions.data.length === 0 && (
        <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p="6">
          <Heading as="h3" size="md">No resume versions yet</Heading>
          <Text color="fg.muted" fontSize="sm" mt="1">Add the first version above, then select it on an application.</Text>
        </Box>
      )}

      {resumeVersions.isSuccess && resumeVersions.data.length > 0 && (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4">
          {resumeVersions.data.map((resumeVersion) => (
            <ResumeVersionCard
              editing={editingId === resumeVersion.id}
              isDeleting={deleteResumeVersion.isPending && deleteResumeVersion.variables === resumeVersion.id}
              isUpdating={updateResumeVersion.isPending && updateResumeVersion.variables?.id === resumeVersion.id}
              key={resumeVersion.id}
              resumeVersion={resumeVersion}
              onCancel={() => setEditingId(undefined)}
              onDelete={() => deleteResumeVersion.mutate(resumeVersion.id)}
              onEdit={() => setEditingId(resumeVersion.id)}
              onUpdate={async (values) => {
                await updateResumeVersion.mutateAsync({
                  id: resumeVersion.id,
                  input: resumeVersionFormToInput(values),
                })
                setEditingId(undefined)
              }}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}

function ResumeVersionCard({
  resumeVersion,
  editing,
  isDeleting,
  isUpdating,
  onCancel,
  onDelete,
  onEdit,
  onUpdate,
}: {
  resumeVersion: ResumeVersion
  editing: boolean
  isDeleting: boolean
  isUpdating: boolean
  onCancel: () => void
  onDelete: () => void
  onEdit: () => void
  onUpdate: Parameters<typeof ResumeVersionForm>[0]['onSubmit']
}) {
  return (
    <Box as="article" aria-label={resumeVersion.name} bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p="5">
      {editing ? (
        <ResumeVersionForm
          initialValues={resumeVersionToFormValues(resumeVersion)}
          isSubmitting={isUpdating}
          submitLabel="Save resume version"
          onCancel={onCancel}
          onSubmit={onUpdate}
        />
      ) : (
        <Stack gap="4">
          <Box>
            <Heading as="h3" size="md">{resumeVersion.name}</Heading>
            <Text color="fg.muted" fontSize="sm" mt="2">
              {resumeVersion.notes ?? 'No notes added.'}
            </Text>
          </Box>
          <Stack direction={{ base: 'column', sm: 'row' }} gap="2">
            <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
            <DeleteResumeVersionDialog
              isDeleting={isDeleting}
              name={resumeVersion.name}
              onConfirm={onDelete}
            />
          </Stack>
        </Stack>
      )}
    </Box>
  )
}
