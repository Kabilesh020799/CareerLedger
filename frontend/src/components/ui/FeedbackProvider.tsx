import { Alert, Box, CloseButton, Portal, Stack } from '@chakra-ui/react'
import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'
import { FeedbackContext, type FeedbackContextValue, type FeedbackStatus } from './feedback-context'

type FeedbackMessage = {
  id: number
  title: string
  description?: string
  status: FeedbackStatus
}

/** Provides short, accessible confirmation messages for successful and failed actions. */
export function FeedbackProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([])
  const dismiss = useCallback((id: number) => setMessages((current) => current.filter((message) => message.id !== id)), [])
  const show = useCallback<FeedbackContextValue['show']>((title, options) => {
    const id = Date.now() + Math.random()
    setMessages((current) => [...current.slice(-2), { id, title, description: options?.description, status: options?.status ?? 'success' }])
    window.setTimeout(() => dismiss(id), 5000)
  }, [dismiss])
  const value = useMemo(() => ({ show }), [show])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Portal>
        <Stack aria-live="polite" bottom={{ base: '20', lg: '5' }} gap="3" maxW="calc(100vw - 2rem)" position="fixed" right={{ base: '4', lg: '5' }} w="sm" zIndex="toast">
          {messages.map((message) => (
            <Alert.Root boxShadow="lg" borderRadius="lg" key={message.id} status={message.status}>
              <Alert.Indicator />
              <Alert.Content><Alert.Title>{message.title}</Alert.Title>{message.description && <Alert.Description>{message.description}</Alert.Description>}</Alert.Content>
              <Box ml="auto"><CloseButton aria-label="Dismiss notification" size="sm" onClick={() => dismiss(message.id)} /></Box>
            </Alert.Root>
          ))}
        </Stack>
      </Portal>
    </FeedbackContext.Provider>
  )
}
