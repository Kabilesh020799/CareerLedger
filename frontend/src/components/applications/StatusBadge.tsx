import { Badge } from '@chakra-ui/react'
import type { ApplicationStatus } from '../../types/application'
import { applicationStatusPalettes } from '../ui/palette'

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
      colorPalette={applicationStatusPalettes[status]}
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
