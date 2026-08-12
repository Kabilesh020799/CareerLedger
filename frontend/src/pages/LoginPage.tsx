import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Field, Flex, Heading, Input, Separator, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { usePasswordLogin } from '../hooks/usePasswordLogin'
import { useSession } from '../hooks/useSession'
import { loginSchema, type LoginInput } from '../schemas/login.schema'
import { googleLoginUrl } from '../services/auth.service'
import { getApiErrorMessage } from '../utils/apiError'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const errorMessages: Record<string, string> = {
  oauth: 'Google sign-in was not completed. Please try again.',
  unavailable: 'Google sign-in has not been configured for this environment.',
}

export function LoginPage() {
  const session = useSession()
  const passwordLogin = usePasswordLogin()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const passwordLoginEnabled = import.meta.env.VITE_ENABLE_PASSWORD_LOGIN === 'true'
  const googleLoginEnabled = import.meta.env.VITE_ENABLE_GOOGLE_LOGIN === 'true'
  const insecureHttpDeployment = import.meta.env.VITE_INSECURE_HTTP_DEPLOYMENT === 'true'
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const submitPasswordLogin = async (input: LoginInput) => {
    await passwordLogin.mutateAsync(input)
  }

  if (session.data?.user) return <Navigate to="/applications" replace />

  return (
    <Box minH="100vh" bg="bg.subtle" color="fg" display="grid" placeItems="center" px={{ base: '4', sm: '6' }} py={{ base: '20', lg: '10' }} position="relative">
      <Box position="absolute" right={{ base: '4', md: '7' }} top={{ base: '4', md: '7' }} zIndex="docked">
        <ThemeToggle />
      </Box>
      <Container maxW="6xl">
        <SimpleGrid bg="bg.panel" borderColor="border" borderRadius="2xl" borderWidth="1px" boxShadow="xl" columns={{ base: 1, lg: 2 }} overflow="hidden">
        <Stack bg="purple.solid" color="purple.contrast" display={{ base: 'none', lg: 'flex' }} gap="8" justify="space-between" minH="40rem" p="12">
          <Stack gap="5"><Flex align="center" bg="whiteAlpha.300" borderRadius="xl" fontSize="xl" fontWeight="bold" h="12" justify="center" w="12">JT</Flex><Heading fontSize="4xl" letterSpacing="-0.04em" maxW="sm">Keep every opportunity moving.</Heading><Text color="whiteAlpha.800" fontSize="lg" maxW="md">One focused workspace for applications, follow-ups, documents, and recruitment updates.</Text></Stack>
          <Text color="whiteAlpha.700" fontSize="sm">Your job search stays private to your account.</Text>
        </Stack>
        <Stack gap="6" justify="center" p={{ base: '6', sm: '9', md: '12' }}>
          <Stack gap="2">
            <Text color="purple.fg" fontSize="sm" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase">Job Tracker</Text>
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>Welcome back</Heading>
            <Text color="fg.muted">Sign in to continue your job search.</Text>
          </Stack>

          {insecureHttpDeployment && (
            <Alert.Root status="warning" borderRadius="md">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Insecure HTTP connection</Alert.Title>
                <Alert.Description>
                  Your username, password, and session are not encrypted in transit.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {error && (
            <Box role="alert" bg="bg.error" color="fg.error" borderRadius="md" px="4" py="3">
              {errorMessages[error] ?? 'Sign-in failed. Please try again.'}
            </Box>
          )}

          {passwordLoginEnabled && (
            <form onSubmit={handleSubmit(submitPasswordLogin)} noValidate>
              <Stack gap="4">
                {passwordLogin.isError && (
                  <Alert.Root status="error" borderRadius="md">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Unable to sign in</Alert.Title>
                      <Alert.Description>
                        {getApiErrorMessage(passwordLogin.error, 'Invalid username or password')}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert.Root>
                )}

                <Field.Root invalid={Boolean(errors.username)} required>
                  <Field.Label>Username</Field.Label>
                  <Input {...register('username')} autoComplete="username" />
                  <Field.ErrorText>{errors.username?.message}</Field.ErrorText>
                </Field.Root>

                <Field.Root invalid={Boolean(errors.password)} required>
                  <Field.Label>Password</Field.Label>
                  <Input {...register('password')} type="password" autoComplete="current-password" />
                  <Field.ErrorText>{errors.password?.message}</Field.ErrorText>
                </Field.Root>

                <Button type="submit" colorPalette="purple" loading={passwordLogin.isPending} minH="11">
                  Sign in
                </Button>
                <Text color="fg.muted" fontSize="sm" textAlign="center">
                  New to Job Tracker? <Link to="/signup">Create an account</Link>
                </Text>
              </Stack>
            </form>
          )}

          {passwordLoginEnabled && googleLoginEnabled && <Separator />}

          {googleLoginEnabled && (
            <Button asChild colorPalette="purple" size="lg">
              <a href={googleLoginUrl}>Continue with Google</a>
            </Button>
          )}

          <Text color="fg.subtle" fontSize="xs">
            Your applications are private to your signed-in account.
          </Text>
        </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  )
}
