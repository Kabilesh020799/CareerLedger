import { zodResolver } from '@hookform/resolvers/zod'
import { Box, Button, Field, Input, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
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
import { CustomSelect } from '../ui/CustomSelect'

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
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(query.source || query.appliedFrom || query.appliedTo || query.limit !== 20 || query.sortOrder !== 'desc'))
  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationDiscoveryFormValues>({
    resolver: zodResolver(applicationDiscoveryFormSchema),
    defaultValues: applicationDiscoveryToFormValues(query),
  })
  const applyTimer = useRef<number | undefined>(undefined)
  const applyingFormChange = useRef(false)

  useEffect(() => {
    if (applyingFormChange.current) {
      applyingFormChange.current = false
      return
    }
    reset(applicationDiscoveryToFormValues(query))
  }, [query, reset])

  useEffect(() => () => window.clearTimeout(applyTimer.current), [])

  const applyValidValues = handleSubmit((values) => {
    applyingFormChange.current = true
    onChange(applicationDiscoveryFormToQuery(values))
  })

  const applySoon = () => {
    window.clearTimeout(applyTimer.current)
    applyTimer.current = window.setTimeout(() => {
      void applyValidValues()
    }, 300)
  }

  return (
    <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p={{ base: '4', md: '5' }}>
      <form onSubmit={(event) => { window.clearTimeout(applyTimer.current); void applyValidValues(event) }} noValidate>
        <Stack gap="4">
          <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
            <FilterField label="Search" error={errors.search?.message}>
              <Input
                {...register('search', { onChange: applySoon })}
                placeholder="Company, title, or location"
                type="search"
              />
            </FilterField>

            <FilterField label="Status" error={errors.status?.message}>
              <Controller control={control} name="status" render={({ field }) => <CustomSelect aria-label="Status" name={field.name} options={applicationStatuses.map((status) => ({ label: statusLabels.get(status) ?? status, value: status }))} placeholder="All statuses" value={field.value} onChange={(value) => { field.onChange(value); applySoon() }} />} />
            </FilterField>

            <FilterField label="Sort by" error={errors.sortBy?.message}>
              <Controller control={control} name="sortBy" render={({ field }) => <CustomSelect aria-label="Sort by" name={field.name} options={applicationSortFields.map((value) => ({ label: sortLabels.get(value) ?? value, value }))} value={field.value} onChange={(value) => { field.onChange(value); applySoon() }} />} />
            </FilterField>

          </SimpleGrid>

          {advancedOpen && <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} gap="4">
            <FilterField label="Source" error={errors.source?.message}><Input {...register('source', { onChange: applySoon })} placeholder="LinkedIn, referral…" /></FilterField>
            <FilterField label="Applied from" error={errors.appliedFrom?.message}><Input {...register('appliedFrom', { onChange: applySoon })} type="date" /></FilterField>
            <FilterField label="Applied to" error={errors.appliedTo?.message}><Input {...register('appliedTo', { onChange: applySoon })} type="date" /></FilterField>
            <FilterField label="Order" error={errors.sortOrder?.message}><Controller control={control} name="sortOrder" render={({ field }) => <CustomSelect aria-label="Order" name={field.name} options={[{ label: 'Descending', value: 'desc' }, { label: 'Ascending', value: 'asc' }]} value={field.value} onChange={(value) => { field.onChange(value); applySoon() }} />} /></FilterField>
            <FilterField label="Results per page" error={errors.limit?.message}><Controller control={control} name="limit" render={({ field }) => <CustomSelect aria-label="Results per page" name={field.name} options={['10', '20', '50'].map((value) => ({ label: value, value }))} value={String(field.value)} onChange={(value) => { field.onChange(Number(value)); applySoon() }} />} /></FilterField>
          </SimpleGrid>}

          <Stack direction={{ base: 'column', sm: 'row' }} gap="3">
            <Button aria-expanded={advancedOpen} type="button" variant="ghost" onClick={() => setAdvancedOpen((open) => !open)}><SlidersHorizontal aria-hidden size={17} />{advancedOpen ? 'Fewer filters' : 'More filters'}</Button>
            {(query.search || query.status || query.source || query.appliedFrom || query.appliedTo) && <Button type="button" variant="outline" onClick={onClear}>Clear filters</Button>}
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
