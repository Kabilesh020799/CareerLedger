import { Alert, Button, Dialog, Field, Input, Portal, Stack, Textarea } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { CustomSelect } from '../ui/CustomSelect'
import { useCreateCalendarItem } from '../../hooks/useCalendar'
import type { CreateCalendarItemInput } from '../../types/calendar'
import { getApiErrorMessage } from '../../utils/apiError'
import { useApplicationOptions } from '../../hooks/useApplicationOptions'

const types = [{ value: 'TASK', label: 'Task' }, { value: 'EVENT', label: 'Event' }, { value: 'REMINDER', label: 'Reminder' }]
const localValue = (date: Date) => { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16) }

/** Creates a persisted task, event, or reminder for a selected calendar date. */
export function CreateCalendarItemDialog({ date, onClose }: { date: Date | null; onClose: () => void }) {
  const create = useCreateCalendarItem()
  const resetCreate = create.reset
  const [type, setType] = useState<CreateCalendarItemInput['type']>('TASK')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [applicationId, setApplicationId] = useState('')
  const applications = useApplicationOptions(Boolean(date))
  const applicationOptions = [{ value: '', label: 'No linked application' }, ...(applications.data ?? []).map((application) => ({ value: application.id, label: `${application.company} — ${application.jobTitle}` }))]
  useEffect(() => { if (date) { const start = new Date(date); start.setHours(9, 0, 0, 0); setStartsAt(localValue(start)); setEndsAt(''); setTitle(''); setDescription(''); setApplicationId(''); setType('TASK'); resetCreate() } }, [date, resetCreate])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !startsAt) return
    await create.mutateAsync({ type, title: title.trim(), description: description.trim() || null, startsAt: new Date(startsAt).toISOString(), endsAt: endsAt ? new Date(endsAt).toISOString() : null, applicationId: applicationId || null })
    onClose()
  }

  return <Dialog.Root open={Boolean(date)} onOpenChange={(details) => { if (!details.open) onClose() }}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content maxW="lg"><form onSubmit={submit}><Dialog.Header><Dialog.Title>Add calendar item</Dialog.Title></Dialog.Header><Dialog.Body><Stack gap="4">{date && <Field.Root><Field.Label>Date</Field.Label><Input readOnly value={date.toLocaleDateString()} /></Field.Root>}<Field.Root required><Field.Label>Type</Field.Label><CustomSelect aria-label="Calendar item type" options={types} value={type} onChange={(value) => setType(value as CreateCalendarItemInput['type'])} /></Field.Root><Field.Root invalid={applications.isError}><Field.Label>Application</Field.Label><CustomSelect aria-label="Linked application" disabled={applications.isPending || applications.isError} options={applicationOptions} placeholder={applications.isPending ? 'Loading applications…' : 'No linked application'} value={applicationId} onChange={setApplicationId} /><Field.HelperText>{applications.isError ? 'Applications could not be loaded. You can still create this item without a link.' : 'Optional. Linking lets you open the application from this calendar item.'}</Field.HelperText></Field.Root><Field.Root required><Field.Label>Title</Field.Label><Input autoFocus maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></Field.Root><Field.Root required><Field.Label>Starts</Field.Label><Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></Field.Root>{type === 'EVENT' && <Field.Root><Field.Label>Ends</Field.Label><Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></Field.Root>}<Field.Root><Field.Label>Description</Field.Label><Textarea maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></Field.Root>{create.isError && <Alert.Root status="error"><Alert.Indicator /><Alert.Content><Alert.Title>Unable to add item</Alert.Title><Alert.Description>{getApiErrorMessage(create.error, 'Please check the details and try again.')}</Alert.Description></Alert.Content></Alert.Root>}</Stack></Dialog.Body><Dialog.Footer><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button colorPalette="brand" type="submit" loading={create.isPending}>Add {type.toLowerCase()}</Button></Dialog.Footer></form></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
}
