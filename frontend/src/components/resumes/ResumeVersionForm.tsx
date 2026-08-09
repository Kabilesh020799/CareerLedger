import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field, Input, Stack, Textarea } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import {
  resumeVersionFormSchema,
  type ResumeVersionFormValues,
} from '../../schemas/resume-version.schema'

type ResumeVersionFormProps = {
  initialValues: ResumeVersionFormValues
  submitLabel: string
  isSubmitting: boolean
  resetAfterSubmit?: boolean
  onCancel?: () => void
  onSubmit: (values: ResumeVersionFormValues) => Promise<void>
}

export function ResumeVersionForm({
  initialValues,
  submitLabel,
  isSubmitting,
  resetAfterSubmit,
  onCancel,
  onSubmit,
}: ResumeVersionFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResumeVersionFormValues>({
    resolver: zodResolver(resumeVersionFormSchema),
    defaultValues: initialValues,
  })

  const submit = async (values: ResumeVersionFormValues) => {
    await onSubmit(values)
    if (resetAfterSubmit) reset(initialValues)
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <Stack gap="4">
        <Field.Root invalid={Boolean(errors.name)} required>
          <Field.Label>Name<Field.RequiredIndicator /></Field.Label>
          <Input {...register('name')} placeholder="Full-stack resume" />
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>
        <Field.Root invalid={Boolean(errors.notes)}>
          <Field.Label>Notes</Field.Label>
          <Textarea
            {...register('notes')}
            minH="6rem"
            placeholder="Technologies, roles, or achievements emphasized in this version"
            resize="vertical"
          />
          <Field.ErrorText>{errors.notes?.message}</Field.ErrorText>
        </Field.Root>
        <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
          <Button colorPalette="purple" loading={isSubmitting} type="submit">
            {submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
        </Stack>
      </Stack>
    </form>
  )
}
