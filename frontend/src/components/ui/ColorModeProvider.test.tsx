import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider } from './AppProvider'
import { colorModeStorageKey } from './colorMode'
import { ThemeToggle } from './ThemeToggle'

describe('color mode', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.theme
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses the system preference when no selection is stored', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))

    render(<AppProvider><ThemeToggle /></AppProvider>)

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })

  it('switches themes and persists the selection', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(colorModeStorageKey, 'light')

    render(<AppProvider><ThemeToggle /></AppProvider>)
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(window.localStorage.getItem(colorModeStorageKey)).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeVisible()
  })
})
