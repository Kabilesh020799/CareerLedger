import { Alert, Box, Button, Flex, Heading, SimpleGrid, Stack, Tabs, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { DashboardReminders } from '../components/reminders/DashboardReminders'
import { FollowUpSuggestions } from '../components/reminders/FollowUpSuggestions'
import { ResumeOutcomeAnalytics } from '../components/dashboard/ResumeOutcomeAnalytics'
import { SourceOutcomeAnalytics } from '../components/dashboard/SourceOutcomeAnalytics'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import type { DashboardSummary } from '../types/dashboard'
import { getApiErrorMessage } from '../utils/apiError'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { PageHeader } from '../components/ui/PageHeader'

export function DashboardPage() {
  const summaryQuery = useDashboardSummary()

  return (
    <Stack gap="7">
      <PageHeader title="Dashboard" description="Your pipeline, priorities, and next actions at a glance." eyebrow="Overview" action={{ label: 'Add application', to: '/applications/new' }} />

      {summaryQuery.isPending && (
        <LoadingSkeleton label="Loading dashboard" />
      )}

      {summaryQuery.isError && (
        <Alert.Root status="error" borderRadius="lg">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load dashboard</Alert.Title>
            <Alert.Description>
              {getApiErrorMessage(summaryQuery.error, 'Please try again.')}
            </Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => summaryQuery.refetch()}>
            Retry
          </Button>
        </Alert.Root>
      )}

      {summaryQuery.isSuccess && (
        <>
          <DashboardContent summary={summaryQuery.data} />
          <AttentionPanel />
          <PerformanceInsights summary={summaryQuery.data} />
        </>
      )}
    </Stack>
  )
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const metrics = [
    { label: 'Total applications', value: summary.totalApplications },
    { label: 'Created since Monday', value: summary.createdThisWeek },
    { label: 'Interviews', value: summary.statusCounts.INTERVIEW },
    { label: 'Offers', value: summary.statusCounts.OFFER },
  ]

  return (
    <Stack gap="7">
      <SimpleGrid columns={{ base: 2, lg: 4 }} gap={{ base: '3', md: '4' }}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SimpleGrid>

      {summary.totalApplications === 0 && (
        <Stack
          align="center"
          bg="bg.panel"
          borderColor="border"
          borderRadius="xl"
          borderWidth="1px"
          gap="3"
          p={{ base: '8', md: '10' }}
          textAlign="center"
        >
          <Heading as="h3" size="lg">No application activity yet</Heading>
          <Text color="fg.muted">Create your first application to start measuring your pipeline.</Text>
          <Button asChild colorPalette="brand" mt="2">
            <Link to="/applications/new">Create your first application</Link>
          </Button>
        </Stack>
      )}

      <Stack gap="4">
        <Stack gap="1">
          <Heading as="h3" size="lg">Pipeline conversion</Heading>
          <Text color="fg.muted" fontSize="sm">
            Current milestone status across {summary.submittedApplications} submitted application{summary.submittedApplications === 1 ? '' : 's'}. Saved applications are excluded from the denominator.
          </Text>
        </Stack>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
          <RateCard
            description="Currently at screening, assessment, interview, or offer"
            label="Screening progression"
            value={summary.conversionRates.screening}
          />
          <RateCard
            description="Currently at interview or offer"
            label="Interview progression"
            value={summary.conversionRates.interview}
          />
          <RateCard
            description="Currently at offer"
            label="Offer progression"
            value={summary.conversionRates.offer}
          />
        </SimpleGrid>
      </Stack>
    </Stack>
  )
}

function AttentionPanel() {
  return (
    <Stack gap="4">
      <Stack gap="1">
        <Heading as="h2" size="lg">Needs attention</Heading>
        <Text color="fg.muted" fontSize="sm">Overdue reminders, upcoming deadlines, and follow-ups worth acting on now.</Text>
      </Stack>
      <SimpleGrid columns={{ base: 1, xl: 2 }} gap="4">
        <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p={{ base: '4', md: '5' }}>
          <DashboardReminders compact />
        </Box>
        <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p={{ base: '4', md: '5' }}>
          <FollowUpSuggestions compact />
        </Box>
      </SimpleGrid>
    </Stack>
  )
}

function PerformanceInsights({ summary }: { summary: DashboardSummary }) {
  return (
    <Stack gap="4">
      <Stack gap="1">
        <Heading as="h2" size="lg">Performance insights</Heading>
        <Text color="fg.muted" fontSize="sm">Compare which sources and resume tags move applications furthest.</Text>
      </Stack>
      <Tabs.Root defaultValue="sources" variant="line">
        <Tabs.List overflowX="auto">
          <Tabs.Trigger value="sources">By source</Tabs.Trigger>
          <Tabs.Trigger value="resumes">By resume tag</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content pt="5" value="sources"><SourceOutcomeAnalytics outcomes={summary.sourceOutcomes} /></Tabs.Content>
        <Tabs.Content pt="5" value="resumes"><ResumeOutcomeAnalytics outcomes={summary.resumeOutcomes} /></Tabs.Content>
      </Tabs.Root>
    </Stack>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Stack
      as="article"
      aria-label={label}
      bg="bg.panel"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap="1"
      minH={{ base: '24', md: '28' }}
      p={{ base: '4', md: '5' }}
      shadow="card"
    >
      <Text color="fg.muted" fontSize={{ base: 'xs', md: 'sm' }} fontWeight="medium">{label}</Text>
      <Text color="fg" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" letterSpacing="-0.04em">{value}</Text>
    </Stack>
  )
}

function RateCard({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: number
}) {
  return (
    <Stack
      as="article"
      aria-label={label}
      bg="bg.panel"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap="3"
      p="5"
      shadow="sm"
    >
      <Flex align="baseline" justify="space-between" gap="3" wrap="wrap">
        <Text color="fg" fontWeight="semibold">{label}</Text>
        <Text color="brand.fg" fontSize="2xl" fontWeight="bold">{formatPercentage(value)}</Text>
      </Flex>
      <Box
        aria-label={`${label}: ${formatPercentage(value)}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        bg="bg.emphasized"
        borderRadius="full"
        h="2"
        overflow="hidden"
        role="progressbar"
      >
        <Box bg="brand.solid" h="full" width={`${Math.min(value, 100)}%`} />
      </Box>
      <Text color="fg.subtle" fontSize="xs">{description}</Text>
    </Stack>
  )
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 }).format(value)}%`
}
