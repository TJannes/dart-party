import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cueBetween, type Cue } from '../../../core/evening/cues'
import { activeRecord, type Evening } from '../../../core/evening/evening'
import type { PlayerId } from '../../../core/game/types'
import type { Mood } from '../components/Avatar'
import { sound } from '../sound'
import { theme } from '../theme'
import { animationFor, stageInfo } from './pack'
import { timelineOf, type MoodSpan, type Timeline } from './timeline'

// Plays the animations and their sounds on top of whatever screen is up.
// It only watches the evening change; it never sends a command, so nothing
// here can touch a score. A new cue cuts the running one short.

type Moods = Record<PlayerId, Mood>

const MoodContext = createContext<Moods>({})
const PlayContext = createContext<(cue: Cue, evening: Evening, before?: Evening) => void>(() => {})
const SuspenseContext = createContext<Evening | null>(null)
const CalmContext = createContext(false)
const BusyContext = createContext(false)

/** How the animation in progress makes the players feel, if it does. */
export const useMoods = (): Moods => useContext(MoodContext)

/** Plays a cue by hand, for the Animations screen. */
export const usePlayCue = (): ((cue: Cue, evening: Evening, before?: Evening) => void) => useContext(PlayContext)

/**
 * The evening as it was before the dart being played, for as long as the
 * animation keeps its outcome a secret (digging in Minefield). Else null.
 */
export const useSuspense = (): Evening | null => useContext(SuspenseContext)

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
  evening: Evening
  cue: Cue
}

export function Stage(props: { evening: Evening | null | undefined; calm: boolean; children: ReactNode }): React.JSX.Element {
  const { evening, calm } = props
  const [running, setRunning] = useState<Running | null>(null)
  const [moods, setMoods] = useState<Moods>({})
  const [suspense, setSuspense] = useState<Evening | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const serial = useRef(0)
  const calmNow = useRef(calm)
  calmNow.current = calm

  const stop = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const play = useCallback(
    (cue: Cue, during: Evening, before?: Evening) => {
      stop()
      const timeline = timelineOf(cue, calmNow.current, activeRecord(during)?.order ?? [])
      const later = (seconds: number, run: () => void): void => {
        if (seconds <= 0) run()
        else timers.current.push(setTimeout(run, seconds * 1000))
      }
      setRunning({ id: ++serial.current, timeline, evening: during, cue })
      setSuspense(timeline.suspense > 0 && before ? before : null)
      if (timeline.suspense > 0) later(timeline.suspense, () => setSuspense(null))
      for (const { at, effect } of timeline.sounds) later(at, () => sound.play(effect))
      // The moods change at the start and the end of every span.
      const moments = new Set([0, ...timeline.moods.flatMap((span) => [span.from, span.until])])
      for (const time of moments) later(time, () => setMoods(moodsAt(timeline.moods, time)))
      later(timeline.length + 0.1, () => {
        setRunning(null)
        setMoods({})
      })
    },
    [stop],
  )

  // Compare each evening with the one before it. The first look, a resume
  // and a dart taken back give no cue.
  const seen = useRef<Evening | null | undefined>(undefined)
  useEffect(() => {
    const before = seen.current
    seen.current = evening
    const cue = cueBetween(before, evening)
    if (cue && evening) play(cue, evening, before ?? undefined)
    else setSuspense(null)
  }, [evening, play])

  useEffect(() => stop, [stop])

  const info = useMemo(
    () => (running ? stageInfo(running.evening, calm, running.cue.kind === 'dart' ? running.cue.story : null) : null),
    [running, calm],
  )

  return (
    <CalmContext.Provider value={calm}>
      <BusyContext.Provider value={running !== null}>
      <PlayContext.Provider value={play}>
        <MoodContext.Provider value={moods}>
          <SuspenseContext.Provider value={suspense}>{props.children}</SuspenseContext.Provider>
          {running && info && (
            <div className="stage-layer" key={running.id} aria-hidden>
              {running.timeline.steps.map((step) => {
                const Scene = animationFor(theme.animations, running.timeline.gameId, step.scene.kind)
                return <Scene key={step.key} step={step} stage={info} />
              })}
            </div>
          )}
        </MoodContext.Provider>
      </PlayContext.Provider>
      </BusyContext.Provider>
    </CalmContext.Provider>
  )
}
