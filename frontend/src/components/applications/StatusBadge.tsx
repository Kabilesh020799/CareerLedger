import { Badge } from '@chakra-ui/react'
import type { ApplicationStatus } from '../../types/application'

const palettes: Record<ApplicationStatus, string> = {
  SAVED: 'gray',
  APPLIED: 'blue',
  SCREENING: 'cyan',
  ASSESSMENT: 'purple',
  INTERVIEW: 'orange',
  OFFER: 'green',
  REJECTED: 'red',
  WITHDRAWN: 'gray',
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge colorPalette={palettes[status]}>{status.toLowerCase()}</Badge>
}
