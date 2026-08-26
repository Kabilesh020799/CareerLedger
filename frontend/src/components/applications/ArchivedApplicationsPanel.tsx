import { Alert, Button, Flex, Heading, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useArchivedSprints } from '../../hooks/useArchivedSprints'
import { StatusBadge } from './StatusBadge'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatSprintDateTime } from '../../utils/sprint'

/** Displays rejected applications grouped under the sprint that archived them. */
export function ArchivedApplicationsPanel() {
  const archivedQuery = useArchivedSprints()

  return (
    <Stack
      aria-labelledby="archived-applications-heading"
      as="section"
      bg="bg.panel"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      gap="4"
      p={{ base: '5', md: '6' }}
    >
      <Stack gap="1">
        <Heading as="h2" id="archived-applications-heading" size="lg">Archived applications</Heading>
        <Text color="fg.muted" fontSize="sm">Review applications from completed sprints.</Text>
      </Stack>

      {archivedQuery.isPending && <LoadingSkeleton label="Loading archived applications" />}

      {archivedQuery.isError && (
        <Alert.Root role="alert" status="error">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load archived applications</Alert.Title>
            <Alert.Description>{getApiErrorMessage(archivedQuery.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button alignSelf="center" ml="auto" size="sm" variant="outline" onClick={() => archivedQuery.refetch()}>
            Retry
          </Button>
        </Alert.Root>
      )}

      {archivedQuery.isSuccess && archivedQuery.data.length === 0 && (
        <Text color="fg.muted">No archived applications yet.</Text>
      )}

      {archivedQuery.isSuccess && archivedQuery.data.length > 0 && (
        <Stack gap="6">
          {archivedQuery.data.map(({ sprint, applications }) => (
            <Stack aria-labelledby={`archived-sprint-${sprint.id}`} as="section" gap="3" key={sprint.id}>
              <Flex align={{ base: 'start', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="2" justify="space-between">
                <Heading as="h3" id={`archived-sprint-${sprint.id}`} size="md">{sprint.name}</Heading>
                <Text color="fg.muted" fontSize="sm">
                  Sprint {sprint.sequence} · Closed {sprint.closedAt ? formatSprintDateTime(sprint.closedAt) : 'date unavailable'}
                </Text>
              </Flex>
              {applications.length === 0 ? (
                <Text color="fg.muted" fontSize="sm">No applications were archived in this sprint.</Text>
              ) : (
                <Stack gap="3">
                  {applications.map((archivedApplication) => (
                    <Flex
                      align={{ base: 'start', sm: 'center' }}
                      aria-label={`${archivedApplication.company}, ${archivedApplication.jobTitle}`}
                      as="article"
                      borderColor="border"
                      borderRadius="lg"
                      borderWidth="1px"
                      gap="3"
                      justify="space-between"
                      key={archivedApplication.id}
                      p="4"
                      wrap="wrap"
                    >
                      <Stack gap="1">
                        <ChakraLink asChild color="brand.fg" fontWeight="semibold">
                          <Link to={`/applications/${archivedApplication.id}`}>
                            <Text as="span" display="block">{archivedApplication.company}</Text>
                            <Text as="span" color="fg" display="block" fontSize="sm" fontWeight="normal">{archivedApplication.jobTitle}</Text>
                          </Link>
                        </ChakraLink>
                      </Stack>
                      <StatusBadge status={archivedApplication.status} />
                    </Flex>
                  ))}
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
