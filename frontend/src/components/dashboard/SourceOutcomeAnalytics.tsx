import { Box, Button, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import type { SourceOutcome } from '../../types/dashboard'

export function SourceOutcomeAnalytics({ outcomes }: { outcomes: SourceOutcome[] }) {
  return (
    <Stack gap="4">
      <Stack gap="1">
        <Heading as="h3" size="lg">Source outcomes</Heading>
        <Text color="fg.muted" fontSize="sm">
          Current outcomes by application source. Rates use submitted applications for that source; saved and unassigned applications are excluded.
        </Text>
        <Text color="fg.subtle" fontSize="xs">
          Response includes screening, assessment, interview, offer, and rejected statuses. Interview includes interview and offer statuses.
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
          <Heading as="h4" size="md">No source outcome data yet</Heading>
          <Text color="fg.muted" fontSize="sm">
            Add a source to an application to compare where your opportunities originate.
          </Text>
          <Button asChild colorPalette="brand" size="sm">
            <Link to="/applications/new">Create an application</Link>
          </Button>
        </Stack>
      ) : (
        <Box
          aria-label="Scrollable source outcome comparison"
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
          <Table.Root aria-label="Source outcome comparison" minW="44rem" size="md" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Source</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Submitted</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Response</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Interview</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Offer</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {outcomes.map((outcome) => (
                <Table.Row aria-label={`Outcomes for ${outcome.source}`} key={outcome.source.toLocaleLowerCase('en-US')}>
                  <Table.Cell>
                    <Text fontWeight="semibold">{outcome.source}</Text>
                    {outcome.submittedApplications === 0 && (
                      <Text color="fg.subtle" fontSize="xs">No submitted applications</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="end" fontWeight="semibold">{outcome.submittedApplications}</Table.Cell>
                  <OutcomeCell count={outcome.outcomeCounts.response} rate={outcome.outcomeRates.response} />
                  <OutcomeCell count={outcome.outcomeCounts.interview} rate={outcome.outcomeRates.interview} />
                  <OutcomeCell count={outcome.outcomeCounts.offer} rate={outcome.outcomeRates.offer} />
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
