import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { useOutsideClick } from './sidebarHooks'

function TestHarness({ onClose, shouldIgnoreEvent }: {
  onClose: () => void
  shouldIgnoreEvent?: (event: MouseEvent) => boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, true, onClose, shouldIgnoreEvent)

  return (
    <div>
      <div ref={ref} data-testid="inside">inside</div>
      <div data-testid="outside">outside</div>
      <div data-slot="popover-content" data-testid="portal-popover">portal</div>
      <div data-testid="status-dropdown-popover">status</div>
    </div>
  )
}

describe('useOutsideClick', () => {
  it('closes on outside clicks by default', () => {
    const onClose = vi.fn()
    render(<TestHarness onClose={onClose} />)

    fireEvent.mouseDown(screen.getByTestId('outside'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores configured portal clicks', () => {
    const onClose = vi.fn()
    const shouldIgnoreEvent = (event: MouseEvent) => {
      const target = event.target as Element | null
      return Boolean(target?.closest('[data-slot="popover-content"], [data-testid="status-dropdown-popover"]'))
    }

    render(<TestHarness onClose={onClose} shouldIgnoreEvent={shouldIgnoreEvent} />)

    fireEvent.mouseDown(screen.getByTestId('portal-popover'))
    fireEvent.mouseDown(screen.getByTestId('status-dropdown-popover'))

    expect(onClose).not.toHaveBeenCalled()
  })
})
