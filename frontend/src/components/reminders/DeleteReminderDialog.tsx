import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

type DeleteReminderDialogProps = {
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteReminderDialog({
  isDeleting,
  onConfirm,
}: DeleteReminderDialogProps) {
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
              <Dialog.Title>Delete reminder?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>This reminder will be permanently deleted.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" loading={isDeleting} onClick={onConfirm}>
                Delete reminder
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
