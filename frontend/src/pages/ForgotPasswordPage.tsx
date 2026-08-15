import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Field, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { emailRequestSchema, type EmailRequestInput } from '../schemas/account.schema'
import { accountService } from '../services/account.service'

/** Requests a password-reset email without revealing whether an account exists. */
export function ForgotPasswordPage() {
  const request = useMutation({ mutationFn: ({ email }: EmailRequestInput) => accountService.forgotPassword(email) })
  const { register, handleSubmit, formState: { errors } } = useForm<EmailRequestInput>({ resolver: zodResolver(emailRequestSchema), defaultValues: { email: '' } })
  return <Box minH="100vh" bg="bg.subtle" px="4" py="20" position="relative"><Box position="absolute" right="4" top="4"><ThemeToggle /></Box><Container maxW="lg"><Stack bg="bg.panel" borderWidth="1px" borderColor="border" borderRadius="2xl" p={{ base: '6', sm: '9' }} gap="6"><Stack gap="2"><Heading>Password reset</Heading><Text color="fg.muted">Enter your account email. If it can receive a reset link, we’ll send one.</Text></Stack>{request.isSuccess && <Alert.Root status="success"><Alert.Indicator /><Alert.Content><Alert.Title>Check your inbox</Alert.Title><Alert.Description>If an eligible account exists, a reset link has been sent.</Alert.Description></Alert.Content></Alert.Root>}<form onSubmit={handleSubmit((value) => request.mutate(value))}><Stack gap="4"><Field.Root invalid={Boolean(errors.email)}><Field.Label>Email</Field.Label><Input type="email" autoComplete="email" {...register('email')} /><Field.ErrorText>{errors.email?.message}</Field.ErrorText></Field.Root><Button type="submit" colorPalette="brand" loading={request.isPending}>Send reset link</Button></Stack></form><Text fontSize="sm"><Link to="/login">Back to sign in</Link></Text></Stack></Container></Box>
}
