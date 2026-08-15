import { Box, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'

type LoadingSkeletonProps = { variant?: 'cards' | 'board' | 'table' | 'details'; label?: string }

/** Keeps page structure visible while server data is loading. */
export function LoadingSkeleton({ variant = 'cards', label = 'Loading content' }: LoadingSkeletonProps) {
  if (variant === 'table') return <Stack aria-label={label} gap="2"><Skeleton h="12" borderRadius="lg" />{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} h="14" borderRadius="md" />)}</Stack>
  if (variant === 'details') return <Stack aria-label={label} gap="5"><Skeleton h="20" borderRadius="card" /><SimpleGrid columns={{ base: 1, md: 2 }} gap="4">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} h="24" borderRadius="card" />)}</SimpleGrid></Stack>
  if (variant === 'board') return <Stack aria-label={label} gap="3"><Skeleton display={{ base: 'block', md: 'none' }} h="9" borderRadius="full" /><SimpleGrid columns={{ base: 1, md: 4 }} gap="4">{Array.from({ length: 4 }, (_, index) => <Stack bg="bg.muted" borderRadius="card" gap="3" key={index} p="3"><Skeleton h="6" w="40%" /><Skeleton h="28" borderRadius="lg" /><Skeleton h="28" borderRadius="lg" /></Stack>)}</SimpleGrid></Stack>
  return <SimpleGrid aria-label={label} columns={{ base: 2, lg: 4 }} gap="4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} h={{ base: '24', md: '28' }} borderRadius="card" />)}</SimpleGrid>
}

/** Standard panel surface used across workflows. */
export function Surface({ children, ...props }: React.ComponentProps<typeof Box>) {
  return <Box bg="bg.panel" borderColor="border" borderRadius="card" borderWidth="1px" shadow="card" {...props}>{children}</Box>
}
