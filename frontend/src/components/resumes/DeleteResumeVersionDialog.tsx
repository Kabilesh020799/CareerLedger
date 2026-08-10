import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

type DeleteResumeVersionDialogProps = {
  name: string
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteResumeVersionDialog({
  name,
  isDeleting,
  onConfirm,
}: DeleteResumeVersionDialogProps) {
  return (
    <Dialog.Root role="alertdialog">
      <Dialog.Trigger asChild>
        <Button colorPalette="red" size="sm" variant="ghost">Delete</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="calc(100dvh - 2rem)" maxW={{ base: 'calc(100vw - 2rem)', sm: 'md' }} overflowY="auto">
            <Dialog.Header>
              <Dialog.Title>Delete resume tag?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                “{name}” will be removed. Associated applications will remain without a resume tag.
              </Text>
            </Dialog.Body>
            <Dialog.Footer alignItems={{ base: 'stretch', sm: 'center' }} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
              <Dialog.ActionTrigger asChild><Button w={{ base: 'full', sm: 'auto' }} variant="outline">Cancel</Button></Dialog.ActionTrigger>
              <Button colorPalette="red" loading={isDeleting} w={{ base: 'full', sm: 'auto' }} onClick={onConfirm}>
                Delete resume tag
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
