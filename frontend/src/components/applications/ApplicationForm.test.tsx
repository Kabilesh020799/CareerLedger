import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResumeVersions } from '../../hooks/useResumeVersions'
import { emptyApplicationForm } from '../../schemas/application.schema'
import { AppProvider } from '../ui/AppProvider'
import { ApplicationForm } from './ApplicationForm'

vi.mock('../../hooks/useResumeVersions', () => ({ useResumeVersions: vi.fn() }))

describe('ApplicationForm resume attachment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useResumeVersions).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      isSuccess: true,
    } as never)
  })
  afterEach(cleanup)

  it('submits a supported resume from the create form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const resume = new File(['%PDF-1.7\nresume'], 'my resume.pdf', {
      type: 'application/pdf',
    })

    render(
      <AppProvider>
        <ApplicationForm
          allowResumeAttachment
          initialValues={emptyApplicationForm}
          isSubmitting={false}
          onSubmit={onSubmit}
          submitLabel="Create application"
        />
      </AppProvider>,
    )

    await user.type(screen.getByLabelText(/Company/), 'Acme Corp')
    await user.type(screen.getByLabelText(/Job title/), 'Software Engineer')
    await user.upload(screen.getByLabelText('Attach resume'), resume)
    await user.click(screen.getByRole('button', { name: 'Create application' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0].resume.item(0)).toBe(resume)
    expect(screen.getByText(/PDF, DOC, or DOCX/)).toHaveTextContent(
      'saves it as Role_Company',
    )
  })

  it('shows a validation error for an unsupported resume', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const resume = new File(['text'], 'resume.pdf', { type: 'text/plain' })

    render(
      <AppProvider>
        <ApplicationForm
          allowResumeAttachment
          initialValues={{ ...emptyApplicationForm, company: 'Acme', jobTitle: 'Engineer' }}
          isSubmitting={false}
          onSubmit={onSubmit}
          submitLabel="Create application"
        />
      </AppProvider>,
    )

    await user.upload(screen.getByLabelText('Attach resume'), resume)
    await user.click(screen.getByRole('button', { name: 'Create application' }))

    expect(await screen.findByText('Choose a PDF, DOC, or DOCX resume')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the current resume and submits a replacement from the edit form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const resume = new File(['%PDF-1.7\nreplacement'], 'replacement.pdf', {
      type: 'application/pdf',
    })

    render(
      <AppProvider>
        <ApplicationForm
          allowResumeAttachment
          currentResumeFileName="Engineer_Acme.pdf"
          initialValues={{ ...emptyApplicationForm, company: 'Acme', jobTitle: 'Senior Engineer' }}
          isSubmitting={false}
          onSubmit={onSubmit}
          submitLabel="Save changes"
        />
      </AppProvider>,
    )

    expect(screen.getByText('Current file: Engineer_Acme.pdf')).toBeInTheDocument()
    await user.upload(screen.getByLabelText('Replace resume'), resume)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0][0].resume.item(0)).toBe(resume)
  })
})
