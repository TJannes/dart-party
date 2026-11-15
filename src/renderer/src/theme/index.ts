import { gameShow } from './gameShow'
import type { Theme } from './types'

/** The theme in use. Later this is chosen by date or in the settings. */
export const theme: Theme = gameShow

export function applyTheme(chosen: Theme = theme): void {
  for (const [name, value] of Object.entries(chosen.colours)) {
    document.documentElement.style.setProperty(`--${name}`, value)
  }
}
