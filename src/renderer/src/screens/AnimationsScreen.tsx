import { useEffect, useState } from 'react'
import { manualDart, manualMiss } from '../../../core/board/ring'
import type { Dart } from '../../../core/board/state'
import { cueBetween } from '../../../core/evening/cues'
import {
  activeRecord,
  addDart,
  dartsRemoved,
  evaluateRecord,
  nextPlayer,
  type Evening,
} from '../../../core/evening/evening'
import { AVATARS } from '../../../core/players'
import { strings } from '../../../shared/strings'
import { useCalm, usePlayCue } from '../animation/Stage'
import { PLAYER_COLOURS } from '../colours'
import { Avatar, MOODS, type Mood } from '../components/Avatar'
import { PodiumView } from '../components/PodiumView'
import { Standings } from '../components/Standings'
import { GameScene } from '../scenes/GameScene'

// Every moment at one tap, without a dart. Each demo is a real little game
// played through the real rules, so what plays here is what plays in an
// evening.

const t = strings.animations.gallery

const IDS = ['demo1', 'demo2', 'demo3', 'demo4']
const DEMO_AVATARS = ['fox', 'panda', 'frog', 'owl']
const PLAYERS = IDS.map((id, n) => ({ id, name: t.demoNames[n]!, avatar: DEMO_AVATARS[n]! }))

const S = (n: number): Dart => manualDart(n, 1)
const T = (n: number): Dart => manualDart(n, 3)
const miss = manualMiss()

function game(gameId: string, setup: unknown, order = IDS): Evening {
  return {
    players: PLAYERS,
    gamesPlanned: 1,
    enabledGames: [gameId],
    stage: 'playing',
    games: [{ gameId, order, setup, turns: [] }],
    deciders: [],
  }
}

const thrown = (evening: Evening, ...darts: Dart[]): Evening =>
  darts.reduce((e, dart) => addDart(e, dart, 'board'), evening)

const segments = (...own: number[][]): { segments: Record<string, number[]> } => ({
  segments: Object.fromEntries(own.map((list, n) => [IDS[n]!, list])),
})

const spotlight = game('spotlight', { targets: [20, 1, 18, 4, 13, 6] })
const piggy = game('piggyBank', null)
const standing = game('lastOneStanding', segments([20], [1], [18], [4]))
const duel = game('lastOneStanding', segments([20], [1]), IDS.slice(0, 2))
const race = game('race', segments([20, 1], [18, 4], [13, 6], [10, 15]))
/** The second racer is three steps ahead and the first is at the board. */
const raceUnderway = nextPlayer(nextPlayer(dartsRemoved(thrown(nextPlayer(race), T(18)))))
const tieBreak: Evening = {
  ...game('decider', null),
  stage: 'decider',
  games: [],
  deciders: [{ gameId: 'decider', order: IDS.slice(0, 2), setup: null, turns: [] }],
}

interface Demo {
  label: string
  before: Evening
  after: Evening
}

const demo = (label: string, before: Evening, ...darts: Dart[]): Demo => ({ label, before, after: thrown(before, ...darts) })

const MOMENTS: Demo[] = [
  demo(t.good, game('robinHood', null), manualDart(20, 1, true)),
  demo(t.great, spotlight, S(20)),
  demo(t.bad, spotlight, miss),
  demo(t.lost, thrown(piggy, S(20), S(20)), miss),
  demo(t.attack, raceUnderway, S(18)),
  demo(t.lifeLost, standing, S(1)),
  demo(t.ownGoal, standing, S(20)),
  demo(t.knockedOut, standing, T(1)),
  { label: t.turn, before: thrown(spotlight, S(5)), after: dartsRemoved(thrown(spotlight, S(5))) },
  demo(t.won, duel, T(1)),
]

const s = strings.animations.spectacle
const SPECTACLES: Demo[] = [
  demo(s.hatTrick, thrown(spotlight, S(7), S(7)), S(7)),
  demo(s.bullseye, piggy, manualDart(25, 2)),
  demo(s.triple20, piggy, T(20)),
  demo(s.oneEighty, thrown(piggy, T(20), T(20)), T(20)),
  demo(s.threeMisses, thrown(spotlight, miss, miss), miss),
  demo(s.lastDart, thrown(dartsRemoved(thrown(tieBreak, S(20), miss, miss)), S(1), S(1)), S(19)),
]

const STANDINGS = PLAYERS.map((player, n) => ({
  ...player,
  colour: PLAYER_COLOURS[n]!,
  before: [7, 6, 4, 3][n]!,
  earned: [1, 4, 2, 3][n]!,
}))

const PODIUM = PLAYERS.map((player, n) => ({
  ...player,
  colour: PLAYER_COLOURS[n]!,
  place: [2, 1, 4, 3][n]!,
  points: [12, 15, 6, 9][n]!,
}))

/** Frames drawn in the last second, to see whether the machine keeps up. */
function useFps(): number {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let since = performance.now()
    let handle = requestAnimationFrame(function tick(now) {
      frames++
      if (now - since >= 1000) {
        setFps(Math.round((frames * 1000) / (now - since)))
        frames = 0
        since = now
      }
      handle = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(handle)
  }, [])
  return fps
}

export function AnimationsScreen({ onBack }: { onBack: () => void }): React.JSX.Element {
  const play = usePlayCue()
  const calm = useCalm()
  const fps = useFps()
  // `run` counts the taps, so tapping the same demo twice plays it twice.
  const [shown, setShown] = useState<{ demo: Demo; run: number }>({ demo: MOMENTS[0]!, run: 0 })
  const [extra, setExtra] = useState<{ what: 'standings' | 'podium'; run: number } | null>(null)
  const [mood, setMood] = useState<Mood>('idle')

  // Play once the scene of the demo is on screen, so the animation can find
  // the avatars and the board.
  useEffect(() => {
    if (shown.run === 0) return
    const cue = cueBetween(shown.demo.before, shown.demo.after)
    if (cue) play(cue, shown.demo.after)
  }, [shown, play])

  if (extra?.what === 'podium') {
    return <PodiumView key={extra.run} entries={[...PODIUM].sort((a, b) => a.place - b.place)} calm={calm} buttonLabel={strings.common.back} onButton={() => setExtra(null)} />
  }

  const evening = shown.demo.after
  const record = activeRecord(evening)!
  const state = evaluateRecord(record)
  const turn = state.current ? record.turns[state.current.turn] : record.turns.at(-1)
  const darts = (turn?.darts ?? []).map((d) => d.dart)

  const buttons = (demos: Demo[]): React.JSX.Element => (
    <div className="row row--left">
      {demos.map((item) => (
        <button
          key={item.label}
          type="button"
          className={shown.demo === item && shown.run > 0 ? 'chip chip--on' : 'chip'}
          onClick={() => setShown({ demo: item, run: shown.run + 1 })}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="button button--quiet" onClick={onBack}>
          {strings.common.back}
        </button>
        <h2>{t.title}</h2>
        <span className="bar__detail">{t.fps(fps)}</span>
      </header>

      <div className="gallery">
        <div className="gallery__list">
          <section>
            <h3>{t.everyGame}</h3>
            <p className="hint hint--left">{t.hint}</p>
            {buttons(MOMENTS)}
            {buttons(SPECTACLES)}
            <p className="hint hint--left">{t.themed}</p>
          </section>
          <section>
            <h3>{t.between}</h3>
            <div className="row row--left">
              <button type="button" className="chip" onClick={() => setExtra({ what: 'standings', run: (extra?.run ?? 0) + 1 })}>
                {t.standings}
              </button>
              <button type="button" className="chip" onClick={() => setExtra({ what: 'podium', run: (extra?.run ?? 0) + 1 })}>
                {t.podium}
              </button>
            </div>
          </section>
          <section>
            <h3>{t.moods}</h3>
            <div className="row row--left">
              {MOODS.map((name) => (
                <button key={name} type="button" className={mood === name ? 'chip chip--on' : 'chip'} onClick={() => setMood(name)}>
                  {t.moodNames[name]}
                </button>
              ))}
            </div>
            <div className="gallery__avatars">
              {AVATARS.map((avatar) => (
                <Avatar key={avatar} avatar={avatar} mood={mood} size="4.2rem" />
              ))}
            </div>
          </section>
        </div>

        <div className="gallery__scene">
          <GameScene evening={evening} record={record} state={state} darts={darts} />
        </div>
      </div>

      {extra?.what === 'standings' && (
        <div className="result result--modal">
          <div className="result__card">
            <h2>{strings.evening.standings}</h2>
            <Standings key={extra.run} rows={STANDINGS} animate />
            <button type="button" className="button button--big" onClick={() => setExtra(null)}>
              {strings.common.back}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
