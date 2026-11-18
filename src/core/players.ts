import type { Player } from './party/party'

/** The fixed set of characters a player can pick. Drawn in the renderer. */
export const AVATARS = [
  'fox',
  'cat',
  'dog',
  'bear',
  'panda',
  'koala',
  'rabbit',
  'mouse',
  'lion',
  'tiger',
  'pig',
  'cow',
  'monkey',
  'frog',
  'owl',
  'penguin',
  'chicken',
  'unicorn',
  'elephant',
  'wolf',
  'potato',
  'poo',
  'pizza',
  'burger',
  'fries',
  'beer',
  'donut',
  'watermelon',
  'avocado',
  'ghost',
  'ninja',
  'pirate',
  'alien',
] as const

export type AvatarId = (typeof AVATARS)[number]

export const MAX_NAME_LENGTH = 12
/** More than fit in one party, so a larger group can take turns. */
export const MAX_PROFILES = 24

export function isAvatar(value: unknown): value is AvatarId {
  return AVATARS.includes(value as AvatarId)
}

/** A name as it is kept: trimmed, single spaces, not too long. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH).trim()
}

/**
 * Makes a list of player profiles safe to save or use, whatever it was:
 * drops what is not a profile, tidies names, and keeps ids unique.
 */
export function cleanProfiles(raw: unknown): Player[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const profiles: Player[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const { id, name, avatar } = item as Record<string, unknown>
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue
    if (typeof name !== 'string' || !isAvatar(avatar)) continue
    const cleaned = cleanName(name)
    if (cleaned === '') continue
    seen.add(id)
    profiles.push({ id, name: cleaned, avatar })
    if (profiles.length === MAX_PROFILES) break
  }
  return profiles
}
