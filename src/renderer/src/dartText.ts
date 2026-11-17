import type { Dart } from '../../core/board/state'
import type { GameRecord } from '../../core/party/party'
import { ACE, cardValue } from '../../core/game/blackjack'
import { archeryPoints } from '../../core/game/robinHood'
import { distanceMm, type SniperSetup } from '../../core/game/sniper'
import { dartLabel } from '../../shared/board'
import { strings } from '../../shared/strings'

/**
 * How a dart is written in the game being played: its segment as a rule,
 * but its zone points in Robin Hood, its distance to the cross in Sniper
 * and what it adds to the hand in Blackjack.
 */
export function dartText(record: GameRecord, dart: Dart, turnIndex: number): string {
  if (record.gameId === 'robinHood') return String(archeryPoints(dart))
  if (record.gameId === 'sniper') {
    const { targets } = record.setup as SniperSetup
    const round = Math.floor(turnIndex / record.order.length)
    const mm = distanceMm(dart, targets[round % targets.length]!)
    return mm === null ? strings.board.miss : strings.games.sniper.mm(Math.round(mm))
  }
  if (record.gameId === 'blackjack') {
    const value = cardValue(dart)
    return value === 0 ? strings.board.miss : value === ACE ? strings.games.blackjack.ace : String(value)
  }
  return dartLabel(dart)
}
