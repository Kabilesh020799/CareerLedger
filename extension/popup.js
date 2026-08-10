const fields = ['company', 'jobTitle', 'location', 'jobUrl', 'experienceRequirements', 'salaryMin', 'salaryMax', 'salaryCurrency', 'salaryPeriod', 'workMode', 'jobDescription']
const status = document.querySelector('#status')
const form = document.querySelector('#captureForm')
const emptyState = document.querySelector('#emptyState')
const settingsPanel = document.querySelector('#settingsPanel')
const connectionBadge = document.querySelector('#connectionBadge')

function showStatus(message, tone = 'neutral') {
  status.textContent = message
  status.className = `status ${tone}`
  status.hidden = !message
}

function setConnected(connected) {
  connectionBadge.textContent = connected ? 'Connected' : 'Not connected'
  connectionBadge.classList.toggle('connected', connected)
  settingsPanel.open = !connected
}

async function loadSettings() {
  const saved = await chrome.storage.local.get(['apiUrl', 'token'])
  document.querySelector('#apiUrl').value = saved.apiUrl || 'http://localhost:3000/api'
  document.querySelector('#token').value = saved.token || ''
  const connected = Boolean(saved.apiUrl && saved.token)
  setConnected(connected)
  if (connected) await extractPosting()
}

async function extractPosting() {
  showStatus('Reading this page…')
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('No active tab')
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['extraction.js', 'content.js'] })
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' })
    for (const field of fields) document.querySelector(`#${field}`).value = result?.[field] || ''
    document.querySelector('#skills').value = (result?.skills || []).join(', ')
    form.hidden = false
    emptyState.hidden = true
    showStatus('Page details loaded. Check the required fields before saving.', 'success')
  } catch {
    form.hidden = true
    emptyState.hidden = false
    showStatus('This page could not be read. Open a normal job-posting tab and try again.', 'error')
  }
}

document.querySelector('#saveSettings').addEventListener('click', async () => {
  const apiUrl = document.querySelector('#apiUrl').value.trim().replace(/\/$/, '')
  const token = document.querySelector('#token').value.trim()
  if (!apiUrl || !token) {
    setConnected(false)
    showStatus('Enter both the API URL and extension token.', 'error')
    return
  }
  await chrome.storage.local.set({ apiUrl, token })
  setConnected(true)
  showStatus('Connection saved.', 'success')
  await extractPosting()
})

document.querySelector('#refreshPosting').addEventListener('click', extractPosting)

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const button = document.querySelector('#capture')
  button.disabled = true
  showStatus('Saving application…')
  try {
    const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
    const payload = Object.fromEntries(fields.map((field) => {
      const value = document.querySelector(`#${field}`).value.trim()
      return [field, ['salaryMin', 'salaryMax'].includes(field) && value ? Number(value) : value || null]
    }))
    payload.skills = document.querySelector('#skills').value.split(/[,;\n]+/).map((skill) => skill.trim()).filter(Boolean)
    const response = await fetch(`${String(apiUrl).replace(/\/$/, '')}/browser-extension/captures`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'The posting could not be saved.')
    showStatus(`Saved ${body.jobTitle} at ${body.company}.`, 'success')
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'The posting could not be saved.', 'error')
  } finally {
    button.disabled = false
  }
})

void loadSettings()
