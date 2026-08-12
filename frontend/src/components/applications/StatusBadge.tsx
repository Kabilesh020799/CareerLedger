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

const labels: Record<ApplicationStatus, string> = {
  SAVED: 'Saved',
  APPLIED: 'Applied',
  SCREENING: 'Screening',
  ASSESSMENT: 'Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge
      alignSelf="flex-start"
      borderRadius="full"
      colorPalette={palettes[status]}
      flexShrink="0"
      fontSize="xs"
      fontWeight="semibold"
      lineHeight="1"
      minH="6"
      px="2.5"
      textTransform="none"
      whiteSpace="nowrap"
      w="fit-content"
    >
      {labels[status]}
    </Badge>
  )
}
