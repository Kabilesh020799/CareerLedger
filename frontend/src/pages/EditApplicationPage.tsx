import { Alert, Box, Button, Flex, Heading, Spinner, Stack, Text } from '@chakra-ui/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApplicationForm } from '../components/applications/ApplicationForm'
import { useApplication } from '../hooks/useApplication'
import { useUpdateApplication } from '../hooks/useUpdateApplication'
import { applicationFormResume, applicationFormToInput, applicationToFormValues } from '../schemas/application.schema'
import { getApiErrorMessage } from '../utils/apiError'

export function EditApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const applicationQuery = useApplication(id)
  const updateApplication = useUpdateApplication()

  if (applicationQuery.isPending) {
    return <Flex minH="18rem" align="center" justify="center" aria-label="Loading application"><Spinner color="purple.fg" size="xl" /></Flex>
  }

  if (applicationQuery.isError || !id) {
    return (
      <Alert.Root status="error"><Alert.Indicator /><Alert.Title>Unable to load application</Alert.Title></Alert.Root>
    )
  }

  const application = applicationQuery.data

  return (
    <Stack gap="6" maxW="4xl">
      <Box>
        <Button asChild variant="plain" px="0" mb="3">
          <Link to={`/applications/${application.id}`}>← Back to application</Link>
        </Button>
        <Heading as="h1" size="2xl">Edit application</Heading>
        <Text color="fg.muted" mt="1">Update your application to {application.company}.</Text>
      </Box>

      <Box bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="xl" p={{ base: '5', md: '8' }}>
        <ApplicationForm
          initialValues={applicationToFormValues(application)}
          submitLabel="Save changes"
          isSubmitting={updateApplication.isPending}
          serverError={updateApplication.isError ? getApiErrorMessage(updateApplication.error, 'Please try again.') : undefined}
          allowResumeAttachment
          cancelTo={`/applications/${application.id}`}
          currentResumeFileName={application.resumeAttachment?.fileName}
          onSubmit={async (values) => {
            await updateApplication.mutateAsync({
              id,
              input: applicationFormToInput(values),
              resume: applicationFormResume(values),
            })
            navigate(`/applications/${id}`)
          }}
        />
      </Box>
    </Stack>
  )
}
