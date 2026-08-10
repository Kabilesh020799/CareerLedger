import { Alert, Box, Button, Flex, Heading, NativeSelect, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteApplicationDialog } from '../components/applications/DeleteApplicationDialog'
import { ApplicationTimeline } from '../components/applications/ApplicationTimeline'
import { StatusBadge } from '../components/applications/StatusBadge'
import { ApplicationReminders } from '../components/reminders/ApplicationReminders'
import { useApplication } from '../hooks/useApplication'
import { useDeleteApplication } from '../hooks/useDeleteApplication'
import { useDownloadApplicationResume } from '../hooks/useDownloadApplicationResume'
import { getApiErrorMessage } from '../utils/apiError'
import { LoadingSkeleton, Surface } from '../components/ui/LoadingSkeleton'
import { useMoveApplication } from '../hooks/useMoveApplication'
import { applicationStatuses, type ApplicationStatus } from '../types/application'
import { BellPlus, Edit3, MessageSquarePlus } from 'lucide-react'

const statusLabels: Record<ApplicationStatus, string> = {
  SAVED: 'Saved', APPLIED: 'Applied', SCREENING: 'Screening', ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview', OFFER: 'Offer', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}

function formatDate(value: string | null) {
  if (!value) return 'Not provided'
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null, period?: string | null) {
  if (min == null && max == null) return 'Not provided'
  const formatter = new Intl.NumberFormat('en-CA', currency ? { style: 'currency', currency, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 })
  const amount = min != null && max != null && min !== max
    ? `${formatter.format(min)} – ${formatter.format(max)}`
    : formatter.format(min ?? max ?? 0)
  return period ? `${amount} per ${period.toLowerCase()}` : amount
}

export function ApplicationDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const applicationQuery = useApplication(id)
  const deleteApplication = useDeleteApplication()
  const downloadResume = useDownloadApplicationResume()
  const moveApplication = useMoveApplication()

  if (applicationQuery.isPending) {
    return <LoadingSkeleton variant="details" />
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
      <Button asChild alignSelf="start" color="fg.muted" size="sm" variant="plain" px="0">
        <Link to="/applications">← Back to applications</Link>
      </Button>

      <Flex align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="4" justify="space-between">
        <Stack gap="2">
          <StatusBadge status={application.status} />
          <Heading as="h1" size="2xl">{application.jobTitle}</Heading>
          <Text color="fg.muted" fontSize="lg" mt="1">{application.company}</Text>
        </Stack>
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

      <Surface aria-label="Application quick actions" p="4">
        <Flex align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="3" justify="space-between">
          <Box minW={{ md: '15rem' }}>
            <Text color="fg.muted" fontSize="xs" fontWeight="bold" mb="1" textTransform="uppercase">Quick status</Text>
            <NativeSelect.Root disabled={moveApplication.isPending} size="sm">
              <NativeSelect.Field aria-label="Change application status" value={application.status} onChange={(event) => moveApplication.mutate({ id: application.id, status: event.currentTarget.value as ApplicationStatus })}>
                {applicationStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
          <Flex gap="2" wrap="wrap">
            <Button asChild size="sm" variant="outline"><a href="#timeline"><MessageSquarePlus aria-hidden size={17} />Add note</a></Button>
            <Button asChild size="sm" variant="outline"><a href="#reminders"><BellPlus aria-hidden size={17} />Add reminder</a></Button>
            <Button asChild colorPalette="purple" size="sm"><Link to={`/applications/${application.id}/edit`}><Edit3 aria-hidden size={17} />Edit details</Link></Button>
          </Flex>
        </Flex>
      </Surface>

      {deleteApplication.isError && (
        <Alert.Root status="error"><Alert.Indicator /><Alert.Title>{getApiErrorMessage(deleteApplication.error, 'Unable to delete application.')}</Alert.Title></Alert.Root>
      )}

      <Surface p={{ base: '5', md: '7' }}>
        <SectionHeading title="Overview" description="The essential information for this opportunity." />
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="7">
          <Detail label="Applied date">{formatDate(application.appliedAt)}</Detail>
          {application.location && <Detail label="Location">{application.location}</Detail>}
          {application.workMode && <Detail label="Work mode">{application.workMode === 'ONSITE' ? 'On-site' : application.workMode[0] + application.workMode.slice(1).toLowerCase()}</Detail>}
          {(application.salaryMin != null || application.salaryMax != null) && <Detail label="Salary">{formatSalary(application.salaryMin, application.salaryMax, application.salaryCurrency, application.salaryPeriod)}</Detail>}
          {application.source && <Detail label="Source">{application.source}</Detail>}
          <Detail label="Job URL">
            {application.jobUrl ? <a href={application.jobUrl} target="_blank" rel="noreferrer">Open job posting</a> : 'Not provided'}
          </Detail>
        </SimpleGrid>
        {(application.skills?.length || application.experienceRequirements || application.jobDescription) && <Box borderTopWidth="1px" mt="8" pt="6">
          <SectionHeading title="Job requirements" />
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="7">
            {Boolean(application.skills?.length) && <Detail label="Skills">{application.skills!.join(', ')}</Detail>}
            {application.experienceRequirements && <Detail label="Experience requirements">{application.experienceRequirements}</Detail>}
          </SimpleGrid>
          {application.jobDescription && <Box mt="6"><Detail label="Captured job description"><Text lineClamp="8" whiteSpace="pre-wrap">{application.jobDescription}</Text></Detail></Box>}
        </Box>}
        {application.notes && <Box borderTopWidth="1px" mt="8" pt="6">
          <SectionHeading title="Notes" />
          <Detail label="Notes">{application.notes ?? 'No notes added.'}</Detail>
        </Box>}
      </Surface>

      {(application.resumeVersion || application.resumeAttachment) && <Surface p={{ base: '5', md: '7' }}>
        <SectionHeading title="Documents" description="Resume material associated with this application." />
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="5">
          {application.resumeVersion && <Detail label="Resume tag">{application.resumeVersion.name}</Detail>}
          {application.resumeAttachment && <Detail label="Attached resume"><Stack align="start" gap="2"><Text fontWeight="medium">{application.resumeAttachment.fileName}</Text><Button loading={downloadResume.isPending} onClick={() => downloadResume.mutate({ applicationId: application.id, fileName: application.resumeAttachment!.fileName })} size="sm" variant="outline">Download resume</Button>{downloadResume.isError && <Text color="fg.error" fontSize="sm">{getApiErrorMessage(downloadResume.error, 'Unable to download resume.')}</Text>}</Stack></Detail>}
        </SimpleGrid>
      </Surface>}

      <Box id="reminders" scrollMarginTop="6rem"><ApplicationReminders applicationId={application.id} /></Box>
      <Box id="timeline" scrollMarginTop="6rem"><ApplicationTimeline applicationId={application.id} /></Box>
    </Stack>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <Stack gap="1"><Text color="fg.subtle" fontSize="sm" fontWeight="medium">{label}</Text><Box>{children}</Box></Stack>
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return <Box mb="5"><Heading as="h3" fontSize="md">{title}</Heading>{description && <Text color="fg.muted" fontSize="sm" mt="1">{description}</Text>}</Box>
}
