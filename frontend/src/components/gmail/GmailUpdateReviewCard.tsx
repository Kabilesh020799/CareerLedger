import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { Controller, useForm } from 'react-hook-form'
import { useResolveGmailUpdateReview } from '../../hooks/useResolveGmailUpdateReview'
import {
  gmailUpdateReviewFormSchema,
  type GmailUpdateReviewFormValues,
} from '../../schemas/gmail-update-review.schema'
import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from '../../types/application'
import type { GmailUpdateReview } from '../../types/gmail'
import type { ResumeVersion } from '../../types/resume'
import { getApiErrorMessage } from '../../utils/apiError'
import { CustomSelect } from '../ui/CustomSelect'

type Props = {
  review: GmailUpdateReview
  applications: Application[]
  applicationsLoading: boolean
  resumeVersions: ResumeVersion[]
  resumeVersionsLoading: boolean
  resumeVersionsError: boolean
}

const statusLabels: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

export function GmailUpdateReviewCard({
  review,
  applications,
  applicationsLoading,
  resumeVersions,
  resumeVersionsLoading,
  resumeVersionsError,
}: Props) {
  const resolveReview = useResolveGmailUpdateReview()
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GmailUpdateReviewFormValues>({
    resolver: zodResolver(gmailUpdateReviewFormSchema),
    defaultValues: {
      target: review.application ? 'EXISTING' : 'NEW',
      applicationId: review.application?.id ?? '',
      status: review.suggestedStatus,
      company: review.suggestedCompany ?? '',
      jobTitle: review.suggestedJobTitle ?? '',
      resumeVersionId: '',
      resume: undefined,
    },
  })
  const target = watch('target')

  const confirm = handleSubmit(async (values) => {
    const resume = values.target === 'NEW' ? values.resume?.item(0) ?? undefined : undefined
    await resolveReview.mutateAsync({
      id: review.id,
      input:
        values.target === 'EXISTING'
          ? {
              action: 'CONFIRM',
              applicationId: values.applicationId,
              status: values.status,
            }
          : {
              action: 'CREATE_APPLICATION',
              company: values.company,
              jobTitle: values.jobTitle,
              status: values.status,
              resumeVersionId: values.resumeVersionId || null,
            },
      ...(resume ? { resume } : {}),
    })
  })

  return (
    <Stack
      as="article"
      bg="bg.panel"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap="5"
      p={{ base: '5', md: '6' }}
    >
      <Flex align={{ base: 'start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="3" justify="space-between">
        <Stack gap="1" minW="0">
          <Heading as="h4" size="md">{review.subject}</Heading>
          <Text color="fg.muted" fontSize="sm" overflowWrap="anywhere">
            From {review.sender}
          </Text>
          {review.receivedAt && (
            <Text color="fg.subtle" fontSize="sm">Received {formatDateTime(review.receivedAt)}</Text>
          )}
        </Stack>
        <Badge colorPalette="purple" size="lg">Suggested: {statusLabels[review.suggestedStatus]}</Badge>
      </Flex>

      {review.application ? (
        <Alert.Root status="info" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Application match</Alert.Title>
            <Alert.Description>
              {review.application.company} — {review.application.jobTitle} ({review.matchConfidence}% confidence)
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ) : (
        <Alert.Root status="warning" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>No confident application match</Alert.Title>
            <Alert.Description>Review the suggested company and role before creating anything.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <form onSubmit={confirm} noValidate>
        <Stack gap="4">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            <Field.Root>
              <Field.Label>Apply this update to</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field {...register('target')} aria-label="Update target">
                  <option value="EXISTING">Existing application</option>
                  <option value="NEW">New application</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root invalid={Boolean(errors.status)} required>
              <Field.Label>Status<Field.RequiredIndicator /></Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field {...register('status')} aria-label="Detected status">
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>{statusLabels[status]}</option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.ErrorText>{errors.status?.message}</Field.ErrorText>
            </Field.Root>
          </SimpleGrid>

          {target === 'EXISTING' ? (
            <Field.Root invalid={Boolean(errors.applicationId)} required>
              <Field.Label>Application<Field.RequiredIndicator /></Field.Label>
              <NativeSelect.Root disabled={applicationsLoading}>
                <NativeSelect.Field {...register('applicationId')} aria-label="Application">
                  <option value="">Choose an application</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.company} — {application.jobTitle}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Field.ErrorText>{errors.applicationId?.message}</Field.ErrorText>
            </Field.Root>
          ) : (
            <Stack gap="4">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <Field.Root invalid={Boolean(errors.company)} required>
                <Field.Label>Company<Field.RequiredIndicator /></Field.Label>
                <Input {...register('company')} />
                <Field.ErrorText>{errors.company?.message}</Field.ErrorText>
              </Field.Root>
              <Field.Root invalid={Boolean(errors.jobTitle)} required>
                <Field.Label>Job title<Field.RequiredIndicator /></Field.Label>
                <Input {...register('jobTitle')} />
                <Field.ErrorText>{errors.jobTitle?.message}</Field.ErrorText>
              </Field.Root>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <Field.Root invalid={Boolean(errors.resumeVersionId)}>
                <Field.Label>Resume tag</Field.Label>
                <Controller
                  control={control}
                  name="resumeVersionId"
                  render={({ field }) => (
                    <CustomSelect
                      aria-label="Resume tag"
                      disabled={resumeVersionsLoading || resumeVersionsError}
                      name={field.name}
                      options={resumeVersions.map((version) => ({ label: version.name, value: version.id }))}
                      placeholder="No resume tag"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
                {resumeVersionsError && <Text color="fg.error" fontSize="sm">Resume tags could not be loaded.</Text>}
                <Field.ErrorText>{errors.resumeVersionId?.message}</Field.ErrorText>
              </Field.Root>
              <Field.Root invalid={Boolean(errors.resume)}>
                <Field.Label>Attach resume</Field.Label>
                <Box bg="bg.subtle" borderColor="border" borderRadius="lg" borderStyle="dashed" borderWidth="2px" p="3">
                  <Input
                    {...register('resume')}
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    aria-label="Attach resume"
                    cursor="pointer"
                    p="1.5"
                    type="file"
                  />
                  <Text color="fg.subtle" fontSize="xs" mt="1">PDF, DOC, or DOCX up to 5 MB. Saved as Role_Company.</Text>
                </Box>
                <Field.ErrorText>{errors.resume?.message}</Field.ErrorText>
              </Field.Root>
            </SimpleGrid>
            </Stack>
          )}

          {resolveReview.isError && (
            <Alert.Root status="error" borderRadius="lg">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Unable to resolve Gmail update</Alert.Title>
                <Alert.Description>
                  {getApiErrorMessage(resolveReview.error, 'Please try again.')}
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <Flex direction={{ base: 'column', sm: 'row' }} gap="3">
            <Button colorPalette="purple" loading={resolveReview.isPending} type="submit">
              {target === 'EXISTING' ? 'Apply update' : 'Create application'}
            </Button>
            <Button
              disabled={resolveReview.isPending}
              type="button"
              variant="outline"
              onClick={() =>
                resolveReview.mutate({ id: review.id, input: { action: 'IGNORE' } })
              }
            >
              Ignore
            </Button>
          </Flex>
        </Stack>
      </form>
    </Stack>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
