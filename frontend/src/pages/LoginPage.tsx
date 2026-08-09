import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Field, Heading, Input, Separator, Stack, Text } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { Navigate, useSearchParams } from 'react-router-dom'
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
    <Box minH="100vh" bg="bg.subtle" color="fg" display="grid" placeItems="center" px={{ base: '4', sm: '5' }} py={{ base: '20', sm: '12' }} position="relative">
      <Box position="absolute" right={{ base: '4', md: '7' }} top={{ base: '4', md: '7' }}>
        <ThemeToggle />
      </Box>
      <Container maxW="md">
        <Stack bg="bg.panel" borderColor="border" borderWidth="1px" borderRadius="2xl" boxShadow="lg" gap="6" p={{ base: '6', sm: '7', md: '10' }}>
          <Stack gap="2">
            <Heading color="purple.fg">Job Tracker</Heading>
            <Text color="fg.muted">Sign in to access your applications.</Text>
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
                <Text fontWeight="semibold">Account login</Text>

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

                <Button type="submit" colorPalette="purple" loading={passwordLogin.isPending}>
                  Sign in
                </Button>
              </Stack>
            </form>
          )}

          {passwordLoginEnabled && googleLoginEnabled && <Separator />}

          {googleLoginEnabled && (
            <Button asChild colorPalette="purple" size="lg">
              <a href={googleLoginUrl}>Continue with Google</a>
            </Button>
          )}

          <Text color="fg.subtle" fontSize="sm">
            Your applications are private to your signed-in account.
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}
