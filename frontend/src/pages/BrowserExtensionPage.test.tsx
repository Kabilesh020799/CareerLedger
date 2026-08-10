import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useBrowserExtensionTokens, useCreateBrowserExtensionToken, useRevokeBrowserExtensionToken } from '../hooks/useBrowserExtensionTokens'
import { BrowserExtensionPage } from './BrowserExtensionPage'

vi.mock('../hooks/useBrowserExtensionTokens', () => ({
  useBrowserExtensionTokens: vi.fn(), useCreateBrowserExtensionToken: vi.fn(), useRevokeBrowserExtensionToken: vi.fn(),
}))

describe('BrowserExtensionPage', () => {
  beforeEach(() => {
    vi.mocked(useBrowserExtensionTokens).mockReturnValue({ isPending: false, isError: false, isSuccess: true, data: [] } as never)
    vi.mocked(useRevokeBrowserExtensionToken).mockReturnValue({ mutate: vi.fn(), isPending: false } as never)
  })

  it('shows a newly created secret once for extension setup', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue({ token: 'jat_ext_secret' })
    vi.mocked(useCreateBrowserExtensionToken).mockReturnValue({ mutateAsync, isPending: false, isError: false } as never)

    render(<AppProvider><BrowserExtensionPage /></AppProvider>)
    await user.click(screen.getByRole('button', { name: 'Create token' }))

    expect(mutateAsync).toHaveBeenCalledWith('Chrome extension')
    expect(screen.getByLabelText('New browser extension token')).toHaveValue('jat_ext_secret')
    expect(screen.getByText(/shown once/i)).toBeInTheDocument()
  })
})
