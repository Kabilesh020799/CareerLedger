import { Button, Heading, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Stack align="start" gap="4">
      <Heading as="h2" size="2xl">Page not found</Heading>
      <Text color="fg.muted">The page you requested does not exist.</Text>
      <Button asChild colorPalette="purple">
        <Link to="/applications">Return to applications</Link>
      </Button>
    </Stack>
  )
}
