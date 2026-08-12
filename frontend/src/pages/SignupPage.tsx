import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Field, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useSession } from '../hooks/useSession'
import { useSignup } from '../hooks/useSignup'
import { signupSchema, type SignupInput, type SignupRequest } from '../schemas/signup.schema'
import { getApiErrorMessage } from '../utils/apiError'

/** Public account-creation page for password-authenticated users. */
export function SignupPage() {
  const session = useSession()
  const signup = useSignup()
  const passwordSignupEnabled = import.meta.env.VITE_ENABLE_PASSWORD_LOGIN === 'true'
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', username: '', email: '', password: '', confirmPassword: '' },
  })

  const submit = async ({ confirmPassword: _confirmPassword, ...input }: SignupInput) => {
    await signup.mutateAsync(input as SignupRequest)
  }

  if (session.data?.user) return <Navigate to="/applications" replace />
  if (!passwordSignupEnabled) return <Navigate to="/login" replace />

  return (
    <Box minH="100vh" bg="bg.subtle" color="fg" px={{ base: '4', sm: '6' }} py={{ base: '20', md: '10' }} position="relative">
      <Box position="absolute" right={{ base: '4', md: '7' }} top={{ base: '4', md: '7' }}><ThemeToggle /></Box>
      <Container maxW="lg">
        <Stack bg="bg.panel" borderColor="border" borderRadius="2xl" borderWidth="1px" boxShadow="xl" gap="6" p={{ base: '6', sm: '9' }}>
          <Stack gap="2">
            <Text color="purple.fg" fontSize="sm" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase">Job Tracker</Text>
            <Heading as="h1" fontSize={{ base: '2xl', md: '3xl' }}>Create your account</Heading>
            <Text color="fg.muted">Start tracking applications in your private workspace.</Text>
          </Stack>

          {signup.isError && (
            <Alert.Root status="error" borderRadius="md">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Unable to create account</Alert.Title>
                <Alert.Description>{getApiErrorMessage(signup.error, 'Please review your details and try again.')}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          <form onSubmit={handleSubmit(submit)} noValidate>
            <Stack gap="4">
              <Field.Root invalid={Boolean(errors.name)} required><Field.Label>Name</Field.Label><Input {...register('name')} autoComplete="name" /><Field.ErrorText>{errors.name?.message}</Field.ErrorText></Field.Root>
              <Field.Root invalid={Boolean(errors.username)} required><Field.Label>Username</Field.Label><Input {...register('username')} autoComplete="username" /><Field.HelperText>Letters, numbers, underscores, and hyphens.</Field.HelperText><Field.ErrorText>{errors.username?.message}</Field.ErrorText></Field.Root>
              <Field.Root invalid={Boolean(errors.email)} required><Field.Label>Email</Field.Label><Input {...register('email')} autoComplete="email" type="email" /><Field.ErrorText>{errors.email?.message}</Field.ErrorText></Field.Root>
              <Field.Root invalid={Boolean(errors.password)} required><Field.Label>Password</Field.Label><Input {...register('password')} autoComplete="new-password" type="password" /><Field.HelperText>Use 12–72 characters with upper and lowercase letters and a number.</Field.HelperText><Field.ErrorText>{errors.password?.message}</Field.ErrorText></Field.Root>
              <Field.Root invalid={Boolean(errors.confirmPassword)} required><Field.Label>Confirm password</Field.Label><Input {...register('confirmPassword')} autoComplete="new-password" type="password" /><Field.ErrorText>{errors.confirmPassword?.message}</Field.ErrorText></Field.Root>
              <Button type="submit" colorPalette="purple" loading={signup.isPending} minH="11">Create account</Button>
            </Stack>
          </form>

          <Text color="fg.muted" fontSize="sm" textAlign="center">Already have an account? <Link to="/login">Sign in</Link></Text>
        </Stack>
      </Container>
    </Box>
  )
}
