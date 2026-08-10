import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Field, Input, Stack } from '@chakra-ui/react'
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
          <Field.Label>Tag name<Field.RequiredIndicator /></Field.Label>
          <Input {...register('name')} placeholder="Backend" />
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
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
