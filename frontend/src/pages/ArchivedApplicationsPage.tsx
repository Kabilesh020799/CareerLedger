import { Stack } from '@chakra-ui/react'
import { ArchivedApplicationsPanel } from '../components/applications/ArchivedApplicationsPanel'
import { PageHeader } from '../components/ui/PageHeader'

export function ArchivedApplicationsPage() {
  return (
    <Stack gap="6">
      <PageHeader
        description="Review applications kept from completed job-search sprints."
        eyebrow="Applications"
        title="Archive"
      />
      <ArchivedApplicationsPanel />
    </Stack>
  )
}
