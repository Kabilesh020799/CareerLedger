import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react'

export function DisconnectGmailDialog({
  isDisconnecting,
  onConfirm,
}: {
  isDisconnecting: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog.Root role="alertdialog">
      <Dialog.Trigger asChild>
        <Button colorPalette="red" variant="outline">Disconnect Gmail</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="calc(100dvh - 2rem)" maxW={{ base: 'calc(100vw - 2rem)', sm: 'md' }} overflowY="auto">
            <Dialog.Header>
              <Dialog.Title>Disconnect Gmail?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                Stored Gmail authorization and synchronized message references will be deleted. Your tracked applications will not change.
              </Text>
            </Dialog.Body>
            <Dialog.Footer alignItems={{ base: 'stretch', sm: 'center' }} flexDirection={{ base: 'column-reverse', sm: 'row' }}>
              <Dialog.ActionTrigger asChild>
                <Button w={{ base: 'full', sm: 'auto' }} variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" loading={isDisconnecting} w={{ base: 'full', sm: 'auto' }} onClick={onConfirm}>
                Disconnect Gmail
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
