import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Field, Flex, Heading, Input, NativeSelect, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from '../../schemas/application.schema'
import { applicationStatuses } from '../../types/application'
import { useResumeVersions } from '../../hooks/useResumeVersions'
import { Link } from 'react-router-dom'

type ApplicationFormProps = {
  initialValues: ApplicationFormValues
  submitLabel: string
  isSubmitting: boolean
  serverError?: string
  allowResumeAttachment?: boolean
  currentResumeFileName?: string
  cancelTo?: string
  onSubmit: (values: ApplicationFormValues) => Promise<void>
}

const statusLabels: Record<(typeof applicationStatuses)[number], string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

export function ApplicationForm({
  initialValues,
  submitLabel,
  isSubmitting,
  serverError,
  allowResumeAttachment = false,
  currentResumeFileName,
  cancelTo,
  onSubmit,
}: ApplicationFormProps) {
  const resumeVersions = useResumeVersions()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: initialValues,
  })
  const selectedResume = watch('resume')?.item(0)

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack gap="6">
      {serverError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to save application</Alert.Title>
            <Alert.Description>{serverError}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      <FormSection title="Job details" description="The role and company you want to track.">
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="5">
        <FormField label="Company" error={errors.company?.message} required>
          <Input {...register('company')} autoComplete="organization" />
        </FormField>

        <FormField label="Job title" error={errors.jobTitle?.message} required>
          <Input {...register('jobTitle')} autoComplete="organization-title" />
        </FormField>

        <FormField label="Location" error={errors.location?.message}>
          <Input {...register('location')} autoComplete="address-level2" />
        </FormField>

        <FormField label="Source" error={errors.source?.message}>
          <Input {...register('source')} placeholder="LinkedIn, referral, company website…" />
        </FormField>

        <FormField label="Job URL" error={errors.jobUrl?.message}>
          <Input {...register('jobUrl')} type="url" placeholder="https://…" />
        </FormField>

      </SimpleGrid>
      </FormSection>

      <FormSection title="Application progress" description="Where this opportunity is in your pipeline.">
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="5">
        <FormField label="Applied date" error={errors.appliedAt?.message}>
          <Input {...register('appliedAt')} type="date" />
        </FormField>

        <FormField label="Status" error={errors.status?.message}>
          <NativeSelect.Root>
            <NativeSelect.Field {...register('status')} aria-label="Status">
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </FormField>

        <FormField label="Resume tag" error={errors.resumeVersionId?.message}>
          <NativeSelect.Root disabled={resumeVersions.isPending || resumeVersions.isError}>
            <NativeSelect.Field {...register('resumeVersionId')} aria-label="Resume tag">
              <option value="">No resume tag</option>
              {resumeVersions.data?.map((resumeVersion) => (
                <option key={resumeVersion.id} value={resumeVersion.id}>
                  {resumeVersion.name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          {resumeVersions.isError && (
            <Text color="fg.error" fontSize="sm">Resume tags could not be loaded.</Text>
          )}
          {resumeVersions.isSuccess && resumeVersions.data.length === 0 && (
            <Text color="fg.muted" fontSize="sm">Add tags from the Resumes page.</Text>
          )}
        </FormField>
      </SimpleGrid>
      </FormSection>

      <FormSection title="Notes" description="Interview context, contacts, or anything worth remembering.">
        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea {...register('notes')} minH="8rem" placeholder="Add context or next steps…" resize="vertical" />
        </FormField>
      </FormSection>

      {allowResumeAttachment && (
        <FormSection title="Documents" description="Attach the resume used for this application.">
        <FormField
          label={currentResumeFileName ? 'Replace resume' : 'Attach resume'}
          error={errors.resume?.message}
        >
          {currentResumeFileName && (
            <Text color="fg.muted" fontSize="sm">
              Current file: {currentResumeFileName}
            </Text>
          )}
          <Box borderColor={selectedResume ? 'purple.emphasized' : 'border'} borderRadius="lg" borderStyle="dashed" borderWidth="2px" bg={selectedResume ? 'purple.subtle' : 'bg.subtle'} p="5" textAlign="center">
            <Input {...register('resume')} accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" cursor="pointer" p="1.5" type="file" />
            <Text color="fg.muted" fontSize="sm" mt="2">{selectedResume ? `${selectedResume.name} selected` : 'Choose a file'}</Text>
            <Text color="fg.subtle" fontSize="xs" mt="1">PDF, DOC, or DOCX up to 5 MB. Selecting a file saves it as Role_Company.</Text>
          </Box>
        </FormField>
        </FormSection>
      )}

        <Flex bg="bg.panel" borderColor="border" borderTopWidth="1px" bottom={{ base: '18', lg: '0' }} direction={{ base: 'column-reverse', sm: 'row' }} gap="3" justify="flex-end" mx={{ base: '-5', md: '-8' }} px={{ base: '5', md: '8' }} py="4" position="sticky" zIndex="base">
        {cancelTo && <Button asChild flex={{ base: '1', sm: 'initial' }} variant="outline"><Link to={cancelTo}>Cancel</Link></Button>}
        <Button minH="11" w={{ base: 'full', sm: 'auto' }} colorPalette="purple" loading={isSubmitting} type="submit">
          {submitLabel}
        </Button>
        </Flex>
      </Stack>
    </form>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Stack gap="4"><Box><Heading as="h3" fontSize="md">{title}</Heading><Text color="fg.muted" fontSize="sm" mt="1">{description}</Text></Box>{children}</Stack>
}

type FormFieldProps = {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <Field.Root invalid={Boolean(error)} required={required}>
      <Field.Label>
        {label}
        <Field.RequiredIndicator />
      </Field.Label>
      {children}
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}
