import { Alert, Box, Button, Flex, Heading, SimpleGrid, Spinner, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { DashboardReminders } from '../components/reminders/DashboardReminders'
import { FollowUpSuggestions } from '../components/reminders/FollowUpSuggestions'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import type { DashboardSummary } from '../types/dashboard'
import { getApiErrorMessage } from '../utils/apiError'

export function DashboardPage() {
  const summaryQuery = useDashboardSummary()

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Heading as="h2" size="2xl">Dashboard</Heading>
        <Text color="fg.muted">A current snapshot of your application pipeline.</Text>
      </Stack>

      {summaryQuery.isPending && (
        <Flex align="center" aria-label="Loading dashboard" justify="center" minH="20rem">
          <Spinner color="purple.fg" size="xl" />
        </Flex>
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
          <FollowUpSuggestions />
          <DashboardReminders />
        </>
      )}
    </Stack>
  )
}

function DashboardContent({ summary }: { summary: DashboardSummary }) {
  const metrics = [
    { label: 'Total applications', value: summary.totalApplications },
    { label: 'Created since Monday', value: summary.createdThisWeek },
    { label: 'Screenings', value: summary.statusCounts.SCREENING },
    { label: 'Assessments', value: summary.statusCounts.ASSESSMENT },
    { label: 'Interviews', value: summary.statusCounts.INTERVIEW },
    { label: 'Offers', value: summary.statusCounts.OFFER },
    { label: 'Rejections', value: summary.statusCounts.REJECTED },
  ]

  return (
    <Stack gap="7">
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} gap="4">
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
      gap="2"
      p="5"
      shadow="sm"
    >
      <Text color="fg.muted" fontSize="sm" fontWeight="medium">{label}</Text>
      <Text color="fg" fontSize="3xl" fontWeight="bold">{value}</Text>
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
      <Flex align="baseline" justify="space-between" gap="3">
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
