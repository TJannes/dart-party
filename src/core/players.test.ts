import { describe, expect, it } from 'vitest'
import { AVATARS, cleanName, cleanProfiles, MAX_PROFILES } from './players'

describe('profiles', () => {
  it('has fifty-four different avatars', () => {
    expect(new Set(AVATARS).size).toBe(54)
  })

  it('tidies a name', () => {
    expect(cleanName('  Tom   J  ')).toBe('Tom J')
    expect(cleanName('A very long name indeed')).toBe('A very long')
  })

  it('keeps good profiles and drops the rest', () => {
    const good = { id: 'a', name: 'Ann', avatar: 'fox' }
    expect(
      cleanProfiles([
        good,
        { id: 'a', name: 'Twin', avatar: 'cat' },
        { id: 'b', name: '   ', avatar: 'cat' },
        { id: 'c', name: 'Cy', avatar: 'dragon' },
        { id: '', name: 'Di', avatar: 'cat' },
        null,
        'x',
      ]),
    ).toEqual([good])
    expect(cleanProfiles('nonsense')).toEqual([])
    expect(cleanProfiles(null)).toEqual([])
  })

  it('caps the number of profiles', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, avatar: 'fox' }))
    expect(cleanProfiles(many)).toHaveLength(MAX_PROFILES)
  })
})
