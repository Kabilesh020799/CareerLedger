import { Button } from '@chakra-ui/react'
import { useColorMode } from './colorMode'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()
  const nextMode = colorMode === 'light' ? 'dark' : 'light'

  return (
    <Button
      aria-label={`Switch to ${nextMode} theme`}
      flex="1"
      minW="7.5rem"
      px="3"
      size="sm"
      variant="outline"
      whiteSpace="nowrap"
      onClick={toggleColorMode}
    >
      {colorMode === 'light' ? <Moon aria-hidden size={17} /> : <Sun aria-hidden size={17} />}
      {nextMode === 'dark' ? 'Dark theme' : 'Light theme'}
    </Button>
  )
}
