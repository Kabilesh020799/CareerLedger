import { createContext, useContext } from 'react'

export type ColorMode = 'light' | 'dark'

export const colorModeStorageKey = 'job-tracker-color-mode'

export type ColorModeContextValue = {
  colorMode: ColorMode
  toggleColorMode: () => void
}

export const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined)

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) throw new Error('useColorMode must be used within ColorModeProvider')
  return context
}
