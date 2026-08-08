import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Field, Heading, Input, Separator, Stack, Text } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { Navigate, useSearchParams } from 'react-router-dom'
import { usePasswordLogin } from '../hooks/usePasswordLogin'
import { useSession } from '../hooks/useSession'
import { loginSchema, type LoginInput } from '../schemas/login.schema'
import { googleLoginUrl } from '../services/auth.service'
import { getApiErrorMessage } from '../utils/apiError'

const errorMessages: Record<string, string> = {
  oauth: 'Google sign-in was not completed. Please try again.',
  unavailable: 'Google sign-in has not been configured for this environment.',
}

export function LoginPage() {
  const session = useSession()
  const passwordLogin = usePasswordLogin()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const demoLoginEnabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'
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
    <Box minH="100vh" bg="gray.50" display="grid" placeItems="center" px="5">
      <Container maxW="md">
        <Stack bg="white" borderWidth="1px" borderRadius="xl" boxShadow="sm" gap="6" p={{ base: '7', md: '10' }}>
          <Stack gap="2">
            <Heading color="teal.700">Job Tracker</Heading>
            <Text color="gray.600">Sign in to securely access your applications.</Text>
          </Stack>

          {error && (
            <Box role="alert" bg="red.50" color="red.700" borderRadius="md" px="4" py="3">
              {errorMessages[error] ?? 'Sign-in failed. Please try again.'}
            </Box>
          )}

          {demoLoginEnabled && (
            <form onSubmit={handleSubmit(submitPasswordLogin)} noValidate>
              <Stack gap="4">
                <Text fontWeight="semibold">Development account</Text>

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

                <Button type="submit" colorPalette="teal" loading={passwordLogin.isPending}>
                  Sign in
                </Button>
              </Stack>
            </form>
          )}

          {demoLoginEnabled && <Separator />}

          <Button asChild colorPalette="teal" size="lg">
            <a href={googleLoginUrl}>Continue with Google</a>
          </Button>

          <Text color="gray.500" fontSize="sm">
            Your applications are private to your signed-in account.
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}
