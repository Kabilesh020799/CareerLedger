import { Box, Button, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import type { ResumeOutcome } from '../../types/dashboard'

export function ResumeOutcomeAnalytics({ outcomes }: { outcomes: ResumeOutcome[] }) {
  return (
    <Stack gap="4">
      <Stack gap="1">
        <Heading as="h3" size="lg">Resume outcomes</Heading>
        <Text color="fg.muted" fontSize="sm">
          Milestone progress by resume version. Rates use submitted applications for that version; saved and unassigned applications are excluded.
        </Text>
      </Stack>

      {outcomes.length === 0 ? (
        <Stack
          align="center"
          bg="bg.panel"
          borderColor="border"
          borderRadius="xl"
          borderWidth="1px"
          gap="3"
          p={{ base: '7', md: '9' }}
          textAlign="center"
        >
          <Heading as="h4" size="md">No resume outcome data yet</Heading>
          <Text color="fg.muted" fontSize="sm">
            Create a resume version and associate it with applications to compare results.
          </Text>
          <Button asChild colorPalette="purple" size="sm">
            <Link to="/resumes">Manage resume versions</Link>
          </Button>
        </Stack>
      ) : (
        <Box
          aria-label="Scrollable resume outcome comparison"
          bg="bg.panel"
          borderColor="border"
          borderRadius="xl"
          borderWidth="1px"
          maxW="full"
          overflowX="auto"
          overscrollBehaviorX="contain"
          role="region"
          tabIndex={0}
        >
          <Table.Root aria-label="Resume outcome comparison" minW="44rem" size="md" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Resume version</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Submitted</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Screening</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Interview</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Offer</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {outcomes.map((outcome) => (
                <Table.Row aria-label={`Outcomes for ${outcome.name}`} key={outcome.resumeVersionId}>
                  <Table.Cell>
                    <Text fontWeight="semibold">{outcome.name}</Text>
                    {outcome.submittedApplications === 0 && (
                      <Text color="fg.subtle" fontSize="xs">No submitted applications</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="end" fontWeight="semibold">{outcome.submittedApplications}</Table.Cell>
                  <OutcomeCell count={outcome.milestoneCounts.screening} rate={outcome.conversionRates.screening} />
                  <OutcomeCell count={outcome.milestoneCounts.interview} rate={outcome.conversionRates.interview} />
                  <OutcomeCell count={outcome.milestoneCounts.offer} rate={outcome.conversionRates.offer} />
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Stack>
  )
}

function OutcomeCell({ count, rate }: { count: number; rate: number | null }) {
  return (
    <Table.Cell textAlign="end">
      {rate === null ? (
        <Text aria-label="Rate unavailable" color="fg.subtle">—</Text>
      ) : (
        <Stack align="end" gap="0">
          <Text fontWeight="semibold">{formatPercentage(rate)}</Text>
          <Text color="fg.subtle" fontSize="xs">{count} application{count === 1 ? '' : 's'}</Text>
        </Stack>
      )}
    </Table.Cell>
  )
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 }).format(value)}%`
}
