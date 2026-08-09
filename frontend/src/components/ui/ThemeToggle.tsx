import { Button } from '@chakra-ui/react'
import { useColorMode } from './colorMode'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()
  const nextMode = colorMode === 'light' ? 'dark' : 'light'

  return (
    <Button
      aria-label={`Switch to ${nextMode} theme`}
      size="sm"
      variant="outline"
      onClick={toggleColorMode}
    >
      <span aria-hidden="true">{colorMode === 'light' ? '☾' : '☀'}</span>
      {nextMode === 'dark' ? 'Dark theme' : 'Light theme'}
    </Button>
  )
}
