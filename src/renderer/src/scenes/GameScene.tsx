import type { Dart } from '../../../core/board/state'
import type { Evening, GameRecord } from '../../../core/evening/evening'
import type { DeciderView } from '../../../core/game/decider'
import type { HigherOrLowerView } from '../../../core/game/higherOrLower'
import type { LandGrabView } from '../../../core/game/landGrab'
import type { KnockoutView, LastOneStandingView } from '../../../core/game/lastOneStanding'
import type { MinefieldView } from '../../../core/game/minefield'
import type { PiggyBankView } from '../../../core/game/piggyBank'
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
import { colourOf } from '../colours'
import { useSettings } from '../hooks'
import { Board } from '../components/Board'
import { RaceScene } from './RaceScene'
import { ScoreScene } from './ScoreScene'

const g = strings.games

// One colour per number of points under the spotlight.
const SPOTLIGHT = { 3: '#ffd23f', 2: '#f08a4b', 1: '#b388eb' } as Record<number, string>

// Minefield: what a segment looks like before and after it is dug up.
const MINEFIELD = { hidden: '#6d4fb3', chest: '#ffd23f', coin: '#f0c36b', bomb: '#ee4266', empty: '#8a8496' }
const MINEFIELD_MARK = { chest: '5', coin: '2', bomb: '✹', empty: '' }

/** The bar on a scale of 0 to 180, and how far the thrower has got. */
function BarMeter({ bar, thrown }: { bar: number | null; thrown: number }): React.JSX.Element {
  const at = (value: number): string => `${Math.min(100, (value / 180) * 100)}%`
  return (
    <span className="meter">
      <span className={bar !== null && thrown > bar ? 'meter__fill meter__fill--over' : 'meter__fill'} style={{ width: at(thrown) }} />
      {bar !== null && <span className="meter__bar" style={{ left: at(bar) }} />}
    </span>
  )
}

/** Lives as hearts, or the word for being out. */
function hearts(view: KnockoutView, player: string): string {
  const lives = view.lives[player]!
  return lives > 0 ? '♥'.repeat(lives) : strings.evening.out
}

/** On your last life and at the board: reason to sweat. */
const lastLife = (view: KnockoutView, state: GameState<unknown>) => (player: string): boolean =>
  view.lives[player] === 1 && state.current?.player === player

/** The scene of whichever game is being played. A new game adds a case. */
export function GameScene(props: {
  evening: Evening
  record: GameRecord
  state: GameState<any>
  /** The darts of the turn in progress. */
  darts: Dart[]
}): React.JSX.Element | null {
  const { evening, record, state, darts } = props
  const settings = useSettings()
  const common = { evening, record, state }

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
      return (
        <ScoreScene
          {...common}
          score={(id) => view.scores[id]}
          detail={(id) => g.piggyBank.breaks(view.breaks[id]!)}
          board={<Board darts={darts} />}
        />
      )
    }

    case 'landGrab': {
      const view = state.view as LandGrabView
      const owners: Record<number, string> = {}
      const marks: Record<number, string> = {}
      for (const [segment, plot] of Object.entries(view.plots)) {
        if (plot.owner === null) continue
        owners[Number(segment)] = colourOf(evening, plot.owner)
        // Walls standing, then the hits taken.
        marks[Number(segment)] = (plot.fortified ? '▮▮' : '▮') + '✕'.repeat(plot.damage)
      }
      return (
        <ScoreScene
          {...common}
          score={(id) => view.scores[id]}
          detail={(id) => g.landGrab.fortified(view.fortified[id]!)}
          board={<Board owners={owners} marks={marks} darts={darts} />}
        />
      )
    }

    case 'sniper': {
      const view = state.view as SniperView
      // Everyone's closest dart of the round stays on the board as a dot.
      const dots = Object.entries(view.closest).map(([id, closest]) => ({
        ...closest.at,
        colour: colourOf(evening, id),
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
        if (view.lives[id]! > 0) owners[view.segments[id]![0]] = colourOf(evening, id)
      }
      return (
        <ScoreScene
          {...common}
          out={view.out}
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
          heading={<span className="scene__call">{call}</span>}
          score={(id) => hearts(view, id)}
          board={<Board darts={darts} />}
        />
      )
    }

    case 'timeBomb': {
      const view = state.view as TimeBombView
      const owners: Record<number, string> = {}
      for (const segment of view.target) owners[segment] = '#ff2d55'
      return (
        <ScoreScene
          {...common}
          out={view.out}
          nervous={lastLife(view, state)}
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
              <BarMeter bar={view.bar} thrown={view.thrown} />
              <span className="scene__fuse">{t.pot(view.pot)}</span>
            </>
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
      if (thrower && view.targets[thrower]! <= LAST_TARGET) owners[view.targets[thrower]!] = colourOf(evening, thrower)
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
          heading={strings.evening.tie}
          score={(id) => view.scores[id]}
          board={<Board darts={darts} />}
        />
      )
    }

    default:
      return null
  }
}
