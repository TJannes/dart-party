import { useEffect, useRef } from 'react'
import { activeRecord, evaluateRecord, type Evening } from '../../core/evening/evening'
import type { DartFeedback } from '../../core/game/types'
import { sound } from './sound'
import type { EffectName, MusicScene } from './theme/types'

interface Heard {
  stage: string
  game: number
  /** How many darts have counted in the game so far. */
  darts: number
  finished: boolean
  effect: EffectName | null
}

const EFFECT: Record<DartFeedback, EffectName> = {
  great: 'bigHit',
  good: 'hit',
  attack: 'pushed',
  neutral: 'thud',
  bad: 'miss',
}

function listen(evening: Evening | null): Heard | null {
  if (!evening) return null
  const record = activeRecord(evening)
  const state = record ? evaluateRecord(record) : null
  const last = state?.feedback.at(-1)
  return {
    stage: evening.stage,
    game: evening.games.length + evening.deciders.length,
    darts: state?.feedback.length ?? 0,
    finished: state?.finished ?? false,
    effect: last ? EFFECT[last] : null,
  }
}

function sceneOf(evening: Evening | null): MusicScene {
  if (!evening) return 'menu'
  if (evening.stage === 'podium') return 'podium'
  return evening.stage === 'playing' || evening.stage === 'decider' ? 'game' : 'menu'
}

/** Turns changes in the evening into sound effects and the right music. */
export function useSoundEvents(evening: Evening | null | undefined): void {
  const heard = useRef<Heard | null | undefined>(undefined)

  useEffect(() => {
    if (evening === undefined) return
    const before = heard.current
    const after = listen(evening)
    heard.current = after
    sound.setScene(sceneOf(evening))
    // Nothing to compare with on the first look, or across games.
    if (before === undefined || !before || !after || !evening) return

    if (after.stage === 'podium' && before.stage !== 'podium') return sound.play('fanfare')
    if (after.game !== before.game || after.stage !== before.stage) return
    if (after.finished && !before.finished) return sound.play('win')
    if (after.darts > before.darts && after.effect) return sound.play(after.effect)
  }, [evening])
}
