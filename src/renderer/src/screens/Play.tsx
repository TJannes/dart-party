import { activeRecord, canAdvance, evaluateRecord, standings, type Evening } from '../../../core/evening/evening'
import { placesOf, pointsForRanking } from '../../../core/evening/points'
import { rulesFor } from '../../../core/game/registry'
import { rankByScore, type GameState, type WithOpenings } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { Controls } from '../components/Controls'
import { dartText } from '../dartText'
import { EveningFrame } from '../components/EveningFrame'
import { send } from '../hooks'
import { GameScene } from '../scenes/GameScene'
import { gameName } from './Draw'

const s = strings.evening

/** "Round 2 of 6" in the header, or the game's own way of counting. */
function roundText(gameId: string, state: GameState<any>, maxRounds: number): string | undefined {
  if (!state.current) return undefined
  if (gameId === 'raiseTheBar') {
    const { opening, openings } = state.view as WithOpenings
    return strings.games.raiseTheBar.opening(opening, openings)
  }
  return maxRounds > 1 ? s.round(state.current.round, maxRounds) : undefined
}

/** The result of the game just finished, and the standings of the evening. */
function Result({ evening }: { evening: Evening }): React.JSX.Element {
  const record = activeRecord(evening)!
  const state = evaluateRecord(record)
  const places = placesOf(state.ranking)
  const isGame = evening.stage === 'playing'
  const earned = isGame ? pointsForRanking(state.ranking) : {}
  const totals = new Map(standings(evening).map((row) => [row.player, row.points]))
  // In the standings, players level on points share a place.
  const standingPlaces = placesOf(rankByScore([...totals.keys()], (id) => totals.get(id)!))
  const rows = isGame ? standings(evening).map((row) => row.player) : state.ranking.flat()

  return (
    <div className="result">
      <div className="result__card">
        <h2>{isGame ? s.standings : s.result(gameName(record.gameId))}</h2>
        <ol className="scoreboard">
          {rows.map((id) => {
            const player = playerOf(evening, id)
            return (
              <li key={id} style={{ borderColor: colourOf(evening, id) }}>
                <span className="scoreboard__place">{s.place(isGame ? standingPlaces[id]! : places[id]!)}</span>
                <Avatar avatar={player.avatar} size="2em" mood={places[id] === 1 ? 'cheer' : 'idle'} />
                <span className="scoreboard__name">{player.name}</span>
                {isGame && <span className="scoreboard__earned">{s.earned(earned[id] ?? 0)}</span>}
                {isGame && <strong>{s.points(totals.get(id) ?? 0)}</strong>}
              </li>
            )
          })}
        </ol>
        <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
          {strings.common.continue}
        </button>
      </div>
    </div>
  )
}

/** A game or deciding round in progress: who throws, the scene, the controls. */
export function Play({ evening }: { evening: Evening }): React.JSX.Element {
  const record = activeRecord(evening)!
  const state = evaluateRecord(record)
  const rules = rulesFor(record.gameId)
  const current = state.current
  // The darts of the turn in progress. A turn that a rule ended (a bomb
  // passed on, a player knocked out) may still have its darts in the board.
  const darts = current ? (record.turns[current.turn]?.darts ?? []).map((d) => d.dart) : []
  const last = record.turns.at(-1)
  const uncleared = current !== null && last !== undefined && !last.done && current.turn >= record.turns.length
  const thrower = current ? playerOf(evening, current.player) : null

  return (
    <EveningFrame
      evening={evening}
      title={gameName(record.gameId)}
      detail={roundText(record.gameId, state, rules.maxRounds)}
    >
      <div className="turn" style={{ borderColor: current ? colourOf(evening, current.player) : 'transparent' }}>
        {thrower && current && (
          <>
            <Avatar avatar={thrower.avatar} size="1.5em" />
            <span className="turn__name">{thrower.name}</span>
            <span className="turn__what">{current.dartsLeft === 0 ? s.pullDarts : uncleared ? s.afterPull : s.toThrow}</span>
            <span className="turn__darts">
              {Array.from({ length: rules.dartsPerTurn }, (_, slot) => {
                const text = darts[slot] ? dartText(record, darts[slot], current.turn) : ''
                const style = !darts[slot] ? 'dart dart--empty' : text.length > 4 ? 'dart dart--long' : 'dart'
                return (
                  <span key={slot} className={style}>
                    {text}
                  </span>
                )
              })}
            </span>
          </>
        )}
      </div>

      <GameScene evening={evening} record={record} state={state} darts={darts} />

      <Controls evening={evening} canThrow={current !== null && current.dartsLeft > 0} />
      {canAdvance(evening) && <Result evening={evening} />}
    </EveningFrame>
  )
}
