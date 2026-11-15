import { useEffect } from 'react'
import type { Party } from '../../core/party/party'
import { sound } from './sound'
import type { MusicScene } from './theme/types'

function sceneOf(party: Party | null): MusicScene {
  if (!party) return 'menu'
  if (party.stage === 'podium') return 'podium'
  return party.stage === 'playing' || party.stage === 'decider' ? 'game' : 'menu'
}

/**
 * Keeps the music with where the party is. The effects for darts and
 * moments are played by the stage, in step with the animations.
 */
export function useMusic(party: Party | null | undefined): void {
  useEffect(() => {
    if (party !== undefined) sound.setScene(sceneOf(party))
  }, [party])
}
