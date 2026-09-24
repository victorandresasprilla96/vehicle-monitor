import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { initials } from '../../utils/initials'
import { UserMenu } from './UserMenu'

const trigger = () => screen.getByRole('button', { name: 'Cuenta de Operador Norte' })

describe('UserMenu', () => {
  it('derives initials', () => {
    expect(initials('admin')).toBe('AD')
    expect(initials('Operador Norte')).toBe('ON')
  })

  it('is a disclosure that reveals the logout action', async () => {
    const onLogout = vi.fn()
    render(
      <UserMenu
        name="Operador Norte"
        email="op@example.com"
        onLogout={onLogout}
        loggingOut={false}
      />,
    )
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()

    await userEvent.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('Escape closes it and returns focus to the trigger', async () => {
    render(<UserMenu name="Operador Norte" onLogout={() => {}} loggingOut={false} />)
    await userEvent.click(trigger())
    screen.getByRole('button', { name: 'Cerrar sesión' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveFocus()
  })

  it('closes when clicking outside', async () => {
    render(
      <>
        <UserMenu name="Operador Norte" onLogout={() => {}} loggingOut={false} />
        <p>fuera</p>
      </>,
    )
    await userEvent.click(trigger())
    await userEvent.click(screen.getByText('fuera'))
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
  })
})
