import { Alert, Box, Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { Download, Upload } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { dataTransferService } from '../services/data-transfer.service'

type BackupPreview = { document: unknown; fileName: string; applicationCount: number; workspaceName?: string }

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsText(file)
  })
}

/** Provides deliberate export and review-before-import controls for portable workspace data. */
export function DataSettingsPage() {
  const { workspaceId } = useWorkspace()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<BackupPreview | null>(null)

  const download = async () => {
    if (!workspaceId) return
    setBusy(true); setError('')
    try {
      const blob = await dataTransferService.exportWorkspace(workspaceId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `job-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click(); URL.revokeObjectURL(url); setMessage('Backup downloaded.')
    } catch { setError('The backup could not be created. Try again.') } finally { setBusy(false) }
  }

  const selectFile = async (file?: File) => {
    setMessage(''); setError(''); setPreview(null)
    if (!file) return
    try {
      const document = JSON.parse(await readTextFile(file)) as { applications?: unknown[]; workspace?: { name?: string } }
      if (!Array.isArray(document.applications)) throw new Error('Invalid backup')
      setPreview({ document, fileName: file.name, applicationCount: document.applications.length, workspaceName: document.workspace?.name })
    } catch { setError('This is not a valid Job Tracker backup.') }
  }

  const importBackup = async () => {
    if (!preview || !workspaceId) return
    setBusy(true); setError('')
    try {
      const result = await dataTransferService.importWorkspace(workspaceId, preview.document)
      setMessage(`Imported ${result.created} application${result.created === 1 ? '' : 's'}; skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}.`)
      setPreview(null)
    } catch { setError('Import failed. The backup may be invalid or incompatible.') } finally { setBusy(false) }
  }

  return <Stack gap="7" maxW="4xl">
    <PageHeader title="Data and backups" description="Download a portable backup or restore applications into the selected workspace." eyebrow="Settings" />
    {(message || error) && <Alert.Root status={error ? 'error' : 'success'}><Alert.Indicator /><Alert.Content><Alert.Title>{error || message}</Alert.Title></Alert.Content></Alert.Root>}
    <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '7' }}>
      <Flex align="start" gap="4"><Box color="purple.fg"><Download aria-hidden /></Box><Box><Text fontSize="lg" fontWeight="semibold">Download backup</Text><Text color="fg.muted" fontSize="sm">Includes applications, reminders, and timeline events. Resume files and account secrets are excluded.</Text></Box></Flex>
      <Button alignSelf="start" colorPalette="purple" onClick={download} loading={busy}><Download aria-hidden size={17} />Download JSON backup</Button>
    </Stack>
    <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '7' }}>
      <Flex align="start" gap="4"><Box color="purple.fg"><Upload aria-hidden /></Box><Box><Text fontSize="lg" fontWeight="semibold">Restore from backup</Text><Text color="fg.muted" fontSize="sm">Choose a file to review its contents before anything is imported.</Text></Box></Flex>
      <Field.Root><Field.Label>Job Tracker backup</Field.Label><Input aria-label="Import JSON backup" type="file" accept="application/json,.json" disabled={busy} onChange={(event) => void selectFile(event.target.files?.[0])} /></Field.Root>
      {preview && <Alert.Root status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>Review import</Alert.Title><Alert.Description><Text><strong>{preview.fileName}</strong> contains {preview.applicationCount} application{preview.applicationCount === 1 ? '' : 's'}{preview.workspaceName ? ` from ${preview.workspaceName}` : ''}. Existing duplicates will be skipped.</Text><Flex gap="3" mt="4" wrap="wrap"><Button colorPalette="purple" loading={busy} onClick={importBackup}>Import applications</Button><Button variant="outline" onClick={() => setPreview(null)}>Cancel</Button></Flex></Alert.Description></Alert.Content></Alert.Root>}
    </Stack>
  </Stack>
}
