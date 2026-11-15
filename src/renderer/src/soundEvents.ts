import { useEffect } from 'react'
import type { Evening } from '../../core/evening/evening'
import { sound } from './sound'
import type { MusicScene } from './theme/types'

function sceneOf(evening: Evening | null): MusicScene {
  if (!evening) return 'menu'
  if (evening.stage === 'podium') return 'podium'
  return evening.stage === 'playing' || evening.stage === 'decider' ? 'game' : 'menu'
}

/**
 * Keeps the music with where the evening is. The effects for darts and
 * moments are played by the stage, in step with the animations.
 */
export function useMusic(evening: Evening | null | undefined): void {
  useEffect(() => {
    if (evening !== undefined) sound.setScene(sceneOf(evening))
  }, [evening])
}
