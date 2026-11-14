import { useEffect, useRef } from 'react'
import { activeRecord, evaluateRecord, type Evening } from '../../core/evening/evening'
import type { RaceView } from '../../core/game/race'
import { dartScore } from '../../core/board/ring'
import { sound } from './sound'
import type { EffectName, MusicScene } from './theme/types'

interface Heard {
  stage: string
  game: number
  darts: number
  moves: number
  finished: boolean
}

function listen(evening: Evening | null): Heard | null {
  if (!evening) return null
  const record = activeRecord(evening)
  const state = record ? evaluateRecord(record) : null
  return {
    stage: evening.stage,
    game: evening.games.length + evening.deciders.length,
    darts: record ? record.turns.reduce((sum, turn) => sum + turn.darts.length, 0) : 0,
    moves: record?.gameId === 'race' ? (state!.view as RaceView).moves.length : 0,
    finished: state?.finished ?? false,
  }
}

/** The sound of one new dart, going by what it did in the game. */
function dartEffect(evening: Evening, before: Heard, after: Heard): EffectName {
  const record = activeRecord(evening)!
  const dart = record.turns.at(-1)?.darts.at(-1)?.dart
  if (record.gameId === 'race') {
    if (after.moves > before.moves) {
      const move = (evaluateRecord(record).view as RaceView).moves.at(-1)!
      if (move.to < move.from) return 'pushed'
      return move.to - move.from >= 2 ? 'bigHit' : 'hit'
    }
    return dart?.miss ? 'miss' : 'thud'
  }
  if (!dart || dart.miss) return 'miss'
  return dartScore(dart) >= 40 ? 'bigHit' : 'hit'
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
    if (after.darts > before.darts) return sound.play(dartEffect(evening, before, after))
    if (after.moves !== before.moves) return sound.play('thud') // a correction changed the race
  }, [evening])
}
