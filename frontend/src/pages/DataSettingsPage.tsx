import { Alert, Box, Button, Field, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { z } from 'zod'
import { PageHeader } from '../components/ui/PageHeader'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { dataTransferService } from '../services/data-transfer.service'

type BackupPreview = { document: unknown; fileName: string; applicationCount: number; workspaceName?: string }

const backupPreviewSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime({ offset: true }),
  workspace: z.object({ name: z.string().trim().min(1) }),
  applications: z.array(z.object({
    company: z.string().trim().min(1),
    jobTitle: z.string().trim().min(1),
    status: z.string().trim().min(1),
    events: z.array(z.unknown()),
    reminders: z.array(z.unknown()),
  }).passthrough()).max(1_000),
}).passthrough()

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const download = async () => {
    if (!workspaceId) return
    setBusy(true); setError('')
    try {
      const blob = await dataTransferService.exportWorkspace(workspaceId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `careerledger-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click(); URL.revokeObjectURL(url); setMessage('Backup downloaded.')
    } catch { setError('The backup could not be created. Try again.') } finally { setBusy(false) }
  }

  const selectFile = async (file?: File) => {
    setMessage(''); setError(''); setPreview(null)
    if (!file) return
    try {
      const document = backupPreviewSchema.parse(JSON.parse(await readTextFile(file)))
      setPreview({ document, fileName: file.name, applicationCount: document.applications.length, workspaceName: document.workspace.name })
    } catch { setError('This is not a valid CareerLedger backup.') }
  }

  const importBackup = async () => {
    if (!preview || !workspaceId) return
    setBusy(true); setError('')
    try {
      const result = await dataTransferService.importWorkspace(workspaceId, preview.document)
      setMessage(`Imported ${result.created} application${result.created === 1 ? '' : 's'}; skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}.`)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch { setError('Import failed. The backup may be invalid or incompatible.') } finally { setBusy(false) }
  }

  return <Stack gap="7" maxW="4xl">
    <PageHeader title="Data and backups" description="Download a portable backup or restore applications into the selected workspace." eyebrow="Settings" />
    {(message || error) && <Alert.Root status={error ? 'error' : 'success'}><Alert.Indicator /><Alert.Content><Alert.Title>{error || message}</Alert.Title></Alert.Content></Alert.Root>}
    <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '7' }}>
      <Flex align="start" gap="4"><Box color="brand.fg"><Download aria-hidden /></Box><Box><Text fontSize="lg" fontWeight="semibold">Download backup</Text><Text color="fg.muted" fontSize="sm">Includes applications, reminders, and timeline events. Resume files and account secrets are excluded.</Text></Box></Flex>
      <Button alignSelf="start" colorPalette="brand" onClick={download} loading={busy}><Download aria-hidden size={17} />Download JSON backup</Button>
    </Stack>
    <Stack bg="bg.panel" borderColor="border" borderRadius="xl" borderWidth="1px" gap="4" p={{ base: '5', md: '7' }}>
      <Flex align="start" gap="4"><Box color="brand.fg"><Upload aria-hidden /></Box><Box><Text fontSize="lg" fontWeight="semibold">Restore from backup</Text><Text color="fg.muted" fontSize="sm">Choose a file to review its contents before anything is imported.</Text></Box></Flex>
      <Field.Root>
        <Field.Label>CareerLedger backup</Field.Label>
        <Input
          ref={fileInputRef}
          id="backup-file"
          aria-label="Import JSON backup"
          type="file"
          accept="application/json,.json"
          disabled={busy}
          position="absolute"
          h="1px"
          w="1px"
          opacity="0"
          overflow="hidden"
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
        <Flex align={{ base: 'stretch', sm: 'center' }} direction={{ base: 'column', sm: 'row' }} gap="3">
          <Button asChild alignSelf={{ base: 'stretch', sm: 'start' }} variant="outline">
            <label htmlFor="backup-file"><Upload aria-hidden size={17} />Choose JSON backup</label>
          </Button>
          <Text color="fg.muted" fontSize="sm" overflowWrap="anywhere">
            {preview?.fileName ?? 'No file selected'}
          </Text>
        </Flex>
        <Field.HelperText>JSON files only. Maximum 1,000 applications.</Field.HelperText>
      </Field.Root>
      {preview && <Alert.Root status="info"><Alert.Indicator /><Alert.Content><Alert.Title>Review import</Alert.Title><Alert.Description><Text><strong>{preview.fileName}</strong> contains {preview.applicationCount} application{preview.applicationCount === 1 ? '' : 's'}{preview.workspaceName ? ` from ${preview.workspaceName}` : ''}. Existing duplicates will be skipped.</Text><Flex gap="3" mt="4" wrap="wrap"><Button colorPalette="brand" loading={busy} onClick={importBackup}>Import applications</Button><Button variant="outline" onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}>Cancel</Button></Flex></Alert.Description></Alert.Content></Alert.Root>}
    </Stack>
  </Stack>
}
