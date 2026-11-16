import { activeRecord, canAdvance, evaluateRecord, standings, type Party } from '../../../core/party/party'
import { placesOf, pointsForRanking } from '../../../core/party/points'
import { rulesFor } from '../../../core/game/registry'
import { useRef } from 'react'
import { activeGameKey } from '../../../core/party/cues'
import type { GameState, WithOpenings } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { Controls } from '../components/Controls'
import { Glass, OrderList, useDrinks } from '../components/Drinks'
import { ordersAfterGame, ordersOfLastDart } from '../../../core/party/drinking'
import { Standings } from '../components/Standings'
import { dartText } from '../dartText'
import { PartyFrame } from '../components/PartyFrame'
import { send } from '../hooks'
import { GameScene } from '../scenes/GameScene'
import { gameName } from './Draw'

const s = strings.party

/** "Round 2 of 6" in the header, or the game's own way of counting. */
function roundText(gameId: string, state: GameState<any>, maxRounds: number): string | undefined {
  if (!state.current) return undefined
  if (gameId === 'raiseTheBar') {
    const { opening, openings } = state.view as WithOpenings
    return strings.games.raiseTheBar.opening(opening, openings)
  }
  if (!Number.isFinite(maxRounds)) return s.roundOnly(state.current.round)
  return maxRounds > 1 ? s.round(state.current.round, maxRounds) : undefined
}

/** The result of the game just finished, and the standings of the party. */
function Result({ party, animate }: { party: Party; animate: boolean }): React.JSX.Element {
  const record = activeRecord(party)!
  const state = evaluateRecord(record)
  const places = placesOf(state.ranking)
  // Only a game of a party earns points; free play and a deciding round show their own result.
  const isGame = party.stage === 'playing' && !party.freePlay
  const earned = isGame ? pointsForRanking(state.ranking) : {}
  const totals = new Map(standings(party).map((row) => [row.player, row.points]))
  const drinks = useDrinks(party)
  // The deciding dart showed no banner: its orders stand here, above those of the result.
  const game = party.games.length - 1
  const orders = isGame ? [...ordersOfLastDart(party, game), ...ordersAfterGame(party, game)] : []

  return (
    <div className="result">
      <div className="result__card">
        <h2>{isGame ? s.standings : s.result(gameName(record.gameId))}</h2>
        {isGame ? (
          <Standings
            animate={animate}
            rows={party.players.map((player) => ({
              id: player.id,
              name: player.name,
              avatar: player.avatar,
              colour: colourOf(party, player.id),
              before: (totals.get(player.id) ?? 0) - (earned[player.id] ?? 0),
              earned: earned[player.id] ?? 0,
              mood: places[player.id] === 1 ? 'cheer' : 'idle',
              extra: <Glass drinks={drinks} player={player.id} />,
            }))}
          />
        ) : (
          <ol className="scoreboard">
            {state.ranking.flat().map((id) => {
              const player = playerOf(party, id)
              return (
                <li key={id} style={{ borderColor: colourOf(party, id) }}>
                  <span className="scoreboard__place">{s.place(places[id]!)}</span>
                  <Avatar avatar={player.avatar} size="2em" mood={places[id] === 1 ? 'cheer' : 'idle'} />
                  <span className="scoreboard__name">{player.name}</span>
                </li>
              )
            })}
          </ol>
        )}
        <OrderList party={party} orders={orders} />
        {party.freePlay ? (
          <div className="row">
            <button type="button" className="button button--big" onClick={() => send({ type: 'playAgain' })}>
              {strings.freePlay.again}
            </button>
            <button type="button" className="button button--quiet" onClick={() => send({ type: 'finish' })}>
              {strings.freePlay.done}
            </button>
          </div>
        ) : (
          <button type="button" className="button button--big" onClick={() => send({ type: 'advance' })}>
            {strings.common.continue}
          </button>
        )}
      </div>
    </div>
  )
}

/** A game or deciding round in progress: who throws, the scene, the controls. */
export function Play({ party }: { party: Party }): React.JSX.Element {
  const record = activeRecord(party)!
  const state = evaluateRecord(record)
  const rules = rulesFor(record.gameId)
  const current = state.current
  // The darts of the turn in progress. A turn that a rule ended (a bomb
  // passed on, a player knocked out) may still have its darts in the board.
  const darts = current ? (record.turns[current.turn]?.darts ?? []).map((d) => d.dart) : []
  const last = record.turns.at(-1)
  const uncleared = current !== null && last !== undefined && !last.done && current.turn >= record.turns.length
  const thrower = current ? playerOf(party, current.player) : null
  // The standings only play out when this window saw the game being won:
  // not after a restart into a game that was already over.
  const game = activeGameKey(party)
  const live = useRef<string | null>(null)
  if (!state.finished) live.current = game

  return (
    <PartyFrame
      party={party}
      title={gameName(record.gameId)}
      detail={roundText(record.gameId, state, rules.maxRounds)}
    >
      <div className="turn" style={{ borderColor: current ? colourOf(party, current.player) : 'transparent' }}>
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

      <GameScene party={party} record={record} state={state} darts={darts} />

      <Controls party={party} canThrow={current !== null && current.dartsLeft > 0} />
      {canAdvance(party) && <Result party={party} animate={live.current === game} />}
    </PartyFrame>
  )
}
