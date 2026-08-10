const fields = ['company', 'jobTitle', 'location', 'jobUrl', 'jobDescription']
const status = document.querySelector('#status')
const form = document.querySelector('#captureForm')

async function loadSettings() {
  const saved = await chrome.storage.local.get(['apiUrl', 'token'])
  document.querySelector('#apiUrl').value = saved.apiUrl || 'http://localhost:3000/api'
  document.querySelector('#token').value = saved.token || ''
  if (saved.token) await extractPosting()
}

async function extractPosting() {
  status.textContent = 'Reading this page…'
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('No active tab')
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' })
    for (const field of fields) document.querySelector(`#${field}`).value = result?.[field] || ''
    form.hidden = false
    status.textContent = 'Review the proposed details, then save.'
  } catch {
    status.textContent = 'This page could not be read. Open a normal job-posting tab and try again.'
  }
}

document.querySelector('#saveSettings').addEventListener('click', async () => {
  const apiUrl = document.querySelector('#apiUrl').value.trim().replace(/\/$/, '')
  const token = document.querySelector('#token').value.trim()
  await chrome.storage.local.set({ apiUrl, token })
  status.textContent = 'Settings saved.'
  if (token) await extractPosting()
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const button = document.querySelector('#capture')
  button.disabled = true
  status.textContent = 'Saving…'
  try {
    const { apiUrl, token } = await chrome.storage.local.get(['apiUrl', 'token'])
    const payload = Object.fromEntries(fields.map((field) => [field, document.querySelector(`#${field}`).value.trim() || null]))
    const response = await fetch(`${String(apiUrl).replace(/\/$/, '')}/browser-extension/captures`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'The posting could not be saved.')
    status.textContent = `Saved ${body.jobTitle} at ${body.company}.`
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'The posting could not be saved.'
  } finally {
    button.disabled = false
  }
})

void loadSettings()
