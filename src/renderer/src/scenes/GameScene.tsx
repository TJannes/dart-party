import type { Dart } from '../../../core/board/state'
import type { Evening, GameRecord } from '../../../core/evening/evening'
import type { DeciderView } from '../../../core/game/decider'
import type { LandGrabView } from '../../../core/game/landGrab'
import type { PiggyBankView } from '../../../core/game/piggyBank'
import type { RaceView } from '../../../core/game/race'
import type { RobinHoodView } from '../../../core/game/robinHood'
import type { SpotlightView } from '../../../core/game/spotlight'
import type { GameState } from '../../../core/game/types'
import { strings } from '../../../shared/strings'
import { colourOf } from '../colours'
import { Board } from '../components/Board'
import { RaceScene } from './RaceScene'
import { ScoreScene } from './ScoreScene'

const g = strings.games

// One colour per number of points under the spotlight.
const SPOTLIGHT = { 3: '#ffd23f', 2: '#f08a4b', 1: '#b388eb' } as Record<number, string>

/** The scene of whichever game is being played. A new game adds a case. */
export function GameScene(props: {
  evening: Evening
  record: GameRecord
  state: GameState<any>
  /** The darts of the turn in progress. */
  darts: Dart[]
}): React.JSX.Element | null {
  const { evening, record, state, darts } = props
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
