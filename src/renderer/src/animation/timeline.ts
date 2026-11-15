import type { Beat, Cue, DartStory } from '../../../core/evening/cues'
import type { DartFeedback, PlayerId } from '../../../core/game/types'
import type { Mood } from '../components/Avatar'
import type { EffectName } from '../theme/types'

// Turns a cue into a short timeline: which animation starts when, which
// sound goes with it, and how the avatars feel meanwhile. Pure, so the
// timing rules can be tested without a window.

/** What one step of the timeline shows. */
export type Scene =
  /** The dart lands on the board. */
  | { kind: 'impact'; story: DartStory }
  /** The thrower's own reaction to a good, great or bad dart. */
  | { kind: 'good'; player: PlayerId }
  | { kind: 'great'; player: PlayerId }
  | { kind: 'bad'; player: PlayerId }
  | Beat
  | { kind: 'turn'; player: PlayerId }

export type SceneKind = Scene['kind']

export interface Step {
  key: string
  /** Seconds from the start of the cue. */
  at: number
  length: number
  scene: Scene
}

export interface MoodSpan {
  player: PlayerId
  mood: Mood
  from: number
  until: number
}

export interface Timeline {
  /** Which game's own animations to prefer; null for the general ones. */
  gameId: string | null
  steps: Step[]
  sounds: { at: number; effect: EffectName }[]
  moods: MoodSpan[]
  /** When everything is over. */
  length: number
}

/** A chain may take this long, however much one dart caused. */
export const MAX_CHAIN = 3

const LENGTH: Record<Beat['kind'], number> = {
  scored: 0.8,
  lost: 0.9,
  attacked: 0.7,
  lifeLost: 0.7,
  knockedOut: 0.9,
  spectacle: 1.4,
  won: 1.8,
}

const TURN_LENGTH = 1.1

const FEEDBACK_SOUND: Record<DartFeedback, EffectName> = {
  great: 'bigHit',
  good: 'hit',
  attack: 'pushed',
  neutral: 'thud',
  bad: 'miss',
}

/** Full-screen or teasing: left out when the owner asked for calm. */
function loud(scene: Scene): boolean {
  return scene.kind === 'spectacle' || scene.kind === 'won' || scene.kind === 'bad'
}

function soundOf(beat: Beat): EffectName | null {
  switch (beat.kind) {
    case 'lifeLost':
      return 'lifeLost'
    case 'knockedOut':
      return 'knockedOut'
    case 'spectacle':
      return beat.what === 'threeMisses' ? 'trombone' : 'sparkle'
    case 'won':
      return 'win'
    default:
      return null
  }
}

/**
 * The timeline of a cue. `others` are the players of the game, for moods
 * of those who only watch.
 */
export function timelineOf(cue: Cue, calm: boolean, others: readonly PlayerId[] = []): Timeline {
  if (cue.kind === 'turn') {
    return {
      gameId: null,
      steps: [{ key: 'turn', at: 0, length: TURN_LENGTH, scene: { kind: 'turn', player: cue.player } }],
      sounds: [{ at: 0, effect: 'turn' }],
      moods: [],
      length: TURN_LENGTH,
    }
  }

  const { story } = cue
  const steps: Step[] = []
  const sounds: Timeline['sounds'] = [{ at: 0, effect: FEEDBACK_SOUND[story.feedback] }]
  const moods: MoodSpan[] = []

  steps.push({ key: 'impact', at: 0, length: 0.5, scene: { kind: 'impact', story } })
  // The thrower's own reaction, unless the chain already shows how they fare.
  const hurt = story.chain.some(
    (beat) => (beat.kind === 'lifeLost' || beat.kind === 'lost') && beat.player === story.thrower,
  )
  if (!hurt && (story.feedback === 'good' || story.feedback === 'great' || story.feedback === 'bad')) {
    steps.push({ key: 'reaction', at: 0, length: 1, scene: { kind: story.feedback, player: story.thrower } })
  }

  // Points fly while the dart lands; the rest plays one after the other.
  let cursor = 0.35
  const chained: Step[] = []
  story.chain.forEach((beat, n) => {
    const key = `${beat.kind}${n}`
    if (beat.kind === 'scored' || beat.kind === 'lost') {
      steps.push({ key, at: 0.15, length: LENGTH[beat.kind], scene: beat })
      if (beat.kind === 'lost') moods.push({ player: beat.player, mood: 'shocked', from: 0.15, until: 1.2 })
      return
    }
    chained.push({ key, at: cursor, length: LENGTH[beat.kind], scene: beat })
    cursor += LENGTH[beat.kind]
  })

  // Squeeze a long chain into the time it may take.
  const squeeze = cursor > MAX_CHAIN ? (MAX_CHAIN - 0.35) / (cursor - 0.35) : 1
  for (const step of chained) {
    step.at = 0.35 + (step.at - 0.35) * squeeze
    step.length *= squeeze
    const beat = step.scene as Beat
    const effect = soundOf(beat)
    if (effect) sounds.push({ at: step.at, effect })
    const until = step.at + step.length
    if (beat.kind === 'attacked') {
      moods.push({ player: beat.by, mood: 'laugh', from: step.at, until })
      // The victim flinches when the hit arrives.
      moods.push({ player: beat.victim, mood: 'hit', from: step.at + step.length * 0.6, until: until + 0.4 })
    } else if (beat.kind === 'lifeLost') {
      moods.push({ player: beat.player, mood: 'hit', from: step.at, until })
    } else if (beat.kind === 'spectacle' && beat.what === 'threeMisses' && !calm) {
      for (const player of others) {
        if (player !== beat.player) moods.push({ player, mood: 'laugh', from: step.at, until })
      }
    }
    steps.push(step)
  }
  cursor = 0.35 + (cursor - 0.35) * squeeze

  const won = story.chain.some((beat) => beat.kind === 'won')
  if (cue.next && !won) {
    const at = Math.max(cursor, 0.9)
    steps.push({ key: 'turn', at, length: TURN_LENGTH, scene: { kind: 'turn', player: cue.next } })
    sounds.push({ at, effect: 'turn' })
  }

  const shown = calm ? steps.filter((step) => !loud(step.scene)) : steps
  return {
    gameId: story.gameId,
    steps: shown,
    sounds,
    moods,
    length: Math.max(0, ...shown.map((step) => step.at + step.length), ...moods.map((span) => span.until)),
  }
}
