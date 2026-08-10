import type { PropsWithChildren } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { ColorModeProvider } from './ColorModeProvider'
import { appSystem } from './theme'
import { FeedbackProvider } from './FeedbackProvider'

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <ChakraProvider value={appSystem}><FeedbackProvider>{children}</FeedbackProvider></ChakraProvider>
    </ColorModeProvider>
  )
}
