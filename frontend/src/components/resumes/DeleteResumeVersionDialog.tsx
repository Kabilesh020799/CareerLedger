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
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete resume version?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                “{name}” will be removed. Associated applications will remain without a resume version.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild><Button variant="outline">Cancel</Button></Dialog.ActionTrigger>
              <Button colorPalette="red" loading={isDeleting} onClick={onConfirm}>
                Delete resume version
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
