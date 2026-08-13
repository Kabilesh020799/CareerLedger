import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Field, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas/account.schema'
import { accountService } from '../services/account.service'
import { getApiErrorMessage } from '../utils/apiError'

/** Completes a password reset from a one-time emailed token. */
export function ResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''
  const reset = useMutation({ mutationFn: (input: ResetPasswordInput) => accountService.resetPassword(token, input.password) })
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } })
  return <Box minH="100vh" bg="bg.subtle" px="4" py="20"><Container maxW="lg"><Stack bg="bg.panel" borderWidth="1px" borderColor="border" borderRadius="2xl" p={{ base: '6', sm: '9' }} gap="6"><Heading>Choose a new password</Heading>{!token && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Reset link is incomplete</Alert.Title></Alert.Content></Alert.Root>}{reset.isSuccess ? <Alert.Root status="success"><Alert.Indicator /><Alert.Content><Alert.Title>Password updated</Alert.Title><Alert.Description><Link to="/login">Sign in with your new password</Link></Alert.Description></Alert.Content></Alert.Root> : <form onSubmit={handleSubmit((value) => reset.mutate(value))}><Stack gap="4">{reset.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Unable to reset password</Alert.Title><Alert.Description>{getApiErrorMessage(reset.error, 'The link may be invalid or expired.')}</Alert.Description></Alert.Content></Alert.Root>}<Field.Root invalid={Boolean(errors.password)}><Field.Label>New password</Field.Label><Input type="password" autoComplete="new-password" {...register('password')} /><Field.ErrorText>{errors.password?.message}</Field.ErrorText></Field.Root><Field.Root invalid={Boolean(errors.confirmPassword)}><Field.Label>Confirm password</Field.Label><Input type="password" autoComplete="new-password" {...register('confirmPassword')} /><Field.ErrorText>{errors.confirmPassword?.message}</Field.ErrorText></Field.Root><Button disabled={!token} type="submit" colorPalette="purple" loading={reset.isPending}>Update password</Button></Stack></form>}<Text fontSize="sm"><Link to="/login">Back to sign in</Link></Text></Stack></Container></Box>
}
