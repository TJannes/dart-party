import { describe, expect, it } from 'vitest'
import { updateView, type UpdateStatus } from './update'

describe('updateView', () => {
  it('offers a download when a new version is available', () => {
    const view = updateView({ kind: 'available', version: '1.2.3' })
    expect(view.message).toContain('1.2.3')
    expect(view.button?.action).toBe('download')
  })

  it('offers the install only once the download is complete', () => {
    expect(updateView({ kind: 'downloading', version: '1.2.3', percent: 41.6 })).toEqual({
      message: 'Downloading update… 42%',
    })
    expect(updateView({ kind: 'ready', version: '1.2.3' }).button?.action).toBe('install')
  })

  it('lets the user retry after a failed check', () => {
    expect(updateView({ kind: 'error', message: 'offline' }).button?.action).toBe('check')
  })

  it('never offers download or install unless an update exists', () => {
    const quiet: UpdateStatus[] = [
      { kind: 'unsupported' },
      { kind: 'idle' },
      { kind: 'checking' },
      { kind: 'upToDate' },
      { kind: 'error', message: 'x' },
    ]
    for (const status of quiet) {
      const action = updateView(status).button?.action
      expect(action === undefined || action === 'check').toBe(true)
    }
  })
})
