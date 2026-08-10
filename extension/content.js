(() => {
  if (globalThis.__jobTrackerCaptureLoaded) return
  globalThis.__jobTrackerCaptureLoaded = true
  function text(selector) {
    return document.querySelector(selector)?.textContent?.trim() || ''
  }

  function jobPostingJsonLd() {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const parsed = JSON.parse(script.textContent || 'null')
        const candidates = Array.isArray(parsed) ? parsed : parsed?.['@graph'] || [parsed]
        const posting = candidates.find((item) => item?.['@type'] === 'JobPosting')
        if (posting) return posting
      } catch { /* Ignore malformed publisher metadata. */ }
    }
    return null
  }

  function cleanHtml(value) {
    if (!value) return ''
    const container = document.createElement('div')
    container.innerHTML = value
    return container.textContent?.replace(/\n{3,}/g, '\n\n').trim() || ''
  }

  const posting = jobPostingJsonLd()
  const company = posting?.hiringOrganization?.name || text('[data-company-name]') || text('.company-name') || document.querySelector('meta[property="og:site_name"]')?.content || ''
  const jobTitle = posting?.title || text('h1') || document.title.split(/[|–—-]/)[0].trim()
  const address = posting?.jobLocation?.address
  const jobLocation = typeof posting?.jobLocation === 'string'
    ? posting.jobLocation
    : [address?.addressLocality, address?.addressRegion, address?.addressCountry].filter(Boolean).join(', ') || text('[data-job-location]') || text('.job-location')
  const description = cleanHtml(posting?.description) || text('[data-job-description]') || text('.job-description') || text('main')

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'EXTRACT_JOB') {
      sendResponse({ company, jobTitle, location: jobLocation, jobUrl: window.location.href, jobDescription: description.slice(0, 50000) })
    }
  })
})()
