import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppProvider } from '../components/ui/AppProvider'
import { useBrowserPushSubscription, useNotificationSettings, useUpdateNotificationSettings } from '../hooks/useNotificationSettings'
import { NotificationSettingsPage } from './NotificationSettingsPage'

vi.mock('../hooks/useNotificationSettings', () => ({
  useNotificationSettings: vi.fn(), useUpdateNotificationSettings: vi.fn(), useBrowserPushSubscription: vi.fn(),
}))

describe('NotificationSettingsPage', () => {
  it('enables an available email channel and explains unavailable push', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    vi.mocked(useNotificationSettings).mockReturnValue({ isPending: false, isError: false, data: { emailEnabled: false, browserPushEnabled: false, emailAvailable: true, browserPushAvailable: false, vapidPublicKey: null, browserSubscribed: false } } as never)
    vi.mocked(useUpdateNotificationSettings).mockReturnValue({ mutate, isPending: false, isError: false } as never)
    vi.mocked(useBrowserPushSubscription).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never)

    render(<AppProvider><NotificationSettingsPage /></AppProvider>)
    await user.click(screen.getAllByRole('checkbox')[0])

    expect(mutate).toHaveBeenCalledWith({ emailEnabled: true, browserPushEnabled: false })
    expect(screen.getByText(/Push notifications require HTTPS/)).toBeInTheDocument()
  })
})
