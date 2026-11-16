import { useEffect, useState } from 'react'
import { manualDart, manualMiss, placedDart, RING } from '../../../core/board/ring'
import type { Dart } from '../../../core/board/state'
import { cueBetween } from '../../../core/party/cues'
import {
  activeRecord,
  addDart,
  dartsRemoved,
  evaluateRecord,
  nextPlayer,
  type Party,
} from '../../../core/party/party'
import { AVATARS } from '../../../core/players'
import { strings } from '../../../shared/strings'
import { useCalm, usePlayCue } from '../animation/Stage'
import { PLAYER_COLOURS } from '../colours'
import { Avatar, MOODS, type Mood } from '../components/Avatar'
import { PodiumView } from '../components/PodiumView'
import { Standings } from '../components/Standings'
import { GameScene } from '../scenes/GameScene'

// Every moment at one tap, without a dart. Each demo is a real little game
// played through the real rules, so what plays here is what plays in a
// party.

const t = strings.animations.gallery

const IDS = ['demo1', 'demo2', 'demo3', 'demo4']
const DEMO_AVATARS = ['fox', 'panda', 'frog', 'owl']
const PLAYERS = IDS.map((id, n) => ({ id, name: t.demoNames[n]!, avatar: DEMO_AVATARS[n]! }))

const S = (n: number): Dart => manualDart(n, 1)
const T = (n: number): Dart => manualDart(n, 3)
const miss = manualMiss()

function game(gameId: string, setup: unknown, order = IDS): Party {
  return {
    players: PLAYERS,
    gamesPlanned: 1,
    enabledGames: [gameId],
    stage: 'playing',
    games: [{ gameId, order, setup, turns: [] }],
    deciders: [],
  }
}

const thrown = (party: Party, ...darts: Dart[]): Party =>
  darts.reduce((e, dart) => addDart(e, dart, 'board'), party)

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
const trio = game('lastOneStanding', segments([20], [1], [18]), IDS.slice(0, 3))
/** A bomb that goes off on its third dart, with the target around the 20. */
const bomb = game('timeBomb', { fuses: [3], targets: [20] })
const hotBomb = game('timeBomb', { fuses: [10], targets: [20] })
/** Two players and a fuse that never runs out, for a round that is too easy and one that is too hard. */
const easyBomb = game('timeBomb', { fuses: [99], targets: [20] }, IDS.slice(0, 2))
const hardRound = dartsRemoved(thrown(thrown(easyBomb, S(20), S(20)), S(7), S(7), S(7)))
const tieBreak: Party = {
  ...game('decider', null),
  stage: 'decider',
  games: [],
  deciders: [{ gameId: 'decider', order: IDS.slice(0, 2), setup: null, turns: [] }],
}

interface Demo {
  label: string
  before: Party
  after: Party
}

const demo = (label: string, before: Party, ...darts: Dart[]): Demo => ({ label, before, after: thrown(before, ...darts) })

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

const TIME_BOMB: Demo[] = [
  demo(t.fuse, bomb, S(7)),
  demo(t.fuseHot, thrown(dartsRemoved(thrown(hotBomb, S(7), S(7), S(7))), S(7), S(7)), S(7)),
  demo(t.passed, thrown(bomb, S(7)), S(20)),
  demo(t.exploded, thrown(bomb, S(7), S(7)), S(7)),
  // Both passed the bomb on in round one, so round two is harder; then neither does.
  demo(t.zoneShrinks, thrown(easyBomb, S(20)), S(20)),
  { label: t.zoneGrows, before: thrown(hardRound, S(7), S(7), S(7)), after: dartsRemoved(thrown(hardRound, S(7), S(7), S(7))) },
]

const LAST_ONE: Demo[] = [
  demo(t.punch, standing, S(1)),
  demo(t.punchOut, standing, T(1)),
  demo(t.ownPunch, standing, S(20)),
  demo(t.finalDuel, trio, T(1)),
]

const PIGGY: Demo[] = [
  demo(t.coins, piggy, S(20)),
  demo(t.goldCoin, piggy, manualDart(20, 2)),
  demo(t.hammer, thrown(piggy, manualDart(20, 2), S(20)), miss),
  demo(t.hammerEmpty, piggy, miss),
]

const pair = IDS.slice(0, 2)
/** The first racer is one step from the finish and at the board. */
const raceNearFinish = nextPlayer(nextPlayer(nextPlayer(dartsRemoved(thrown(race, T(20), T(20), T(20))))))
const RACE: Demo[] = [
  demo(t.forward, raceUnderway, S(20)),
  demo(t.nitro, raceUnderway, T(20)),
  demo(t.banana, raceUnderway, S(18)),
  demo(t.oil, raceUnderway, T(18)),
  demo(t.finish, raceNearFinish, S(20)),
]

const archery = game('robinHood', null)
const ROBIN_HOOD: Demo[] = [
  demo(t.arrow, archery, manualDart(20, 1, true)),
  demo(t.splitArrow, archery, manualDart(25, 2)),
  demo(t.tree, archery, miss),
]

const spotlightPair = nextPlayer(game('spotlight', { targets: [20, 3, 6, 11, 8, 16] }, pair))
const SPOTLIGHT: Demo[] = [
  { label: t.newRound, before: spotlightPair, after: nextPlayer(spotlightPair) },
  demo(t.bow, spotlight, S(20)),
  demo(t.blank, thrown(spotlight, S(7), S(8)), S(9)),
]

const land = game('landGrab', null)
/** The first player owns the 20 and the second is at the board. */
const landTaken = dartsRemoved(thrown(land, S(20)))
const LAND_GRAB: Demo[] = [
  demo(t.claim, land, S(20)),
  demo(t.fortify, thrown(land, S(20)), S(20)),
  demo(t.siege, landTaken, S(20)),
  demo(t.capture, landTaken, manualDart(20, 2)),
  demo(t.tripleCapture, landTaken, T(20)),
]

const cross = { x: 0.3, y: 0.4 }
const scope = game('sniper', { targets: [cross, { x: -0.5, y: -0.2 }, cross, cross, cross] }, pair)
const lastShot = thrown(dartsRemoved(thrown(scope, placedDart(-0.2, 0.1), placedDart(0.5, 0.6), placedDart(0.1, 0.3))), placedDart(0.6, -0.3), placedDart(0.35, 0.5))
const SNIPER: Demo[] = [
  demo(t.measure, scope, placedDart(-0.3, -0.2)),
  demo(t.medals, lastShot, placedDart(0, 0.2)),
  { label: t.newRound, before: thrown(lastShot, placedDart(0, 0.2)), after: dartsRemoved(thrown(lastShot, placedDart(0, 0.2))) },
]

const mines = game('minefield', {
  under: { ...Object.fromEntries(RING.map((segment) => [segment, 'empty'])), 20: 'chest', 1: 'coin', 4: 'coin', 18: 'bomb' },
})
const MINEFIELD: Demo[] = [
  demo(t.digChest, mines, S(20)),
  demo(t.digCoin, mines, S(1)),
  demo(t.digEmpty, mines, S(5)),
  demo(t.digBomb, thrown(mines, S(20)), S(18)),
]

const calls = thrown(game('higherOrLower', { flips: [true] }), S(10))
const HIGHER_OR_LOWER: Demo[] = [demo(t.callRight, calls, S(15)), demo(t.callWrong, calls, S(5))]

/** The first player holds the bar at 60 and the second has thrown two darts. */
const barAt60 = dartsRemoved(thrown(game('raiseTheBar', null, IDS.slice(0, 3)), S(20), S(20), S(20)))
const bar = game('raiseTheBar', null, IDS.slice(0, 3))
const RAISE_THE_BAR: Demo[] = [
  demo(t.jumpOver, thrown(barAt60, S(20), S(20)), T(20)),
  demo(t.jumpFail, thrown(barAt60, S(1), S(1)), S(1)),
]

const PER_GAME: { id: keyof typeof strings.games; demos: Demo[] }[] = [
  { id: 'race', demos: RACE },
  { id: 'robinHood', demos: ROBIN_HOOD },
  { id: 'spotlight', demos: SPOTLIGHT },
  { id: 'piggyBank', demos: PIGGY },
  { id: 'landGrab', demos: LAND_GRAB },
  { id: 'sniper', demos: SNIPER },
  { id: 'minefield', demos: MINEFIELD },
  { id: 'lastOneStanding', demos: LAST_ONE },
  { id: 'higherOrLower', demos: HIGHER_OR_LOWER },
  { id: 'timeBomb', demos: TIME_BOMB },
  { id: 'raiseTheBar', demos: RAISE_THE_BAR },
]

const s = strings.animations.spectacle
const SPECTACLES: Demo[] = [
  demo(s.hatTrick, thrown(spotlight, S(7), S(7)), S(7)),
  demo(s.bullseye, piggy, manualDart(25, 2)),
  // Piggy Bank pays a triple only once, so these two are shown in Raise the Bar.
  demo(s.triple20, bar, T(20)),
  demo(s.oneEighty, thrown(bar, T(20), T(20)), T(20)),
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
    if (cue) play(cue, shown.demo.after, shown.demo.before)
  }, [shown, play])

  if (extra?.what === 'podium') {
    return <PodiumView key={extra.run} entries={[...PODIUM].sort((a, b) => a.place - b.place)} calm={calm} buttonLabel={strings.common.back} onButton={() => setExtra(null)} />
  }

  const party = shown.demo.after
  const record = activeRecord(party)!
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
            <h3>{t.perGame}</h3>
            {PER_GAME.map((group) => (
              <div key={group.id}>
                <p className="hint hint--left">{strings.games[group.id].name}</p>
                {buttons(group.demos)}
              </div>
            ))}
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
          <GameScene party={party} record={record} state={state} darts={darts} />
        </div>
      </div>

      {extra?.what === 'standings' && (
        <div className="result result--modal">
          <div className="result__card">
            <h2>{strings.party.standings}</h2>
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
