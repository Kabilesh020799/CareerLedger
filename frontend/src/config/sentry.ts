import * as Sentry from '@sentry/react'

/** Initialise browser error reporting only when a DSN is configured. */
export function initializeSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    tracePropagationTargets: ['localhost', /^https:\/\/[^/]+\/api/],
    replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0.1),
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: false,
  })
}
