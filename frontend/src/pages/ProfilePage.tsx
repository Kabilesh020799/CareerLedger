import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Badge, Box, Button, Field, Heading, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton'
import { useAccountProfile, useDeleteAccount, useResendEmailVerification, useUpdateProfile } from '../hooks/accountHooks'
import { deleteAccountSchema, profileSchema, type DeleteAccountInput, type ProfileInput } from '../schemas/account.schema'
import { getApiErrorMessage } from '../utils/apiError'

/** Lets an authenticated user update their display name, verify email, or permanently remove their account. */
export function ProfilePage() {
  const profile = useAccountProfile()
  const update = useUpdateProfile()
  const remove = useDeleteAccount()
  const resend = useResendEmailVerification()
  const navigate = useNavigate()
  const profileForm = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name: '' } })
  const deleteForm = useForm<DeleteAccountInput>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { email: '', password: '' } })

  useEffect(() => {
    if (profile.data) profileForm.reset({ name: profile.data.name ?? '' })
  }, [profile.data, profileForm])

  if (profile.isPending) return <LoadingSkeleton label="Loading profile" />
  if (profile.isError || !profile.data) return <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Unable to load your profile</Alert.Title><Alert.Description>Refresh the page to try again.</Alert.Description></Alert.Content></Alert.Root>

  const deleteAccount = (input: DeleteAccountInput) => remove.mutate(input, { onSuccess: () => navigate('/login', { replace: true }) })

  return <Stack gap="8">
    <PageHeader eyebrow="Settings" title="Profile" description="Manage your account identity, verification, and data." />
    {!profile.data.emailVerified && <Alert.Root status="warning" borderRadius="lg"><Alert.Indicator /><Alert.Content><Alert.Title>Email not verified</Alert.Title><Alert.Description>{resend.isSuccess ? 'A fresh verification link has been sent.' : profile.data.emailDeliveryAvailable ? 'Verify your email to keep account recovery available.' : 'Email delivery is not configured, so verification is currently unavailable.'}</Alert.Description></Alert.Content>{profile.data.emailDeliveryAvailable && <Button alignSelf="center" loading={resend.isPending} size="sm" variant="outline" onClick={() => resend.mutate(profile.data.email)}>Resend verification</Button>}</Alert.Root>}
    <SimpleGrid columns={{ base: 1, xl: 2 }} gap="6">
      <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="5" p={{ base: '5', md: '7' }}>
        <Stack gap="1"><Heading as="h2" size="lg">Account details</Heading><Text color="fg.muted" fontSize="sm">Your username and email identify this account.</Text></Stack>
        <Box><Text color="fg.muted" fontSize="xs" fontWeight="bold" textTransform="uppercase">Email</Text><Text>{profile.data.email}</Text><Badge mt="2" colorPalette={profile.data.emailVerified ? 'green' : 'orange'}>{profile.data.emailVerified ? 'Verified' : 'Unverified'}</Badge></Box>
        {profile.data.username && <Box><Text color="fg.muted" fontSize="xs" fontWeight="bold" textTransform="uppercase">Username</Text><Text>{profile.data.username}</Text></Box>}
        <form onSubmit={profileForm.handleSubmit((input) => update.mutate(input))} noValidate><Stack gap="4"><Field.Root invalid={Boolean(profileForm.formState.errors.name)} required><Field.Label>Display name</Field.Label><Input {...profileForm.register('name')} autoComplete="name" /><Field.ErrorText>{profileForm.formState.errors.name?.message}</Field.ErrorText></Field.Root>{update.isError && <Text color="fg.error" role="alert">{getApiErrorMessage(update.error, 'Unable to update profile.')}</Text>}{update.isSuccess && <Text color="fg.success" role="status">Profile updated.</Text>}<Button alignSelf="start" colorPalette="brand" loading={update.isPending} type="submit">Save profile</Button></Stack></form>
      </Stack>
      <Stack bg="bg.panel" borderColor="red.muted" borderRadius="xl" borderWidth="1px" gap="5" p={{ base: '5', md: '7' }}>
        <Stack gap="1"><Heading as="h2" color="fg.error" size="lg">Delete account</Heading><Text color="fg.muted" fontSize="sm">This permanently deletes applications, resumes, events, reminders, integrations, and account access. It cannot be undone.</Text></Stack>
        <form onSubmit={deleteForm.handleSubmit(deleteAccount)} noValidate><Stack gap="4"><Field.Root invalid={Boolean(deleteForm.formState.errors.email)} required><Field.Label>Type your email to confirm</Field.Label><Input {...deleteForm.register('email')} autoComplete="email" /><Field.ErrorText>{deleteForm.formState.errors.email?.message}</Field.ErrorText></Field.Root>{profile.data.authMethods.password && <Field.Root invalid={Boolean(deleteForm.formState.errors.password)} required><Field.Label>Current password</Field.Label><Input {...deleteForm.register('password')} type="password" autoComplete="current-password" /><Field.ErrorText>{deleteForm.formState.errors.password?.message}</Field.ErrorText></Field.Root>}{remove.isError && <Text color="fg.error" role="alert">{getApiErrorMessage(remove.error, 'Account confirmation failed.')}</Text>}<Button alignSelf="start" colorPalette="red" loading={remove.isPending} type="submit">Permanently delete account</Button></Stack></form>
      </Stack>
    </SimpleGrid>
  </Stack>
}
