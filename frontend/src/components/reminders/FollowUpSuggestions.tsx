import { Alert, Badge, Box, Button, Flex, Heading, Link as ChakraLink, Spinner, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'
import { useCreateSuggestedFollowUp } from '../../hooks/useCreateSuggestedFollowUp'
import { useFollowUpSuggestions } from '../../hooks/useFollowUpSuggestions'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatReminderDate } from '../../utils/reminder'

export function FollowUpSuggestions() {
  const suggestionsQuery = useFollowUpSuggestions()
  const createFollowUp = useCreateSuggestedFollowUp()

  return (
    <Stack gap="4">
      <Stack gap="1">
        <Heading as="h3" size="lg">Suggested follow-ups</Heading>
        <Text color="fg.muted" fontSize="sm">
          Applied applications with no activity or follow-up for more than seven days.
        </Text>
      </Stack>

      {createFollowUp.isError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to add suggested follow-up</Alert.Title>
            <Alert.Description>{getApiErrorMessage(createFollowUp.error, 'The application may no longer qualify.')}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}

      {suggestionsQuery.isPending && (
        <Flex align="center" aria-label="Loading follow-up suggestions" gap="3">
          <Spinner color="purple.fg" size="sm" />
          <Text color="fg.muted">Checking for follow-ups…</Text>
        </Flex>
      )}

      {suggestionsQuery.isError && (
        <Alert.Root status="error" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unable to load follow-up suggestions</Alert.Title>
            <Alert.Description>{getApiErrorMessage(suggestionsQuery.error, 'Please try again.')}</Alert.Description>
          </Alert.Content>
          <Button ml="auto" size="sm" variant="outline" onClick={() => suggestionsQuery.refetch()}>Retry</Button>
        </Alert.Root>
      )}

      {suggestionsQuery.isSuccess && suggestionsQuery.data.length === 0 && (
        <Box bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" p="5">
          <Text fontWeight="medium">No follow-ups suggested</Text>
          <Text color="fg.muted" fontSize="sm" mt="1">You are caught up with inactive applications.</Text>
        </Box>
      )}

      {suggestionsQuery.isSuccess && suggestionsQuery.data.length > 0 && (
        <Stack gap="3">
          {suggestionsQuery.data.map((suggestion) => (
            <Flex
              align={{ base: 'start', md: 'center' }}
              as="article"
              aria-label={`Follow up with ${suggestion.application.company}`}
              bg="bg.warning"
              borderColor="border.warning"
              borderRadius="xl"
              borderWidth="1px"
              direction={{ base: 'column', md: 'row' }}
              gap="4"
              justify="space-between"
              key={suggestion.application.id}
              p="4"
            >
              <Stack gap="2">
                <Badge alignSelf="start" colorPalette="orange">Suggested</Badge>
                <ChakraLink asChild color="purple.fg" fontWeight="semibold">
                  <Link to={`/applications/${suggestion.application.id}`}>
                    {suggestion.application.company} — {suggestion.application.jobTitle}
                  </Link>
                </ChakraLink>
                <Text color="fg.muted" fontSize="sm">
                  Last activity {formatReminderDate(suggestion.lastActivityAt)}
                </Text>
              </Stack>
              <Button
                colorPalette="purple"
                loading={createFollowUp.isPending && createFollowUp.variables === suggestion.application.id}
                size="sm"
                onClick={() => createFollowUp.mutate(suggestion.application.id)}
              >
                Add follow-up
              </Button>
            </Flex>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
