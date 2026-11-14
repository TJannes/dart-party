import { drawableGames } from './game/registry'

export const DEFAULT_ADDRESS = 'localhost:3180'

export interface Settings {
  /** Where Autodarts Desktop listens, as host:port. */
  autodartsAddress: string
  /** Mini-games that are never drawn. */
  disabledGames: string[]
  /** 0 to 1. */
  effectsVolume: number
  musicVolume: number
  /**
   * 'auto': the show goes to a second display when there is one.
   * 'single': everything stays in one window.
   */
  screens: 'auto' | 'single'
}

export const DEFAULT_SETTINGS: Settings = {
  autodartsAddress: DEFAULT_ADDRESS,
  disabledGames: [],
  effectsVolume: 0.8,
  musicVolume: 0.3,
  screens: 'auto',
}

/** A host:port as typed, tidied. Null when it cannot be an address. */
export function cleanAddress(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const address = raw
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/\/.*$/, '')
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(address)) return null
  const port = address.split(':')[1]
  if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) return null
  return port === undefined ? `${address}:3180` : address
}

function volume(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : fallback
}

/** Makes saved or sent settings safe to use, whatever they were. */
export function cleanSettings(raw: unknown): Settings {
  const given = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const known = new Set(drawableGames.map((game) => game.id))
  const disabled = Array.isArray(given['disabledGames'])
    ? [...new Set(given['disabledGames'].filter((id): id is string => known.has(id as string)))]
    : []
  return {
    autodartsAddress: cleanAddress(given['autodartsAddress']) ?? DEFAULT_SETTINGS.autodartsAddress,
    // At least one game must stay in the draw.
    disabledGames: disabled.length >= known.size ? [] : disabled,
    effectsVolume: volume(given['effectsVolume'], DEFAULT_SETTINGS.effectsVolume),
    musicVolume: volume(given['musicVolume'], DEFAULT_SETTINGS.musicVolume),
    screens: given['screens'] === 'single' ? 'single' : 'auto',
  }
}

/** The mini-games that may be drawn. */
export function enabledGames(settings: Settings): string[] {
  return drawableGames.map((game) => game.id).filter((id) => !settings.disabledGames.includes(id))
}
