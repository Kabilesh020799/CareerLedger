import type { PropsWithChildren } from 'react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'

export function AppProvider({ children }: PropsWithChildren) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}
