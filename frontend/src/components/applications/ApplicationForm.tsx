import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Field, Input, NativeSelect, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from '../../schemas/application.schema'
import { applicationStatuses } from '../../types/application'
import { useResumeVersions } from '../../hooks/useResumeVersions'

type ApplicationFormProps = {
  initialValues: ApplicationFormValues
  submitLabel: string
  isSubmitting: boolean
  serverError?: string
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
  onSubmit,
}: ApplicationFormProps) {
  const resumeVersions = useResumeVersions()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: initialValues,
  })

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

        <FormField label="Applied date" error={errors.appliedAt?.message}>
          <Input {...register('appliedAt')} type="date" />
        </FormField>

        <FormField label="Status" error={errors.status?.message}>
          <Box as="select" {...register('status')} aria-label="Status" borderColor="border" borderWidth="1px" borderRadius="md" h="10" px="3" width="full" bg="bg">
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </Box>
        </FormField>

        <FormField label="Resume version" error={errors.resumeVersionId?.message}>
          <NativeSelect.Root disabled={resumeVersions.isPending || resumeVersions.isError}>
            <NativeSelect.Field {...register('resumeVersionId')} aria-label="Resume version">
              <option value="">No resume version</option>
              {resumeVersions.data?.map((resumeVersion) => (
                <option key={resumeVersion.id} value={resumeVersion.id}>
                  {resumeVersion.name}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          {resumeVersions.isError && (
            <Text color="fg.error" fontSize="sm">Resume versions could not be loaded.</Text>
          )}
          {resumeVersions.isSuccess && resumeVersions.data.length === 0 && (
            <Text color="fg.muted" fontSize="sm">Add versions from the Resumes page.</Text>
          )}
        </FormField>
      </SimpleGrid>

      <FormField label="Notes" error={errors.notes?.message}>
        <Textarea {...register('notes')} minH="8rem" resize="vertical" />
      </FormField>

        <Button alignSelf="start" colorPalette="purple" loading={isSubmitting} type="submit">
          {submitLabel}
        </Button>
      </Stack>
    </form>
  )
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
