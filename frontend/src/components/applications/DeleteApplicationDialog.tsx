import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

type DeleteApplicationDialogProps = {
  company: string
  isDeleting: boolean
  onConfirm: () => void
}

export function DeleteApplicationDialog({ company, isDeleting, onConfirm }: DeleteApplicationDialogProps) {
  return (
    <Dialog.Root role="alertdialog">
      <Dialog.Trigger asChild>
        <Button colorPalette="red" variant="outline">Delete</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete application?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>This will permanently delete your application to {company}.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" loading={isDeleting} onClick={onConfirm}>Delete application</Button>
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
