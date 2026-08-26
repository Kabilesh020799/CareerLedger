import type { Sprint } from '../types/application'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/** Returns the browser timezone used for whole-day sprint scheduling. */
export function getLocalSprintTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'
}

/** Formats a sprint boundary for the user's local timezone. */
export function formatSprintDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'an unknown date'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

/** Formats a scheduled whole-day sprint start without implying a separate time choice. */
export function formatSprintDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'date unavailable'

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date)
}

export function toLocalSprintDateInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Converts a date input's local calendar date to an ISO timestamp at local midnight. */
export function localSprintDateInputToIso(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toISOString()
}

/** Prevents same-day midnight values from failing the future-start rule. */
export function earliestFutureSprintDate(now = new Date()) {
  return toLocalSprintDateInput(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
  )
}

/** Finds the first whole day after the latest known sprint window. */
export function nextAvailableSprintDate(
  currentSprint: Sprint | null,
  scheduledSprints: Sprint[],
  now = new Date(),
) {
  const timestamps = [now.getTime()]
  if (currentSprint) timestamps.push(Date.parse(currentSprint.endsAt))
  for (const sprint of scheduledSprints) timestamps.push(Date.parse(sprint.endsAt))

  const latestTimestamp = Math.max(...timestamps.filter(Number.isFinite))
  const latestDate = new Date(Number.isFinite(latestTimestamp) ? latestTimestamp : now.getTime())
  return toLocalSprintDateInput(
    new Date(latestDate.getFullYear(), latestDate.getMonth(), latestDate.getDate() + 1).toISOString(),
  )
}

export function calculatedSprintEndAt(sprint: Sprint) {
  const startAt = sprint.scheduledStartAt ?? sprint.startedAt
  const timestamp = Date.parse(startAt)
  if (Number.isFinite(timestamp)) {
    return new Date(timestamp + sprint.durationDays * MILLISECONDS_PER_DAY).toISOString()
  }

  return sprint.endsAt
}
