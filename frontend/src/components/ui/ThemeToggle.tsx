import { Button } from '@chakra-ui/react'
import { useColorMode } from './colorMode'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()
  const nextMode = colorMode === 'light' ? 'dark' : 'light'

  return (
    <Button
      aria-label={`Switch to ${nextMode} theme`}
      flex="1"
      minW="0"
      size="sm"
      variant="outline"
      whiteSpace="nowrap"
      onClick={toggleColorMode}
    >
      <span aria-hidden="true">{colorMode === 'light' ? '☾' : '☀'}</span>
      {nextMode === 'dark' ? 'Dark theme' : 'Light theme'}
    </Button>
  )
}
