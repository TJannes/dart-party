import { describe, expect, it } from 'vitest'
import { cleanAddress, cleanSettings, DEFAULT_SETTINGS, enabledGames } from './settings'

describe('settings', () => {
  it('shows the X01 finish suggestions unless they were switched off', () => {
    expect(cleanSettings({}).checkoutHints).toBe(true)
    expect(cleanSettings({ checkoutHints: false }).checkoutHints).toBe(false)
    expect(cleanSettings({ checkoutHints: 'no' }).checkoutHints).toBe(true)
  })

  it('falls back to the defaults for anything unreadable', () => {
    expect(cleanSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(cleanSettings('x')).toEqual(DEFAULT_SETTINGS)
    expect(cleanSettings({ effectsVolume: 'loud', screens: 'triple' })).toEqual(DEFAULT_SETTINGS)
  })

  it('tidies an address', () => {
    expect(cleanAddress(' http://192.168.1.20:3180/ ')).toBe('192.168.1.20:3180')
    expect(cleanAddress('surface')).toBe('surface:3180')
    expect(cleanAddress('localhost:99999')).toBeNull()
    expect(cleanAddress('two words')).toBeNull()
    expect(cleanAddress('')).toBeNull()
    expect(cleanSettings({ autodartsAddress: 'nope nope' }).autodartsAddress).toBe('localhost:3180')
  })

  it('keeps volumes between 0 and 1', () => {
    expect(cleanSettings({ effectsVolume: 4, musicVolume: -1 })).toMatchObject({
      effectsVolume: 1,
      musicVolume: 0,
    })
  })

  it('never lets every game be switched off', () => {
    const all = enabledGames(DEFAULT_SETTINGS)
    expect(all).toContain('race')
    expect(cleanSettings({ disabledGames: [...all, 'unknown'] }).disabledGames).toEqual([])
    const some = cleanSettings({ disabledGames: ['race', 'unknown', 'race'] })
    expect(some.disabledGames).toEqual(['race'])
    expect(enabledGames(some)).not.toContain('race')
  })
})
