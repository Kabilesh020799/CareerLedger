import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Field, Input, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  applicationDiscoveryFormSchema,
  applicationDiscoveryFormToQuery,
  applicationDiscoveryToFormValues,
  type ApplicationDiscoveryFormValues,
} from '../../schemas/application-discovery.schema'
import {
  applicationSortFields,
  applicationStatuses,
  type ApplicationDiscoveryQuery,
} from '../../types/application'

type ApplicationDiscoveryControlsProps = {
  query: ApplicationDiscoveryQuery
  onChange: (query: ApplicationDiscoveryQuery) => void
  onClear: () => void
}

const statusLabels = new Map([
  ['SAVED', 'Saved'],
  ['APPLIED', 'Applied'],
  ['SCREENING', 'Screening'],
  ['ASSESSMENT', 'Assessment'],
  ['INTERVIEW', 'Interview'],
  ['OFFER', 'Offer'],
  ['REJECTED', 'Rejected'],
  ['WITHDRAWN', 'Withdrawn'],
])

const sortLabels = new Map([
  ['appliedAt', 'Applied date'],
  ['createdAt', 'Date added'],
  ['updatedAt', 'Last updated'],
  ['company', 'Company'],
])

export function ApplicationDiscoveryControls({
  query,
  onChange,
  onClear,
}: ApplicationDiscoveryControlsProps) {
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationDiscoveryFormValues>({
    resolver: zodResolver(applicationDiscoveryFormSchema),
    defaultValues: applicationDiscoveryToFormValues(query),
  })

  useEffect(() => {
    reset(applicationDiscoveryToFormValues(query))
  }, [query, reset])

  const submit = (values: ApplicationDiscoveryFormValues) => {
    onChange(applicationDiscoveryFormToQuery(values))
  }

  return (
    <Box bg="white" borderRadius="xl" borderWidth="1px" p={{ base: '4', md: '5' }}>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <Stack gap="4">
          <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap="4">
            <FilterField label="Search" error={errors.search?.message}>
              <Input
                {...register('search')}
                placeholder="Company, title, or location"
                type="search"
              />
            </FilterField>

            <FilterField label="Status" error={errors.status?.message}>
              <Select {...register('status')} aria-label="Status">
                <option value="">All statuses</option>
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>{statusLabels.get(status)}</option>
                ))}
              </Select>
            </FilterField>

            <FilterField label="Source" error={errors.source?.message}>
              <Input {...register('source')} placeholder="LinkedIn, referral…" />
            </FilterField>

            <FilterField label="Results per page" error={errors.limit?.message}>
              <Select {...register('limit', { valueAsNumber: true })} aria-label="Results per page">
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </Select>
            </FilterField>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap="4">
            <FilterField label="Applied from" error={errors.appliedFrom?.message}>
              <Input {...register('appliedFrom')} type="date" />
            </FilterField>

            <FilterField label="Applied to" error={errors.appliedTo?.message}>
              <Input {...register('appliedTo')} type="date" />
            </FilterField>

            <FilterField label="Sort by" error={errors.sortBy?.message}>
              <Select {...register('sortBy')} aria-label="Sort by">
                {applicationSortFields.map((field) => (
                  <option key={field} value={field}>{sortLabels.get(field)}</option>
                ))}
              </Select>
            </FilterField>

            <FilterField label="Order" error={errors.sortOrder?.message}>
              <Select {...register('sortOrder')} aria-label="Order">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </Select>
            </FilterField>
          </SimpleGrid>

          <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
            <Button colorPalette="teal" type="submit">Apply filters</Button>
            <Button type="button" variant="outline" onClick={onClear}>Clear filters</Button>
          </Stack>
        </Stack>
      </form>
    </Box>
  )
}

type FilterFieldProps = {
  label: string
  error?: string
  children: React.ReactNode
}

function FilterField({ label, error, children }: FilterFieldProps) {
  return (
    <Field.Root invalid={Boolean(error)}>
      <Field.Label>{label}</Field.Label>
      {children}
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}

function Select(props: React.ComponentProps<typeof Box>) {
  return (
    <Box
      as="select"
      bg="transparent"
      borderRadius="md"
      borderWidth="1px"
      h="10"
      px="3"
      width="full"
      {...props}
    />
  )
}
