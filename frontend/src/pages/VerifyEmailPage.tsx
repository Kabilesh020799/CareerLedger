import { Alert, Box, Button, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { accountService } from '../services/account.service'

/** Consumes an email-verification token and presents a clear terminal state. */
export function VerifyEmailPage() {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''
  const verify = useMutation({ mutationFn: () => accountService.verifyEmail(token) })
  useEffect(() => { if (token && verify.isIdle) verify.mutate() }, [token, verify])
  const status = !token || verify.isError ? 'error' : verify.isSuccess ? 'success' : 'info'
  return <Box minH="100vh" bg="bg.subtle" px="4" py="20"><Container maxW="lg"><Stack bg="bg.panel" borderWidth="1px" borderColor="border" borderRadius="2xl" p="8" gap="6"><Heading>Verify your email</Heading><Alert.Root status={status}><Alert.Indicator /><Alert.Content><Alert.Title>{status === 'success' ? 'Email verified' : status === 'error' ? 'Unable to verify email' : 'Verifying your email…'}</Alert.Title><Alert.Description>{status === 'error' ? 'This link may be invalid or expired.' : status === 'success' ? 'Your account email is now verified.' : 'Please wait.'}</Alert.Description></Alert.Content></Alert.Root><Button asChild colorPalette="purple"><Link to="/login">Continue to sign in</Link></Button><Text color="fg.muted" fontSize="sm">Verification links can be used only once.</Text></Stack></Container></Box>
}
