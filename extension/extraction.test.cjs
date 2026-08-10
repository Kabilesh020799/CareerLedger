const test = require('node:test')
const assert = require('node:assert/strict')
const { extractStructuredFields } = require('./extraction.js')

test('extracts structured JobPosting metadata', () => {
  const fields = extractStructuredFields({
    skills: 'TypeScript, React; PostgreSQL',
    experienceRequirements: 'Three or more years building web applications',
    baseSalary: { currency: 'CAD', value: { minValue: 90000, maxValue: 120000, unitText: 'YEAR' } },
    jobLocation: [{ address: { addressLocality: 'Halifax', addressRegion: 'NS', addressCountry: 'CA' } }],
  }, 'This is a hybrid position.')

  assert.deepEqual(fields, {
    skills: ['TypeScript', 'React', 'PostgreSQL'],
    experienceRequirements: 'Three or more years building web applications',
    salaryMin: 90000,
    salaryMax: 120000,
    salaryCurrency: 'CAD',
    salaryPeriod: 'YEAR',
    location: 'Halifax, NS, CA',
    workMode: 'HYBRID',
  })
})

test('recognizes explicit remote postings and tolerates missing salary', () => {
  const fields = extractStructuredFields({
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: { name: 'Canada' },
  })
  assert.equal(fields.workMode, 'REMOTE')
  assert.equal(fields.location, 'Canada')
  assert.equal(fields.salaryMin, null)
  assert.equal(fields.salaryMax, null)
})
