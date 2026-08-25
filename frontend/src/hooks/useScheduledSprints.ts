import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import { sprintQueryKeys } from './applicationQueryKeys'

/** Loads future sprint plans from the shared sprint history endpoint. */
export function useScheduledSprints() {
  return useQuery({
    queryKey: sprintQueryKeys.upcoming,
    queryFn: async () => {
      const sprints = await applicationService.listSprints()
      return sprints
        .filter((sprint) => sprint.status === 'SCHEDULED')
        .sort((left, right) => {
          const leftStart = Date.parse(left.scheduledStartAt ?? '')
          const rightStart = Date.parse(right.scheduledStartAt ?? '')
          if (Number.isFinite(leftStart) && Number.isFinite(rightStart)) return leftStart - rightStart
          if (Number.isFinite(leftStart)) return -1
          if (Number.isFinite(rightStart)) return 1
          return right.sequence - left.sequence
        })
    },
  })
}

/** Keeps due scheduled plans actionable without requiring a page refresh. */
export function useSprintTimelineNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    const intervalId = window.setInterval(refresh, 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  return now
}
