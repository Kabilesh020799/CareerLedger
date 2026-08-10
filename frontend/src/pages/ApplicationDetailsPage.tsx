import { Alert, Box, Button, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteApplicationDialog } from '../components/applications/DeleteApplicationDialog'
import { ApplicationTimeline } from '../components/applications/ApplicationTimeline'
import { StatusBadge } from '../components/applications/StatusBadge'
import { ApplicationReminders } from '../components/reminders/ApplicationReminders'
import { useApplication } from '../hooks/useApplication'
import { useDeleteApplication } from '../hooks/useDeleteApplication'
import { useDownloadApplicationResume } from '../hooks/useDownloadApplicationResume'
import { getApiErrorMessage } from '../utils/apiError'

function formatDate(value: string | null) {
  if (!value) return 'Not provided'
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
}

export function ApplicationDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const applicationQuery = useApplication(id)
  const deleteApplication = useDeleteApplication()
  const downloadResume = useDownloadApplicationResume()

  if (applicationQuery.isPending) {
    return <Flex minH="18rem" align="center" justify="center" aria-label="Loading application"><Spinner color="purple.fg" size="xl" /></Flex>
  }

  if (applicationQuery.isError) {
    return (
      <Alert.Root status="error" borderRadius="lg">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Unable to load application</Alert.Title>
          <Alert.Description>{getApiErrorMessage(applicationQuery.error, 'The application may no longer exist.')}</Alert.Description>
        </Alert.Content>
        <Button ml="auto" size="sm" variant="outline" onClick={() => applicationQuery.refetch()}>Retry</Button>
      </Alert.Root>
    )
  }

  const application = applicationQuery.data

  return (
    <Stack gap="6">
      <Button asChild alignSelf="start" variant="plain" px="0">
        <Link to="/applications">← Back to applications</Link>
      </Button>

      <Flex align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="4" justify="space-between">
        <Box>
          <Heading as="h2" size="2xl">{application.jobTitle}</Heading>
          <Text color="fg.muted" fontSize="lg" mt="1">{application.company}</Text>
        </Box>
        <Flex gap="3" w={{ base: 'full', sm: 'auto' }} wrap="wrap">
          <Button asChild flex={{ base: '1', sm: 'initial' }} variant="outline">
            <Link to={`/applications/${application.id}/edit`}>Edit</Link>
          </Button>
          <DeleteApplicationDialog
            company={application.company}
            isDeleting={deleteApplication.isPending}
            onConfirm={() => deleteApplication.mutate(application.id, { onSuccess: () => navigate('/applications') })}
          />
        </Flex>
      </Flex>

      {deleteApplication.isError && (
        <Alert.Root status="error"><Alert.Indicator /><Alert.Title>{getApiErrorMessage(deleteApplication.error, 'Unable to delete application.')}</Alert.Title></Alert.Root>
      )}

      <Box bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" p={{ base: '5', md: '8' }}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="7">
          <Detail label="Status"><StatusBadge status={application.status} /></Detail>
          <Detail label="Applied date">{formatDate(application.appliedAt)}</Detail>
          <Detail label="Location">{application.location ?? 'Not provided'}</Detail>
          <Detail label="Source">{application.source ?? 'Not provided'}</Detail>
          <Detail label="Resume version">{application.resumeVersion?.name ?? 'Not provided'}</Detail>
          <Detail label="Attached resume">
            {application.resumeAttachment ? (
              <Stack align="start" gap="2">
                <Text>{application.resumeAttachment.fileName}</Text>
                <Button
                  loading={downloadResume.isPending}
                  onClick={() => downloadResume.mutate({
                    applicationId: application.id,
                    fileName: application.resumeAttachment!.fileName,
                  })}
                  size="sm"
                  variant="outline"
                >
                  Download resume
                </Button>
                {downloadResume.isError && (
                  <Text color="fg.error" fontSize="sm">
                    {getApiErrorMessage(downloadResume.error, 'Unable to download resume.')}
                  </Text>
                )}
              </Stack>
            ) : 'Not provided'}
          </Detail>
          <Detail label="Job URL">
            {application.jobUrl ? <a href={application.jobUrl} target="_blank" rel="noreferrer">Open job posting</a> : 'Not provided'}
          </Detail>
          <Detail label="Created">{formatDate(application.createdAt)}</Detail>
        </SimpleGrid>
        <Box borderTopWidth="1px" mt="8" pt="6">
          <Detail label="Notes">{application.notes ?? 'No notes added.'}</Detail>
        </Box>
      </Box>

      <ApplicationReminders applicationId={application.id} />
      <ApplicationTimeline applicationId={application.id} />
    </Stack>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <Stack gap="1"><Text color="fg.subtle" fontSize="sm" fontWeight="medium">{label}</Text><Box>{children}</Box></Stack>
}
