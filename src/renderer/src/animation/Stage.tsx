import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { activeGameKey, cueBetween, type Cue } from '../../../core/party/cues'
import { ordersOfDart, type DrinkOrder } from '../../../core/party/drinking'
import { activeRecord, type Party } from '../../../core/party/party'
import type { PlayerId } from '../../../core/game/types'
import type { Mood } from '../components/Avatar'
import { DrinkBanner, type DrinkBannerPhase } from '../components/Drinks'
import { sound } from '../sound'
import { theme } from '../theme'
import { animationFor, stageInfo } from './pack'
import { DRINK_BANNER, DRINK_CENTRE, timelineOf, type MoodSpan, type Timeline } from './timeline'

// Plays the animations and their sounds on top of whatever screen is up.
// It only watches the party change; it never sends a command, so nothing
// here can touch a score. A new cue cuts the running one short.

type Moods = Record<PlayerId, Mood>

const MoodContext = createContext<Moods>({})
/** Plays a cue by hand. `silent` leaves its sounds out, for the demo on the rules card. */
type Play = (cue: Cue, party: Party, before?: Party, options?: { silent?: boolean }) => void

const PlayContext = createContext<Play>(() => {})
const HaltContext = createContext<() => void>(() => {})
const SuspenseContext = createContext<Party | null>(null)
const CalmContext = createContext(false)
const BusyContext = createContext(false)

/** How the animation in progress makes the players feel, if it does. */
export const useMoods = (): Moods => useContext(MoodContext)

/** Plays a cue by hand, for the Animations screen and the demo on the rules card. */
export const usePlayCue = (): Play => useContext(PlayContext)

/** Ends whatever is playing at once, for a screen that played cues by hand and is leaving. */
export const useHaltCue = (): (() => void) => useContext(HaltContext)

/**
 * The party as it was before the dart being played, for as long as the
 * animation keeps its outcome a secret (digging in Minefield). Else null.
 */
export const useSuspense = (): Party | null => useContext(SuspenseContext)

export const useCalm = (): boolean => useContext(CalmContext)

/** True while an animation is playing. */
export const useStageBusy = (): boolean => useContext(BusyContext)

function moodsAt(spans: readonly MoodSpan[], time: number): Moods {
  const moods: Moods = {}
  // A later span wins where two overlap.
  for (const span of [...spans].sort((a, b) => a.from - b.from)) {
    if (span.from <= time && time < span.until) moods[span.player] = span.mood
  }
  return moods
}

interface Running {
  id: number
  timeline: Timeline
  party: Party
  cue: Cue
}

export function Stage(props: { party: Party | null | undefined; calm: boolean; children: ReactNode }): React.JSX.Element {
  const { party, calm } = props
  const [running, setRunning] = useState<Running | null>(null)
  const [moods, setMoods] = useState<Moods>({})
  const [suspense, setSuspense] = useState<Party | null>(null)
  const [drinks, setDrinks] = useState<{ id: number; party: Party; orders: DrinkOrder[]; phase: DrinkBannerPhase } | null>(null)
  /** Until when (a clock time) a banner holds the middle of the screen. */
  const centreUntil = useRef(0)
  // The drinking banner keeps its own time: a turn passing must not cut it short.
  const drinkTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const drinkDart = useRef<{ key: string; game: number; turn: number; index: number } | null>(null)
  const stopDrinks = useCallback(() => {
    drinkTimers.current.forEach(clearTimeout)
    drinkTimers.current = []
    drinkDart.current = null
    centreUntil.current = 0
    setDrinks(null)
  }, [])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const serial = useRef(0)
  const calmNow = useRef(calm)
  calmNow.current = calm

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const halt = useCallback(() => {
    stop()
    setRunning(null)
    setMoods({})
    setSuspense(null)
  }, [stop])

  const play = useCallback<Play>(
    (cue, during, before, options) => {
      stop()
      // The drinking game: who this dart makes drink. Only darts of a party game do.
      const game = cue.kind === 'dart' && cue.story.game.startsWith('g') ? Number(cue.story.game.slice(1)) : null
      const orders = cue.kind === 'dart' && game !== null ? ordersOfDart(during, game, cue.story.turn, cue.story.index) : []
      // A new dart replaces the banner of the last one; a turn passing waits for it and leaves it up.
      if (cue.kind === 'dart') stopDrinks()
      const timeline = timelineOf(cue, calmNow.current, activeRecord(during)?.order ?? [], {
        orders: orders.length > 0,
        wait: (centreUntil.current - Date.now()) / 1000,
      })
      const later = (seconds: number, run: () => void): void => {
        if (seconds <= 0) run()
        else timers.current.push(setTimeout(run, seconds * 1000))
      }
      setRunning({ id: ++serial.current, timeline, party: during, cue })
      setSuspense(timeline.suspense > 0 && before ? before : null)
      if (timeline.suspense > 0) later(timeline.suspense, () => setSuspense(null))
      if (!options?.silent) for (const { at, effect } of timeline.sounds) later(at, () => sound.play(effect))
      // The banner: big in the middle first, then down to its strip at the bottom.
      if (cue.kind === 'dart' && game !== null && timeline.banner !== null) {
        const { story } = cue
        const id = ++serial.current
        const start = timeline.banner * 1000
        drinkDart.current = { key: story.game, game, turn: story.turn, index: story.index }
        centreUntil.current = Date.now() + start + DRINK_CENTRE * 1000
        drinkTimers.current = [
          setTimeout(() => {
            setDrinks({ id, party: during, orders, phase: 'centre' })
            sound.play(orders.some((order) => order.kind === 'drink') ? 'drink' : 'handOut')
          }, start),
          setTimeout(() => setDrinks((now) => now && { ...now, phase: 'strip' }), start + DRINK_CENTRE * 1000),
          // It stays, small, until the next dart or until the party moves on.
          setTimeout(() => setDrinks((now) => now && { ...now, phase: 'small' }), start + DRINK_BANNER * 1000),
        ]
      }
      // The moods change at the start and the end of every span.
      const moments = new Set([0, ...timeline.moods.flatMap((span) => [span.from, span.until])])
      for (const time of moments) later(time, () => setMoods(moodsAt(timeline.moods, time)))
      later(timeline.length + 0.1, () => {
        setRunning(null)
        setMoods({})
      })
    },
    [stop, stopDrinks],
  )

  // Compare each party with the one before it. The first look, a resume
  // and a dart taken back give no cue.
  const seen = useRef<Party | null | undefined>(undefined)
  useEffect(() => {
    const before = seen.current
    seen.current = party
    const cue = cueBetween(before, party)
    if (cue && party) play(cue, party, before ?? undefined)
    else setSuspense(null)
    // The banner goes when its dart is taken back or the party has moved on.
    const shown = drinkDart.current
    const gone =
      shown !== null &&
      (!party || activeGameKey(party) !== shown.key || ordersOfDart(party, shown.game, shown.turn, shown.index).length === 0)
    if (gone) stopDrinks()
  }, [party, play, stopDrinks])

  useEffect(() => stop, [stop])
  useEffect(() => stopDrinks, [stopDrinks])

  const info = useMemo(
    () => (running ? stageInfo(running.party, calm, running.cue.kind === 'dart' ? running.cue.story : null) : null),
    [running, calm],
  )

  return (
    <CalmContext.Provider value={calm}>
      <BusyContext.Provider value={running !== null}>
      <PlayContext.Provider value={play}>
      <HaltContext.Provider value={halt}>
        <MoodContext.Provider value={moods}>
          <SuspenseContext.Provider value={suspense}>{props.children}</SuspenseContext.Provider>
          {drinks && <DrinkBanner key={drinks.id} party={drinks.party} orders={drinks.orders} phase={drinks.phase} />}
          {running && info && (
            <div className="stage-layer" key={running.id} aria-hidden>
              {running.timeline.steps.map((step) => {
                const Scene = animationFor(theme.animations, running.timeline.gameId, step.scene.kind)
                return <Scene key={step.key} step={step} stage={info} />
              })}
            </div>
          )}
        </MoodContext.Provider>
      </HaltContext.Provider>
      </PlayContext.Provider>
      </BusyContext.Provider>
    </CalmContext.Provider>
  )
}
