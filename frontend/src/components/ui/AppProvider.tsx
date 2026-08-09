import type { PropsWithChildren } from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { ColorModeProvider } from './ColorModeProvider'
import { appSystem } from './theme'

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <ColorModeProvider>
      <ChakraProvider value={appSystem}>{children}</ChakraProvider>
    </ColorModeProvider>
  )
}
