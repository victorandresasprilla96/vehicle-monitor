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
    expect(screen.getByRole('group', { name: 'Vehículo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Flota' })).toBeInTheDocument()
    expect(screen.getByText('3 vehículos')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Camión 01.*En línea/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Camión 02.*Sin conexión/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Furgón 03.*Sin señal reciente/ })).toBeInTheDocument()
  })

  it('moves and selects with the arrow keys, like any radio group', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.tab() // filters group
    await userEvent.tab() // vehicle group → the checked vehicle
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

  it('filters by status with a native radio group and shows counts', async () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Filtrar vehículos' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Todos.*3/ })).toBeChecked()

    await userEvent.click(screen.getByRole('radio', { name: /En línea.*1/ }))
    expect(screen.getAllByRole('radio', { name: /Camión|Furgón/ })).toHaveLength(1)

    await userEvent.click(screen.getByRole('radio', { name: /Sin señal.*2/ }))
    const shown = screen
      .getAllByRole('radio', { name: /Camión|Furgón/ })
      .map((r) => r.getAttribute('value'))
    expect(shown).toEqual(['2', '3']) // offline + unknown
  })

  it('shows live speed and age only for the selected vehicle', () => {
    render(
      <VehicleList
        devices={fleet}
        selectedId={1}
        onChange={() => {}}
        selectedLive={{ speedKmh: 16.4, fixTime: new Date().toISOString() }}
      />,
    )
    expect(screen.getByText('16 km/h')).toBeInTheDocument()
    expect(screen.getByText('ahora')).toBeInTheDocument()
  })
})
