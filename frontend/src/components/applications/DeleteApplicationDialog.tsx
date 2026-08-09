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
        <Button colorPalette="red" flex={{ base: '1', sm: 'initial' }} variant="outline">Delete</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="calc(100dvh - 2rem)" maxW={{ base: 'calc(100vw - 2rem)', sm: 'md' }} overflowY="auto">
            <Dialog.Header>
              <Dialog.Title>Delete application?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>This will permanently delete your application to {company}.</Text>
            </Dialog.Body>
            <Dialog.Footer alignItems={{ base: 'stretch', sm: 'center' }} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
              <Dialog.ActionTrigger asChild>
                <Button w={{ base: 'full', sm: 'auto' }} variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" loading={isDeleting} w={{ base: 'full', sm: 'auto' }} onClick={onConfirm}>Delete application</Button>
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
