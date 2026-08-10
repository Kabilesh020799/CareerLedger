(function exposeJobExtraction(root, factory) {
  const extraction = factory()
  root.JobTrackerExtraction = extraction
  if (typeof module === 'object' && module.exports) module.exports = extraction
})(globalThis, () => {
  const salaryPeriods = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR']

  function asText(value) {
    if (typeof value === 'string') return value.trim()
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ')
    return value?.name || value?.value || ''
  }

  function uniqueItems(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 50)
  }

  function extractSkills(posting) {
    const values = [posting?.skills, posting?.qualifications]
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .flatMap((value) => asText(value).split(/[,;\n•]+/))
    return uniqueItems(values)
  }

  function extractSalary(posting) {
    const salary = posting?.baseSalary
    const value = typeof salary?.value === 'object' ? salary.value : salary
    const numberOrNull = (candidate) => candidate === null || candidate === undefined || candidate === '' ? null : Number(candidate)
    const numericValue = numberOrNull(typeof value === 'number' ? value : value?.value)
    const min = numberOrNull(value?.minValue)
    const max = numberOrNull(value?.maxValue)
    const unit = asText(value?.unitText || salary?.unitText).toUpperCase()
    const salaryPeriod = salaryPeriods.find((period) => unit.includes(period)) || null
    return {
      salaryMin: Number.isFinite(min) ? min : Number.isFinite(numericValue) ? numericValue : null,
      salaryMax: Number.isFinite(max) ? max : Number.isFinite(numericValue) ? numericValue : null,
      salaryCurrency: asText(salary?.currency).toUpperCase().match(/^[A-Z]{3}$/)?.[0] || null,
      salaryPeriod,
    }
  }

  function formatLocation(location) {
    if (typeof location === 'string') return location.trim()
    const address = location?.address || location
    return [address?.addressLocality, address?.addressRegion, address?.addressCountry]
      .map(asText).filter(Boolean).join(', ')
  }

  function extractLocation(posting) {
    const locations = Array.isArray(posting?.jobLocation) ? posting.jobLocation : [posting?.jobLocation]
    const result = uniqueItems(locations.map(formatLocation))
    if (result.length) return result.join(' · ')
    return asText(posting?.applicantLocationRequirements)
  }

  function extractWorkMode(posting, description = '') {
    const jobLocationType = asText(posting?.jobLocationType).toLowerCase()
    const searchable = `${jobLocationType} ${description}`.toLowerCase()
    if (/\bhybrid\b/.test(searchable)) return 'HYBRID'
    if (/telecommute|\bremote\b|work from home/.test(searchable)) return 'REMOTE'
    if (/\bon[ -]?site\b|in[ -]?office/.test(searchable)) return 'ONSITE'
    return null
  }

  function extractStructuredFields(posting, description = '') {
    return {
      skills: extractSkills(posting),
      experienceRequirements: asText(posting?.experienceRequirements) || null,
      ...extractSalary(posting),
      location: extractLocation(posting),
      workMode: extractWorkMode(posting, description),
    }
  }

  return { extractStructuredFields }
})
