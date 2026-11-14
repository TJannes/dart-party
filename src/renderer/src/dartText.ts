import type { Dart } from '../../core/board/state'
import type { GameRecord } from '../../core/evening/evening'
import { archeryPoints } from '../../core/game/robinHood'
import { distanceMm, type SniperSetup } from '../../core/game/sniper'
import { dartLabel } from '../../shared/board'
import { strings } from '../../shared/strings'

/**
 * How a dart is written in the game being played: its segment as a rule,
 * but its zone points in Robin Hood and its distance to the cross in Sniper.
 */
export function dartText(record: GameRecord, dart: Dart, turnIndex: number): string {
  if (record.gameId === 'robinHood') return String(archeryPoints(dart))
  if (record.gameId === 'sniper') {
    const { targets } = record.setup as SniperSetup
    const round = Math.floor(turnIndex / record.order.length)
    const mm = distanceMm(dart, targets[round % targets.length]!)
    return mm === null ? strings.board.miss : strings.games.sniper.mm(Math.round(mm))
  }
  return dartLabel(dart)
}
