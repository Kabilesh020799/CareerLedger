import { useLayoutEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { ColorModeContext, colorModeStorageKey, type ColorMode } from './colorMode'

function initialColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'light'

  const storedMode = window.localStorage.getItem(colorModeStorageKey)
  if (storedMode === 'light' || storedMode === 'dark') return storedMode

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function ColorModeProvider({ children }: PropsWithChildren) {
  const [colorMode, setColorMode] = useState<ColorMode>(initialColorMode)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', colorMode === 'dark')
    root.dataset.theme = colorMode
    root.style.colorScheme = colorMode
    window.localStorage.setItem(colorModeStorageKey, colorMode)
  }, [colorMode])

  const value = useMemo(
    () => ({
      colorMode,
      toggleColorMode: () => setColorMode((mode) => mode === 'light' ? 'dark' : 'light'),
    }),
    [colorMode],
  )

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  )
}
