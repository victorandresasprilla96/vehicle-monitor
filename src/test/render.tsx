import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createQueryClient } from '../api/queryClient'
import { ThemeProvider } from '../theme/ThemeProvider'

/** Render with the app's real providers and a fresh query cache per test. */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = createQueryClient()
  // No retries/backoff in tests: failures should surface immediately.
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  })
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{ui}</ThemeProvider>
      </QueryClientProvider>,
    ),
  }
}
