import { Badge, Box, Button, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CalendarEvent } from '../../types/calendar'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const keyOf = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
const palette = (kind: CalendarEvent['kind']) => kind === 'INTERVIEW' || kind === 'EVENT' ? 'purple' : kind === 'TASK' ? 'blue' : 'orange'

/** Responsive month view whose dates can be selected to create calendar items. */
export function MonthCalendar({ month, events, onMonthChange, onSelectDate }: { month: Date; events: CalendarEvent[]; onMonthChange: (month: Date) => void; onSelectDate: (date: Date) => void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - first.getDay())
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const grouped = new Map<string, CalendarEvent[]>()
  for (const event of events) { const key = keyOf(new Date(event.startsAt)); grouped.set(key, [...(grouped.get(key) ?? []), event]) }
  const inMonth = (event: CalendarEvent) => { const date = new Date(event.startsAt); return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear() }

  const eventBadge = (event: CalendarEvent) => event.applicationId
    ? <Box asChild key={event.uid}><Link to={`/applications/${event.applicationId}`}><Badge colorPalette={palette(event.kind)} display="block" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" width="full">{event.summary}</Badge></Link></Box>
    : <Badge key={event.uid} colorPalette={palette(event.kind)} display="block" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" width="full">{event.summary}</Badge>

  return <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '4', md: '6' }}>
    <Flex align="center" justify="space-between" gap="3"><Button aria-label="Previous month" size="sm" variant="outline" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft aria-hidden size={18} /></Button><Heading as="h2" size="lg">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Heading><Button aria-label="Next month" size="sm" variant="outline" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight aria-hidden size={18} /></Button></Flex>
    <Grid display={{ base: 'none', md: 'grid' }} gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap="1">
      {weekdays.map((day) => <Text key={day} color="fg.subtle" fontSize="xs" fontWeight="bold" p="2" textAlign="center">{day}</Text>)}
      {days.map((day) => { const items = grouped.get(keyOf(day)) ?? []; return <Stack key={day.toISOString()} bg={keyOf(day) === keyOf(new Date()) ? 'purple.subtle' : 'bg.subtle'} borderColor="border" borderRadius="md" borderWidth="1px" minH="7.5rem" opacity={day.getMonth() === month.getMonth() ? 1 : 0.45} p="2" gap="1"><Button aria-label={`Add item on ${day.toLocaleDateString()}`} alignSelf="start" h="7" minW="7" px="1" size="xs" variant="ghost" onClick={() => onSelectDate(day)}>{day.getDate()}<Plus aria-hidden size={13} /></Button>{items.slice(0, 3).map(eventBadge)}{items.length > 3 && <Text color="fg.muted" fontSize="xs">+{items.length - 3} more</Text>}</Stack> })}
    </Grid>
    <Stack display={{ base: 'flex', md: 'none' }} gap="3"><Button variant="outline" onClick={() => onSelectDate(new Date(month.getFullYear(), month.getMonth(), new Date().getDate()))}><Plus aria-hidden size={17} />Add calendar item</Button>{events.filter(inMonth).map((event) => <Box key={event.uid} borderColor="border" borderRadius="lg" borderWidth="1px" p="3"><Flex align="start" justify="space-between" gap="3"><Stack gap="1"><Text fontWeight="semibold">{event.summary}</Text><Text color="fg.muted" fontSize="sm">{new Date(event.startsAt).toLocaleString()}</Text>{event.location && <Text color="fg.subtle" fontSize="sm">{event.location}</Text>}</Stack><Badge colorPalette={palette(event.kind)}>{event.kind.toLowerCase()}</Badge></Flex>{event.applicationId && <Button asChild mt="3" size="xs" variant="outline"><Link to={`/applications/${event.applicationId}`}>View application</Link></Button>}</Box>)}{!events.some(inMonth) && <Text color="fg.muted" py="6" textAlign="center">No calendar items this month.</Text>}</Stack>
  </Stack>
}
