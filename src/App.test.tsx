import { render, screen } from '@testing-library/react'
import App from './App'
import { ThemeProvider } from './theme/ThemeProvider'

describe('App', () => {
  it('renders the shell with landmarks and a skip link', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Monitor de flota')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Estado del vehículo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saltar al estado del vehículo' })).toHaveAttribute(
      'href',
      '#vehicle-panel',
    )
  })
})
