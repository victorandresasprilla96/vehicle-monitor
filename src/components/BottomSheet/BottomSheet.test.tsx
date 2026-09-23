import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BottomSheet } from './BottomSheet'

const renderSheet = () =>
  render(
    <BottomSheet id="vehicle-panel" label="Estado del vehículo">
      <button type="button">Dentro de la hoja</button>
    </BottomSheet>,
  )

const handle = () => screen.getByRole('button', { name: 'Detalles del vehículo' })

describe('BottomSheet', () => {
  it('is a labelled landmark whose handle is a disclosure button', () => {
    renderSheet()
    expect(screen.getByRole('complementary', { name: 'Estado del vehículo' })).toBeInTheDocument()
    expect(handle()).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(handle().getAttribute('aria-controls')!)).toContainElement(
      screen.getByRole('button', { name: 'Dentro de la hoja' }),
    )
  })

  it('toggles with a tap, Enter and Space (dragging is never required)', async () => {
    renderSheet()
    await userEvent.click(handle())
    expect(handle()).toHaveAttribute('aria-expanded', 'true')

    handle().focus()
    await userEvent.keyboard('{Enter}')
    expect(handle()).toHaveAttribute('aria-expanded', 'false')

    await userEvent.keyboard(' ')
    expect(handle()).toHaveAttribute('aria-expanded', 'true')
  })

  it('Escape collapses it and returns focus to the handle', async () => {
    renderSheet()
    await userEvent.click(handle())
    screen.getByRole('button', { name: 'Dentro de la hoja' }).focus()

    await userEvent.keyboard('{Escape}')
    expect(handle()).toHaveAttribute('aria-expanded', 'false')
    expect(handle()).toHaveFocus()
  })

  it('keeps its content available to assistive tech while collapsed', () => {
    renderSheet()
    // Not hidden / inert: live regions inside keep announcing
    expect(screen.getByRole('button', { name: 'Dentro de la hoja' })).toBeInTheDocument()
    expect(screen.getByRole('complementary')).not.toHaveAttribute('aria-hidden')
  })
})
