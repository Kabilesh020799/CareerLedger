import { Box, Button, Flex, Heading, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type PageHeaderProps = {
  title: string
  description: string
  eyebrow?: string
  action?: { label: string; to: string }
  children?: ReactNode
}

/** Provides consistent hierarchy and responsive actions for top-level pages. */
export function PageHeader({ title, description, eyebrow, action, children }: PageHeaderProps) {
  return (
    <Flex align={{ base: 'stretch', sm: 'end' }} direction={{ base: 'column', sm: 'row' }} gap="5" justify="space-between">
      <Stack gap="1.5" maxW="3xl">
        {eyebrow && <Text color="purple.fg" fontSize="xs" fontWeight="bold" letterSpacing="0.08em" textTransform="uppercase">{eyebrow}</Text>}
        <Heading as="h2" fontSize={{ base: '2xl', md: '3xl' }} letterSpacing="-0.025em">{title}</Heading>
        <Text color="fg.muted" fontSize={{ base: 'sm', md: 'md' }}>{description}</Text>
      </Stack>
      <Box flexShrink="0">
        {action && <Button asChild colorPalette="purple" minH="11" w={{ base: 'full', sm: 'auto' }}><Link to={action.to}>{action.label}</Link></Button>}
        {children}
      </Box>
    </Flex>
  )
}
