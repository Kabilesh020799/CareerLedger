import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react'
import { Link, useNavigate } from 'react-router-dom'
import { ApplicationForm } from '../components/applications/ApplicationForm'
import { useCreateApplication } from '../hooks/useCreateApplication'
import { applicationFormToInput, emptyApplicationForm } from '../schemas/application.schema'
import { getApiErrorMessage } from '../utils/apiError'

export function NewApplicationPage() {
  const navigate = useNavigate()
  const createApplication = useCreateApplication()

  return (
    <Stack gap="6" maxW="4xl">
      <Box>
        <Button asChild variant="plain" px="0" mb="3">
          <Link to="/applications">← Back to applications</Link>
        </Button>
        <Heading as="h2" size="2xl">Add application</Heading>
        <Text color="gray.600" mt="1">Record an opportunity and keep its progress organized.</Text>
      </Box>

      <Box bg="white" borderWidth="1px" borderRadius="xl" p={{ base: '5', md: '8' }}>
        <ApplicationForm
          initialValues={emptyApplicationForm}
          submitLabel="Create application"
          isSubmitting={createApplication.isPending}
          serverError={createApplication.isError ? getApiErrorMessage(createApplication.error, 'Please try again.') : undefined}
          onSubmit={async (values) => {
            const application = await createApplication.mutateAsync(applicationFormToInput(values))
            navigate(`/applications/${application.id}`)
          }}
        />
      </Box>
    </Stack>
  )
}
