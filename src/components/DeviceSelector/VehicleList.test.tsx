import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { Device } from '../../api/types'
import { VehicleList } from './VehicleList'

const make = (id: number, name: string, status: Device['status']): Device => ({
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
  make(1, 'Camión 01', 'online'),
  make(2, 'Camión 02', 'offline'),
  make(3, 'Furgón 03', 'unknown'),
]

function Harness({ onChange = () => {} }: { onChange?: (id: number) => void }) {
  const [selected, setSelected] = useState<number | null>(1)
  return (
    <VehicleList
      devices={fleet}
      selectedId={selected}
      onChange={(id) => {
        setSelected(id)
        onChange(id)
      }}
    />
  )
}

describe('VehicleList', () => {
  it('is a labelled radio group with each status spelled out', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Vehículo' })
    expect(group).toHaveAccessibleDescription('1 de 3 en línea')
    expect(screen.getByRole('radio', { name: /Camión 01.*En línea/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Camión 02.*Sin conexión/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Furgón 03.*Sin señal reciente/ })).toBeInTheDocument()
  })

  it('moves and selects with the arrow keys, like any radio group', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: /Camión 01/ })).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Camión 02/ })).toBeChecked()
    expect(onChange).toHaveBeenLastCalledWith(2)
  })

  it('selects on click', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByText('Furgón 03'))
    expect(onChange).toHaveBeenLastCalledWith(3)
  })
})
