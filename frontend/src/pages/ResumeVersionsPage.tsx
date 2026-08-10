import { Alert, Box, Button, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { DeleteResumeVersionDialog } from '../components/resumes/DeleteResumeVersionDialog'
import { ResumeVersionForm } from '../components/resumes/ResumeVersionForm'
import { useDeleteResumeVersion } from '../hooks/useDeleteResumeVersion'
import { useResumeVersions } from '../hooks/useResumeVersions'
import { useUploadedResumes } from '../hooks/useUploadedResumes'
import { useUpdateResumeVersion } from '../hooks/useUpdateResumeVersion'
import {
  resumeVersionFormToInput,
  resumeVersionToFormValues,
} from '../schemas/resume-version.schema'
import type { ResumeVersion } from '../types/resume'
import { getApiErrorMessage } from '../utils/apiError'
import { PageHeader } from '../components/ui/PageHeader'
import { ResumePreviewDialog } from '../components/resumes/ResumePreviewDialog'

export function ResumeVersionsPage() {
  const resumeVersions = useResumeVersions()
  const uploadedResumes = useUploadedResumes()
  const updateResumeVersion = useUpdateResumeVersion()
  const deleteResumeVersion = useDeleteResumeVersion()
  const [editingId, setEditingId] = useState<string>()
  const mutationError = updateResumeVersion.error ?? deleteResumeVersion.error

  return (
    <Stack gap="7">
      <PageHeader title="Resumes" description="View uploaded documents and organize reusable résumé versions." eyebrow="Documents" />

      <Stack gap="4">
        <Stack gap="1">
          <Heading as="h3" size="lg">Uploaded resumes</Heading>
          <Text color="fg.muted" fontSize="sm">Your uploaded documents remain private and can be viewed from their application.</Text>
        </Stack>

        {uploadedResumes.isPending && (
          <Flex align="center" aria-label="Loading uploaded resumes" gap="3">
            <Spinner color="purple.fg" />
            <Text color="fg.muted">Loading uploaded resumes…</Text>
          </Flex>
        )}

        {uploadedResumes.isError && (
          <Alert.Root status="error" borderRadius="md">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Unable to load uploaded resumes</Alert.Title>
              <Alert.Description>{getApiErrorMessage(uploadedResumes.error, 'Please try again.')}</Alert.Description>
            </Alert.Content>
            <Button ml="auto" size="sm" variant="outline" onClick={() => uploadedResumes.refetch()}>Retry</Button>
          </Alert.Root>
        )}

        {uploadedResumes.isSuccess && uploadedResumes.data.length === 0 && (
          <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p="6">
            <Heading as="h3" size="md">No uploaded resumes yet</Heading>
            <Text color="fg.muted" fontSize="sm" mt="1">Upload a resume while creating or editing an application.</Text>
          </Box>
        )}

        {uploadedResumes.isSuccess && uploadedResumes.data.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            {uploadedResumes.data.map((resume) => (
              <Box as="article" aria-label={resume.fileName} bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" key={resume.id} p="5">
                <Stack gap="3">
                  <Box>
                    <Heading as="h4" size="md">{resume.fileName}</Heading>
                    <Text color="fg.muted" fontSize="sm" mt="1">{resume.application.jobTitle} · {resume.application.company}</Text>
                    <Text color="fg.muted" fontSize="xs" mt="2">{formatResumeSize(resume.size)} · Uploaded {formatResumeDate(resume.createdAt)}</Text>
                  </Box>
                  <ResumePreviewDialog resume={resume} />
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Stack>

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
          <Text color="fg.muted" fontSize="sm" mt="1">Uploaded documents will appear in the library above.</Text>
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

function formatResumeSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatResumeDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
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
