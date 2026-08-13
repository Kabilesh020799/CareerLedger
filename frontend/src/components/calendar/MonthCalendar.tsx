import { Badge, Box, Button, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CalendarEvent } from '../../types/calendar'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const keyOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

/** Responsive month view for application deadlines and interview milestones. */
export function MonthCalendar({ month, events, onMonthChange }: { month: Date; events: CalendarEvent[]; onMonthChange: (month: Date) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const grouped = new Map<string, CalendarEvent[]>()
  for (const event of events) { const key = keyOf(new Date(event.startsAt)); grouped.set(key, [...(grouped.get(key) ?? []), event]) }
  const inMonth = (event: CalendarEvent) => { const date = new Date(event.startsAt); return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear() }

  return <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '4', md: '6' }}>
    <Flex align="center" justify="space-between" gap="3"><Button aria-label="Previous month" size="sm" variant="outline" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft aria-hidden size={18} /></Button><Heading as="h2" size="lg">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Heading><Button aria-label="Next month" size="sm" variant="outline" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight aria-hidden size={18} /></Button></Flex>
    <Grid display={{ base: 'none', md: 'grid' }} gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap="1">
      {weekdays.map((day) => <Text key={day} color="fg.subtle" fontSize="xs" fontWeight="bold" p="2" textAlign="center">{day}</Text>)}
      {days.map((day) => { const items = grouped.get(keyOf(day)) ?? []; return <Stack key={day.toISOString()} aria-label={day.toLocaleDateString()} bg={keyOf(day) === keyOf(new Date()) ? 'purple.subtle' : 'bg.subtle'} borderColor="border" borderRadius="md" borderWidth="1px" minH="7.5rem" opacity={day.getMonth() === month.getMonth() ? 1 : 0.45} p="2" gap="1"><Text fontSize="sm" fontWeight="medium">{day.getDate()}</Text>{items.slice(0, 3).map((event) => <Box asChild key={event.uid}><Link to={`/applications/${event.applicationId}`}><Badge colorPalette={event.kind === 'INTERVIEW' ? 'purple' : 'orange'} display="block" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" width="full">{event.summary}</Badge></Link></Box>)}{items.length > 3 && <Text color="fg.muted" fontSize="xs">+{items.length - 3} more</Text>}</Stack> })}
    </Grid>
    <Stack display={{ base: 'flex', md: 'none' }} gap="3">{events.filter(inMonth).map((event) => <Box key={event.uid} borderColor="border" borderRadius="lg" borderWidth="1px" p="3"><Flex align="start" justify="space-between" gap="3"><Stack gap="1"><Text fontWeight="semibold">{event.summary}</Text><Text color="fg.muted" fontSize="sm">{new Date(event.startsAt).toLocaleString()}</Text>{event.location && <Text color="fg.subtle" fontSize="sm">{event.location}</Text>}</Stack><Badge colorPalette={event.kind === 'INTERVIEW' ? 'purple' : 'orange'}>{event.kind === 'INTERVIEW' ? 'Interview' : 'Deadline'}</Badge></Flex><Button asChild mt="3" size="xs" variant="outline"><Link to={`/applications/${event.applicationId}`}>View application</Link></Button></Box>)}{!events.some(inMonth) && <Text color="fg.muted" py="6" textAlign="center">No deadlines or interviews this month.</Text>}</Stack>
  </Stack>
}
