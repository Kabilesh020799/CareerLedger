import { Alert, Box, Button, Flex, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
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
      <PageHeader title="Dashboard" description="Your pipeline, priorities, and next actions at a glance." eyebrow="Overview" />

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
          <Stack gap="5">
            <Stack gap="1"><Heading as="h3" size="lg">Needs attention</Heading><Text color="fg.muted" fontSize="sm">Your overdue, upcoming, and inactive application actions.</Text></Stack>
            <DashboardReminders />
            <FollowUpSuggestions />
          </Stack>
          <DashboardContent summary={summaryQuery.data} />
          <SourceOutcomeAnalytics outcomes={summaryQuery.data.sourceOutcomes} />
          <ResumeOutcomeAnalytics outcomes={summaryQuery.data.resumeOutcomes} />
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
          <Button asChild colorPalette="purple" mt="2">
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
        <Text color="purple.fg" fontSize="2xl" fontWeight="bold">{formatPercentage(value)}</Text>
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
        <Box bg="purple.solid" h="full" width={`${Math.min(value, 100)}%`} />
      </Box>
      <Text color="fg.subtle" fontSize="xs">{description}</Text>
    </Stack>
  )
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 }).format(value)}%`
}
