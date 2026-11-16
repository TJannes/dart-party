import type { Dart } from '../../../core/board/state'
import type { Party, GameRecord } from '../../../core/party/party'
import { BLACKJACK, type BlackjackView, type Hand } from '../../../core/game/blackjack'
import type { DeciderView } from '../../../core/game/decider'
import type { HigherOrLowerView } from '../../../core/game/higherOrLower'
import type { LandGrabView } from '../../../core/game/landGrab'
import type { KnockoutView, LastOneStandingView } from '../../../core/game/lastOneStanding'
import type { MemoryView } from '../../../core/game/memory'
import type { MinefieldView } from '../../../core/game/minefield'
import { PIGGY_GOLD, piggyValue, type PiggyBankView } from '../../../core/game/piggyBank'
import type { RaceView } from '../../../core/game/race'
import type { RaiseTheBarView } from '../../../core/game/raiseTheBar'
import type { RobinHoodView } from '../../../core/game/robinHood'
import type { SniperView } from '../../../core/game/sniper'
import type { SpotlightView } from '../../../core/game/spotlight'
import type { TimeBombView } from '../../../core/game/timeBomb'
import type { AroundTheClockView } from '../../../core/game/aroundTheClock'
import { LAST_TARGET } from '../../../core/game/aroundTheClock'
import type { X01View } from '../../../core/game/x01'
import type { GameState } from '../../../core/game/types'
import { RING } from '../../../core/board/ring'
import { dartLabel } from '../../../shared/board'
import { strings } from '../../../shared/strings'
import { motion } from 'motion/react'
import { activeRecord, evaluateRecord } from '../../../core/party/party'
import { useCalm, useSuspense } from '../animation/Stage'
import { playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { colourOf } from '../colours'
import { useSettings } from '../hooks'
import { Bomb, CallArrow, Card, MEMORY_PICTURES, Pig, Pot, swellOf, type PigFace } from '../theme/gameShowProps'
import { Board } from '../components/Board'
import { RaceScene } from './RaceScene'
import { ScoreScene } from './ScoreScene'

const g = strings.games

// One colour per number of points under the spotlight.
const SPOTLIGHT = { 3: '#ffd23f', 2: '#f08a4b', 1: '#b388eb' } as Record<number, string>

// Minefield: what a segment looks like before and after it is dug up.
const MINEFIELD = { hidden: '#6d4fb3', chest: '#ffd23f', coin: '#f0c36b', bomb: '#ee4266', empty: '#8a8496' }
const MINEFIELD_MARK = { chest: '5', coin: '2', bomb: '✹', empty: '' }

// Memory: a card face down (two shades, by turns), and the hole a card that was taken leaves.
const MEMORY = { hidden: ['#7b5cc4', '#6548ad'], gone: '#3a3350' }

/** Lives as hearts, or the word for being out. */
function hearts(view: KnockoutView, player: string): string {
  const lives = view.lives[player]!
  return lives > 0 ? '♥'.repeat(lives) : strings.party.out
}

/** On your last life and at the board: reason to sweat. */
const lastLife = (view: KnockoutView, state: GameState<unknown>) => (player: string): boolean =>
  view.lives[player] === 1 && state.current?.player === player

/** How a player's pig feels: about the last dart that player threw. */
function pigFace(record: GameRecord, state: GameState<unknown>, player: string): PigFace {
  const turn = state.throwers.findLastIndex((thrower, n) => thrower === player && record.turns[n]!.darts.length > 0)
  const dart = turn < 0 ? undefined : record.turns[turn]!.darts.at(-1)?.dart
  if (!dart) return 'plain'
  return dart.miss ? 'grumpy' : piggyValue(dart) >= PIGGY_GOLD ? 'grin' : 'plain'
}

/** How high something worth `value` sits in the high-jump set, from the ground. */
const jumpHeight = (value: number): string => `${8 + (Math.min(180, value) / 180) * 70}%`

/**
 * The card table of Blackjack: the deck, the hand of whoever threw last as
 * cards, and what it adds up to. Every dart deals a card from the deck.
 */
function CardTable(props: { party: Party; table: BlackjackView['table'] }): React.JSX.Element {
  const { party, table } = props
  const state = !table ? 'empty' : table.bust ? 'bust' : table.total === BLACKJACK ? 'twentyOne' : 'open'
  return (
    <div className="felt" data-anim-prop="hand" style={table ? { borderColor: colourOf(party, table.player) } : undefined}>
      <div className="felt__deck">
        <Card />
      </div>
      <div className="felt__cards">
        {table?.cards.map((value, n) => (
          <motion.div
            // A new hand is a new set of cards; a corrected dart is a new card.
            key={`${table.turn}:${n}:${value}`}
            className="felt__card"
            initial={{ x: '-260%', y: '-20%', rotate: -40, rotateY: 180, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: (n - (table.cards.length - 1) / 2) * 6, rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
          >
            <Card value={value} suit={n + table.turn} />
          </motion.div>
        ))}
        {state === 'bust' && (
          <motion.b
            key={table!.turn}
            className="felt__stamp"
            initial={{ scale: 3, opacity: 0, rotate: -14 }}
            animate={{ scale: 1, opacity: 1, rotate: -14 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.5 }}
          >
            {g.blackjack.bust}
          </motion.b>
        )}
      </div>
      {table && (
        <div className="felt__who">
          <Avatar avatar={playerOf(party, table.player).avatar} size="1.6em" />
          <motion.b
            key={table.total}
            className={`felt__total felt__total--${state}`}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.25 }}
          >
            {table.total}
          </motion.b>
        </div>
      )}
    </div>
  )
}

interface SceneProps {
  party: Party
  record: GameRecord
  state: GameState<any>
  /** The darts of the turn in progress. */
  darts: Dart[]
}

/**
 * The scene of whichever game is being played. While an animation keeps
 * the outcome of a dart a secret, the game is shown as it was before it.
 */
export function GameScene(props: SceneProps): React.JSX.Element | null {
  const before = useSuspense()
  const held = before ? activeRecord(before) : null
  if (before && held && held.gameId === props.record.gameId) {
    return <Scene {...props} party={before} record={held} state={evaluateRecord(held)} />
  }
  return <Scene {...props} />
}

/** A new game adds a case. */
function Scene(props: SceneProps): React.JSX.Element | null {
  const { party, record, state, darts } = props
  const settings = useSettings()
  const calm = useCalm()
  const common = { party, record, state }

  switch (record.gameId) {
    case 'race':
      return <RaceScene {...common} state={state as GameState<RaceView>} darts={darts} />

    case 'robinHood': {
      const view = state.view as RobinHoodView
      return <ScoreScene {...common} score={(id) => view.scores[id]} board={<Board variant="target" darts={darts} />} />
    }

    case 'spotlight': {
      const view = state.view as SpotlightView
      const owners: Record<number, string> = {}
      const marks: Record<number, string> = {}
      for (const [segment, points] of Object.entries(view.worth)) {
        owners[Number(segment)] = SPOTLIGHT[points]!
        marks[Number(segment)] = String(points)
      }
      return (
        <ScoreScene
          {...common}
          heading={g.spotlight.target(view.target)}
          score={(id) => view.scores[id]}
          board={<Board owners={owners} marks={marks} darts={darts} />}
        />
      )
    }

    case 'piggyBank': {
      const view = state.view as PiggyBankView
      // One big pig: of whoever is at the board, or of the winner at the end.
      const shown = state.current?.player ?? state.ranking[0]?.[0]
      return (
        <ScoreScene
          {...common}
          heading={g.piggyBank.heading}
          score={(id) => view.scores[id]}
          detail={(id) => g.piggyBank.breaks(view.breaks[id]!)}
          feature={
            shown && (
              <div className="pig">
                <motion.div
                  key={shown}
                  className="pig__body"
                  data-anim-prop="pig"
                  initial={{ x: '60%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                >
                  <Pig
                    colour={colourOf(party, shown)}
                    total={view.scores[shown]!}
                    breaks={view.breaks[shown]!}
                    face={pigFace(record, state, shown)}
                  />
                </motion.div>
              </div>
            )
          }
          board={<Board variant="piggy" darts={darts} />}
        />
      )
    }

    case 'landGrab': {
      const view = state.view as LandGrabView
      const owners: Record<number, string> = {}
      const castles: Record<number, { colour: string; fortified: boolean; damage: number }> = {}
      for (const [segment, plot] of Object.entries(view.plots)) {
        if (plot.owner === null) continue
        const colour = colourOf(party, plot.owner)
        owners[Number(segment)] = colour
        castles[Number(segment)] = { colour, fortified: plot.fortified, damage: plot.damage }
      }
      return (
        <ScoreScene
          {...common}
          score={(id) => view.scores[id]}
          detail={(id) => g.landGrab.fortified(view.fortified[id]!)}
          board={<Board owners={owners} castles={castles} darts={darts} />}
        />
      )
    }

    case 'sniper': {
      const view = state.view as SniperView
      // Everyone's closest dart of the round stays on the board as a dot.
      const dots = Object.entries(view.closest).map(([id, closest]) => ({
        ...closest.at,
        colour: colourOf(party, id),
      }))
      return (
        <ScoreScene
          {...common}
          score={(id) => view.scores[id]}
          detail={(id) =>
            view.closest[id] ? g.sniper.mm(Math.round(view.closest[id].mm)) : g.sniper.noDart
          }
          board={<Board cross={view.target} dots={dots} darts={darts} />}
        />
      )
    }

    case 'blackjack': {
      const view = state.view as BlackjackView
      const t = g.blackjack
      const handText = (hand: Hand): string =>
        hand.bust ? t.bust : hand.total === BLACKJACK ? t.twentyOne : String(hand.total)
      return (
        <ScoreScene
          {...common}
          heading={view.toBeat ? t.toBeat(view.toBeat.total) : t.aim}
          score={(id) => view.scores[id]}
          detail={(id) => {
            const hand = view.hands[id]
            if (hand && id === state.current?.player) return t.throwing(hand.total)
            if (hand) return hand.bust || hand.total === BLACKJACK ? handText(hand) : t.hand(hand.total)
            const last = view.previous?.[id]
            return last ? t.last(handText(last), last.points) : ''
          }}
          feature={<CardTable party={party} table={view.table} />}
          board={<Board darts={darts} />}
        />
      )
    }

    case 'memory': {
      const view = state.view as MemoryView
      const owners: Record<number, string> = {}
      const marks: Record<number, string> = {}
      for (const [index, segment] of RING.entries()) {
        const picture = view.open[segment]
        // Two shades face down, so the cards can be told apart.
        const hidden = MEMORY.hidden[index % 2]!
        owners[segment] = picture ? MEMORY_PICTURES[picture].colour : view.taken[segment] ? MEMORY.gone : hidden
        if (picture) marks[segment] = MEMORY_PICTURES[picture].sign
      }
      return (
        <ScoreScene
          {...common}
          heading={g.memory.left(view.left)}
          score={(id) => view.scores[id]}
          detail={(id) =>
            view.pairs[id]!.length === 0
              ? g.memory.noPairs
              : view.pairs[id]!.map((picture) => MEMORY_PICTURES[picture].sign).join(' ')
          }
          board={<Board owners={owners} marks={marks} darts={darts} />}
        />
      )
    }

    case 'minefield': {
      const view = state.view as MinefieldView
      const owners: Record<number, string> = {}
      const marks: Record<number, string> = {}
      for (const segment of RING) {
        const found = view.revealed[segment]
        owners[segment] = found === undefined ? MINEFIELD.hidden : MINEFIELD[found]
        marks[segment] = found === undefined ? '?' : MINEFIELD_MARK[found]
      }
      return (
        <ScoreScene
          {...common}
          heading={g.minefield.left(view.left.chest, view.left.coin, view.left.bomb)}
          // Teasing, so not when calm.
          scorched={(id) => !calm && view.scorched.includes(id)}
          score={(id) => view.scores[id]}
          board={<Board owners={owners} marks={marks} darts={darts} />}
        />
      )
    }

    case 'lastOneStanding': {
      const view = state.view as LastOneStandingView
      const owners: Record<number, string> = {}
      for (const id of record.order) {
        // A segment whose owner is out is nobody's any more.
        if (view.lives[id]! > 0) owners[view.segments[id]![0]] = colourOf(party, id)
      }
      return (
        <ScoreScene
          {...common}
          out={view.out}
          duel={record.order.length > 2 && record.order.length - view.out.length === 2 && !state.finished}
          nervous={lastLife(view, state)}
          score={(id) => hearts(view, id)}
          detail={(id) => view.segments[id]![0]}
          board={<Board owners={owners} darts={darts} />}
        />
      )
    }

    case 'higherOrLower': {
      const view = state.view as HigherOrLowerView
      const call =
        view.call === null || view.bar === null
          ? g.higherOrLower.free
          : g.higherOrLower[view.call](view.bar)
      return (
        <ScoreScene
          {...common}
          out={view.out}
          nervous={lastLife(view, state)}
          heading={
            <motion.span
              // A new call flips in like a card being turned.
              key={`${view.call}${view.bar}`}
              className="call"
              data-anim-prop="call"
              initial={{ rotateX: 90 }}
              animate={{ rotateX: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            >
              {view.call !== null && (
                <span className="call__arrow">
                  <CallArrow call={view.call} />
                </span>
              )}
              <span className="scene__call">{call}</span>
            </motion.span>
          }
          score={(id) => hearts(view, id)}
          board={<Board darts={darts} />}
        />
      )
    }

    case 'timeBomb': {
      const view = state.view as TimeBombView
      const owners: Record<number, string> = {}
      for (const segment of view.target) owners[segment] = '#ff2d55'
      const holder = state.current?.player
      return (
        <ScoreScene
          {...common}
          out={view.out}
          // Holding a bomb that has burned a while is reason to sweat too.
          nervous={(id) => id === holder && (view.lives[id] === 1 || view.burned >= 3)}
          // Teasing, so not when calm.
          scorched={(id) => !calm && view.scorched.includes(id)}
          held={(id) =>
            id === holder && (
              <motion.div
                className="lane__held"
                data-anim-prop="bomb"
                initial={false}
                animate={{ scale: swellOf(view.burned) }}
                transition={{ type: 'spring', stiffness: 380, damping: 11 }}
              >
                <Bomb burned={view.burned} />
              </motion.div>
            )
          }
          heading={
            <>
              {g.timeBomb.target(view.target)}
              <br />
              <span className="scene__fuse">{g.timeBomb.burned(view.burned)}</span>
            </>
          }
          score={(id) => hearts(view, id)}
          board={<Board owners={owners} darts={darts} />}
        />
      )
    }

    case 'raiseTheBar': {
      const view = state.view as RaiseTheBarView
      const t = g.raiseTheBar
      const call =
        view.bar === null ? t.open : view.thrown > view.bar ? t.over(view.thrown) : t.beat(view.bar, view.bar + 1 - view.thrown)
      return (
        <ScoreScene
          {...common}
          heading={
            <>
              <span className="scene__call">{call}</span>
            </>
          }
          feature={
            <div className="jump" data-anim-prop="jump">
              <i className="jump__post" />
              <i className="jump__post jump__post--far" />
              {view.bar !== null && (
                <motion.div className="jump__bar" data-anim-prop="bar" initial={false} animate={{ bottom: jumpHeight(view.bar) }}>
                  <b>{view.bar}</b>
                </motion.div>
              )}
              {state.current && (
                <motion.div
                  key={state.current.player}
                  className="jump__jumper"
                  initial={false}
                  animate={{ bottom: jumpHeight(view.thrown) }}
                  transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                >
                  <Avatar avatar={playerOf(party, state.current.player).avatar} mood={view.bar !== null && view.thrown > view.bar ? 'cheer' : 'idle'} />
                  <b>{view.thrown}</b>
                </motion.div>
              )}
              <div className="jump__pot" data-anim-prop="pot">
                <Pot coins={view.pot} />
              </div>
            </div>
          }
          score={(id) => view.scores[id]}
          detail={(id) => (view.holder === id && view.bar !== null ? t.holds(view.bar) : '')}
          board={<Board darts={darts} />}
        />
      )
    }

    case 'x01': {
      const view = state.view as X01View
      const t = g.x01
      // How the player at the board can finish, when they can.
      const route = settings.checkoutHints ? (view.checkout?.map(dartLabel) ?? null) : null
      const bust = view.bust ? t.bust(view.remaining[view.bust]!) : null
      return (
        <ScoreScene
          {...common}
          heading={
            <>
              <span className="scene__call">
                {route ? t.checkout(route) : bust ?? t.title(view.start)}
              </span>
              <br />
              <span className="scene__fuse">{route && bust ? bust : view.doubleOut ? t.doubleOut : t.straightOut}</span>
            </>
          }
          score={(id) => view.remaining[id]}
          detail={() => t.toGo}
          board={<Board darts={darts} />}
        />
      )
    }

    case 'aroundTheClock': {
      const view = state.view as AroundTheClockView
      const t = g.aroundTheClock
      const owners: Record<number, string> = {}
      // The number the player at the board is after lights up in their colour.
      const thrower = state.current?.player
      if (thrower && view.targets[thrower]! <= LAST_TARGET) owners[view.targets[thrower]!] = colourOf(party, thrower)
      return (
        <ScoreScene
          {...common}
          heading={t.heading}
          score={(id) => (view.targets[id]! > LAST_TARGET ? t.done : view.targets[id]! - 1)}
          detail={(id) => (view.targets[id]! > LAST_TARGET ? '' : t.next(view.targets[id]!))}
          board={<Board owners={owners} darts={darts} />}
        />
      )
    }

    case 'decider': {
      const view = state.view as DeciderView
      return (
        <ScoreScene
          {...common}
          heading={
            <>
              {strings.party.tie}
              <br />
              <span className="scene__how">{g.decider.howTo}</span>
            </>
          }
          score={(id) => view.scores[id]}
          board={<Board darts={darts} />}
        />
      )
    }

    default:
      return null
  }
}
