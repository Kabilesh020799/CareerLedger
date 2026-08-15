import { Alert, Box, Button, CloseButton, Dialog, Flex, Portal, Spinner, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { applicationService } from '../../services/application.service'
import { apiBaseUrl } from '../../services/api'
import type { UploadedResume } from '../../types/resume'

type ResumePreviewDialogProps = {
  resume: UploadedResume
}

/** Displays PDF resumes inside the application while retaining a direct fallback. */
export function ResumePreviewDialog({ resume }: ResumePreviewDialogProps) {
  const resumeUrl = `${apiBaseUrl}/applications/${resume.applicationId}/resume`
  const canPreview = resume.mimeType === 'application/pdf'
  const [open, setOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [previewError, setPreviewError] = useState(false)

  useEffect(() => {
    if (!open || !canPreview) return
    let active = true
    let objectUrl: string | undefined
    setPreviewError(false)
    applicationService.downloadResume(resume.applicationId)
      .then((document) => {
        if (!active) return
        objectUrl = URL.createObjectURL(document)
        setPreviewUrl(objectUrl)
      })
      .catch(() => {
        if (active) setPreviewError(true)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setPreviewUrl(undefined)
    }
  }, [canPreview, open, resume.applicationId])

  return (
    <Dialog.Root open={open} size="cover" onOpenChange={(details) => setOpen(details.open)}>
      <Dialog.Trigger asChild>
        <Button alignSelf="flex-start" size="sm" variant="outline">View resume</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner p={{ base: '2', md: '6' }}>
          <Dialog.Content bg="bg.panel" h={{ base: 'calc(100dvh - 1rem)', md: 'calc(100dvh - 3rem)' }} maxW="6xl" overflow="hidden">
            <Dialog.Header borderBottomColor="border" borderBottomWidth="1px">
              <Stack gap="0.5" minW="0">
                <Dialog.Title truncate>{resume.fileName}</Dialog.Title>
                <Text color="fg.muted" fontSize="sm">{resume.application.jobTitle} · {resume.application.company}</Text>
              </Stack>
            </Dialog.Header>
            <Dialog.Body bg="bg.muted" display="flex" minH="0" p={{ base: '2', md: '4' }}>
              {canPreview && previewUrl ? (
                <Box asChild bg="white" borderRadius="lg" flex="1" minH="0" shadow="sm">
                  <iframe src={previewUrl} title={`Preview of ${resume.fileName}`} />
                </Box>
              ) : canPreview && !previewError ? (
                <Flex align="center" aria-label="Loading resume preview" flex="1" justify="center"><Spinner color="brand.fg" size="xl" /></Flex>
              ) : previewError ? (
                <Alert.Root alignSelf="center" maxW="lg" status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Unable to preview resume</Alert.Title><Alert.Description>Try opening the document in a new tab.</Alert.Description></Alert.Content></Alert.Root>
              ) : (
                <Stack align="center" flex="1" justify="center" p="8" textAlign="center">
                  <Text fontWeight="semibold">Preview is not available for this file type</Text>
                  <Text color="fg.muted" maxW="md">Open the document in a compatible application to review it.</Text>
                </Stack>
              )}
            </Dialog.Body>
            <Dialog.Footer borderTopColor="border" borderTopWidth="1px">
              <Flex gap="3" justify="flex-end" w="full">
                <Dialog.ActionTrigger asChild><Button variant="outline">Close</Button></Dialog.ActionTrigger>
                <Button asChild colorPalette="brand"><a href={resumeUrl} rel="noreferrer" target="_blank">Open in new tab</a></Button>
              </Flex>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
