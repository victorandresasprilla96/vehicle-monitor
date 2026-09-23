import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { Device } from '../../api/types'
import { VehicleCombobox } from './VehicleCombobox'

const make = (id: number, name: string, status: Device['status'] = 'online'): Device => ({
  id,
  name,
  uniqueId: String(id),
  status,
  disabled: false,
  lastUpdate: null,
  positionId: 0,
  category: null,
  model: null,
})
const fleet = [
  make(1, 'Camión 01'),
  make(2, 'Camión 02', 'offline'),
  make(3, 'Furgón 03', 'unknown'),
  make(4, 'Furgoneta 04'),
  make(5, 'Moto 05'),
]

function Harness({ onChange = () => {} }: { onChange?: (id: number) => void }) {
  const [selected, setSelected] = useState<number | null>(1)
  return (
    <>
      <VehicleCombobox
        devices={fleet}
        selectedId={selected}
        onChange={(id) => {
          setSelected(id)
          onChange(id)
        }}
      />
      <button type="button">siguiente</button>
    </>
  )
}

const combobox = () => screen.getByRole('combobox', { name: 'Vehículo' })

describe('VehicleCombobox', () => {
  it('follows the APG combobox contract when closed', () => {
    render(<Harness />)
    const input = combobox()
    expect(input).toHaveValue('Camión 01')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveAttribute('aria-autocomplete', 'list')
    expect(document.getElementById(input.getAttribute('aria-controls')!)).toHaveAttribute(
      'role',
      'listbox',
    )
    expect(input).toHaveAccessibleDescription('3 de 5 en línea')
  })

  it('opens with ArrowDown on the current vehicle and moves with the arrows', async () => {
    render(<Harness />)
    combobox().focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(combobox()).toHaveAttribute('aria-expanded', 'true')
    const active = () => document.getElementById(combobox().getAttribute('aria-activedescendant')!)
    expect(active()).toHaveTextContent('Camión 01')

    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(active()).toHaveTextContent('Furgón 03')
    expect(active()).toHaveAttribute('aria-selected', 'true')
    expect(combobox()).toHaveFocus() // focus never leaves the input
  })

  it('filters accent- and case-insensitively and announces the count', async () => {
    render(<Harness />)
    await userEvent.click(combobox())
    await userEvent.keyboard('furgon')
    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Furgón 03'),
      expect.stringContaining('Furgoneta 04'),
    ])
    expect(screen.getByRole('status')).toHaveTextContent('2 vehículos encontrados')
  })

  it('matches every word ("cam 02")', async () => {
    render(<Harness />)
    await userEvent.click(combobox())
    await userEvent.keyboard('cam 02')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option')).toHaveTextContent('Camión 02')
  })

  it('selects the first match with Enter and closes', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(combobox())
    await userEvent.keyboard('moto{Enter}')
    expect(onChange).toHaveBeenCalledWith(5)
    expect(combobox()).toHaveValue('Moto 05')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Escape closes without changing the selection', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(combobox())
    await userEvent.keyboard('furg{Escape}')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(combobox()).toHaveValue('Camión 01')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('explains an empty search instead of showing an empty list', async () => {
    render(<Harness />)
    await userEvent.click(combobox())
    await userEvent.keyboard('zzz')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Ningún vehículo coincide con «zzz».')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 vehículos encontrados')
  })

  it('selects with the pointer and Tab leaves without selecting', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(combobox())
    await userEvent.click(screen.getByRole('option', { name: /Furgoneta 04/ }))
    expect(onChange).toHaveBeenLastCalledWith(4)

    await userEvent.click(combobox())
    await userEvent.keyboard('{ArrowDown}{Tab}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'siguiente' })).toHaveFocus()
  })

  it('Tab in and type: the query replaces the shown name (not appended to it)', async () => {
    render(<Harness />)
    await userEvent.tab()
    expect(combobox()).toHaveFocus()
    await userEvent.keyboard('moto')
    expect(combobox()).toHaveValue('moto')
    expect(screen.getAllByRole('option')).toHaveLength(1)
  })
})
