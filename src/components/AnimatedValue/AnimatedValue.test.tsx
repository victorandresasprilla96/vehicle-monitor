import { render, screen } from '@testing-library/react'
import { AnimatedValue } from './AnimatedValue'

const speedRule = (a: number, b: number) => Math.abs(a - b) >= 5

function renderValue(value: number) {
  return render(
    <AnimatedValue value={value} highlightWhen={speedRule}>
      {value}
    </AnimatedValue>,
  )
}

describe('AnimatedValue', () => {
  it('does not animate on first render', () => {
    renderValue(30)
    const el = screen.getByText('30')
    expect(el).not.toHaveAttribute('data-changed')
    expect(el).not.toHaveAttribute('data-highlight')
  })

  it('fades in a small change without the colour highlight', () => {
    const { rerender } = renderValue(30)
    rerender(
      <AnimatedValue value={32} highlightWhen={speedRule}>
        {32}
      </AnimatedValue>,
    )
    const el = screen.getByText('32')
    expect(el).toHaveAttribute('data-changed')
    expect(el).not.toHaveAttribute('data-highlight')
  })

  it('highlights a significant change', () => {
    const { rerender } = renderValue(30)
    rerender(
      <AnimatedValue value={45} highlightWhen={speedRule}>
        {45}
      </AnimatedValue>,
    )
    expect(screen.getByText('45')).toHaveAttribute('data-highlight')
  })

  it('restarts the animation on every change (new element per change)', () => {
    const { rerender } = renderValue(30)
    rerender(
      <AnimatedValue value={45} highlightWhen={speedRule}>
        {45}
      </AnimatedValue>,
    )
    const first = screen.getByText('45')
    rerender(
      <AnimatedValue value={60} highlightWhen={speedRule}>
        {60}
      </AnimatedValue>,
    )
    expect(screen.getByText('60')).not.toBe(first)
  })

  it('does nothing when re-rendered with the same value', () => {
    const { rerender } = renderValue(30)
    const before = screen.getByText('30')
    rerender(
      <AnimatedValue value={30} highlightWhen={speedRule}>
        {30}
      </AnimatedValue>,
    )
    expect(screen.getByText('30')).toBe(before)
  })
})
