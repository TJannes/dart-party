import type { Beat, Cue, DartStory, LevelChange } from '../../../core/party/cues'
import { PIGGY_GOLD } from '../../../core/game/piggyBank'
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
  /** A new round starts, with `player` first. `level` when it is harder or easier than the last. */
  | { kind: 'round'; round: number; player: PlayerId; level?: LevelChange }

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
  /**
   * How long the scene keeps showing the game as it was before the dart,
   * so that digging can keep its secret for a moment.
   */
  suspense: number
  /** When everything is over. */
  length: number
  /**
   * When the drinking banner comes up in the middle of the screen: after
   * the chain, so it never fights a full-screen moment, and before the
   * next player is announced. Null when nobody has to drink, and on the
   * dart that ends the game.
   */
  banner: number | null
}

/**
 * The drinking banner: big in the middle of the screen for the first
 * `DRINK_CENTRE` seconds, then in its strip at the bottom until
 * `DRINK_BANNER` seconds, then small until the next dart.
 */
export const DRINK_BANNER = 10
export const DRINK_CENTRE = 3

/** What the drinking game asks of a timeline. */
export interface DrinkTiming {
  /** The dart of this cue makes someone drink or hand out: leave room for the banner. */
  orders?: boolean
  /** A banner is still in the middle for this many seconds: the next player waits for it. */
  wait?: number
}

/** A chain may take this long, however much one dart caused. */
export const MAX_CHAIN = 3

/**
 * Land Grab's catapult: the attack step lasts longer there, and the stone is
 * in the air for this part of it. A plot changes hands when it lands.
 */
const STONE_STEP = 1
export const STONE_FLIGHT = 0.7

function lengthOf(beat: Beat, gameId: string): number {
  return gameId === 'landGrab' && beat.kind === 'attacked' ? STONE_STEP : LENGTH[beat.kind]
}

const LENGTH: Record<Beat['kind'], number> = {
  scored: 0.8,
  lost: 0.9,
  fuse: 0.6,
  passed: 0.8,
  exploded: 1,
  attacked: 0.7,
  lifeLost: 0.7,
  knockedOut: 0.9,
  finalDuel: 1.3,
  blank: 1.1,
  fortified: 0.7,
  measured: 0.8,
  roundResult: 1.3,
  dug: 1.3,
  call: 0.7,
  jump: 1,
  spectacle: 1.4,
  won: 1.8,
}

/** These play while the dart lands; the rest plays one after the other. */
const ALONGSIDE: Beat['kind'][] = ['scored', 'lost', 'fuse', 'measured', 'call', 'dug']

/** How long the shovel digs before the segment shows what was under it. */
export const DIG_TIME = 0.5
const ROUND_LENGTH = 1.2
/** A round that got harder or easier says so, and that takes time to read. */
const LEVEL_LENGTH = 2.4

/** When the chain starts: at once after a bang, else once the dart has landed. */
const CHAIN_START = 0.35
const BANG_START = 0.1

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
  return (
    scene.kind === 'spectacle' ||
    scene.kind === 'won' ||
    scene.kind === 'bad' ||
    scene.kind === 'finalDuel' ||
    scene.kind === 'blank'
  )
}

/**
 * When the blows of an attack land: one per life taken in Last One
 * Standing, where the glove jabs again for a double or a triple.
 */
export function blowTimes(step: Pick<Step, 'at' | 'length'>, amount: number): number[] {
  const blows = Math.min(3, Math.max(1, amount))
  return Array.from({ length: blows }, (_, n) => step.at + step.length * (0.5 + n * 0.2))
}

type Sound = { at: number; effect: EffectName }

/** The sounds of one step: the game's own where it has them. */
function soundsOf(beat: Beat, story: DartStory, step: Step): Sound[] {
  const { gameId } = story
  const one = (effect: EffectName, after = 0): Sound[] => [{ at: step.at + after * step.length, effect }]
  switch (beat.kind) {
    case 'scored':
      if (gameId === 'piggyBank') return one(beat.amount >= PIGGY_GOLD ? 'goldCoin' : 'clink', 0.6)
      if (gameId === 'race') return one(beat.amount >= 3 ? 'nitro' : 'vroom')
      if (gameId === 'spotlight') return beat.amount === 3 ? one('applause', 0.3) : []
      if (gameId === 'landGrab') return one('build')
      if (gameId === 'raiseTheBar') return one('coin', 0.6)
      return []
    case 'lost':
      if (gameId === 'piggyBank') return one('smash', 0.3)
      if (gameId === 'landGrab') return one('crumble')
      return []
    case 'dug': {
      const found = { chest: 'chest', coin: 'flip', empty: 'crab', bomb: null } as const
      const effect = found[beat.found]
      return [...one('dig'), ...(effect ? [{ at: step.at + DIG_TIME, effect }] : [])]
    }
    case 'measured':
      return one('measure')
    case 'call':
      return one(beat.right ? 'whoosh' : 'buzzer')
    case 'fortified':
      return one('build')
    case 'jump':
      return one(beat.cleared ? 'jump' : 'clatter', beat.cleared ? 0 : 0.45)
    case 'roundResult':
      return one('medals')
    case 'blank':
      return one('cough', 0.4)
    case 'fuse':
      // The ticking speeds up with what has burned, never with what is left.
      return one(beat.burned <= 2 ? 'fuseSlow' : beat.burned <= 5 ? 'fuseMid' : 'fuseFast')
    case 'passed':
      return one('toss')
    case 'exploded':
      return one('boom')
    case 'attacked':
      if (gameId === 'lastOneStanding') return blowTimes(step, beat.amount).map((at) => ({ at, effect: 'punch' as const }))
      if (gameId === 'race') return one(beat.amount >= 2 ? 'skid' : 'slip', 0.5)
      if (gameId === 'landGrab') return one('catapult')
      return []
    case 'lifeLost':
      return one('lifeLost')
    case 'knockedOut':
      return one(gameId === 'lastOneStanding' ? 'bell' : 'knockedOut')
    case 'finalDuel':
      return one('duel')
    case 'spectacle':
      if (gameId === 'robinHood' && beat.what === 'bullseye') return one('split')
      return one(beat.what === 'threeMisses' ? 'trombone' : 'sparkle')
    case 'won':
      return one('win')
  }
}

/** A new round, announced together with the player who starts it. */
function roundSteps(
  gameId: string,
  round: number,
  player: PlayerId,
  at: number,
  level?: LevelChange,
): { step: Step; sounds: Sound[] } {
  const scene: Scene = { kind: 'round', round, player, ...(level ? { level } : {}) }
  const step: Step = { key: 'round', at, length: level ? LEVEL_LENGTH : ROUND_LENGTH, scene }
  const effect: EffectName | null = level ?? (gameId === 'spotlight' ? 'drumroll' : gameId === 'sniper' ? 'lock' : null)
  return { step, sounds: effect ? [{ at, effect }] : [] }
}

/**
 * The timeline of a cue. `others` are the players of the game, for moods
 * of those who only watch.
 */
export function timelineOf(
  cue: Cue,
  calm: boolean,
  others: readonly PlayerId[] = [],
  drinking: DrinkTiming = {},
): Timeline {
  if (cue.kind === 'turn') {
    // A drinking banner in the middle of the screen has the floor first.
    const at = Math.max(0, drinking.wait ?? 0)
    const round = cue.round === undefined ? null : roundSteps(cue.gameId, cue.round, cue.player, at, cue.level)
    return {
      gameId: cue.gameId,
      steps: [
        ...(round ? [round.step] : []),
        { key: 'turn', at, length: TURN_LENGTH, scene: { kind: 'turn', player: cue.player } },
      ],
      sounds: [{ at, effect: 'turn' }, ...(round?.sounds ?? [])],
      moods: [],
      suspense: 0,
      length: at + (round ? Math.max(TURN_LENGTH, round.step.length) : TURN_LENGTH),
      banner: null,
    }
  }

  const { story } = cue
  const steps: Step[] = []
  const moods: MoodSpan[] = []
  // Digging takes a moment: nothing gives away what is under the segment before it is up.
  const lead = story.chain.some((beat) => beat.kind === 'dug') ? DIG_TIME : 0
  const sounds: Timeline['sounds'] = [{ at: lead, effect: FEEDBACK_SOUND[story.feedback] }]
  if (story.gameId === 'robinHood') sounds.push(story.dart.miss ? { at: 0.3, effect: 'bird' } : { at: 0, effect: 'arrow' })

  steps.push({ key: 'impact', at: 0, length: 0.5, scene: { kind: 'impact', story } })
  // The thrower's own reaction, unless the chain already shows how they fare.
  const hurt = story.chain.some(
    (beat) => (beat.kind === 'lifeLost' || beat.kind === 'lost') && beat.player === story.thrower,
  )
  if (!hurt && (story.feedback === 'good' || story.feedback === 'great' || story.feedback === 'bad')) {
    steps.push({ key: 'reaction', at: lead, length: 1, scene: { kind: story.feedback, player: story.thrower } })
  }

  // Points fly while the dart lands; the rest plays one after the other.
  const start = lead + (story.chain.some((beat) => beat.kind === 'exploded') ? BANG_START : CHAIN_START)
  let cursor = start
  const chained: Step[] = []
  // In Land Grab a plot changes hands once the catapult stone has landed.
  const catapult = story.gameId === 'landGrab' && story.chain.some((beat) => beat.kind === 'attacked')
  const afterStone: Step[] = []
  story.chain.forEach((beat, n) => {
    const key = `${beat.kind}${n}`
    if (catapult && (beat.kind === 'scored' || beat.kind === 'lost')) {
      afterStone.push({ key, at: 0, length: LENGTH[beat.kind], scene: beat })
      return
    }
    if (ALONGSIDE.includes(beat.kind)) {
      // The dig itself starts with the dart; what it turns up waits for it.
      const at = beat.kind === 'dug' ? 0 : lead + 0.15
      const step: Step = { key, at, length: LENGTH[beat.kind], scene: beat }
      steps.push(step)
      sounds.push(...soundsOf(beat, story, step))
      if (beat.kind === 'lost') moods.push({ player: beat.player, mood: 'shocked', from: at, until: at + 1.05 })
      return
    }
    chained.push({ key, at: cursor, length: lengthOf(beat, story.gameId), scene: beat })
    cursor += lengthOf(beat, story.gameId)
  })

  // Squeeze a long chain into the time it may take.
  const squeeze = cursor > MAX_CHAIN ? (MAX_CHAIN - start) / (cursor - start) : 1
  for (const step of chained) {
    step.at = start + (step.at - start) * squeeze
    step.length *= squeeze
    const beat = step.scene as Beat
    sounds.push(...soundsOf(beat, story, step))
    const until = step.at + step.length
    if (beat.kind === 'attacked') {
      // Nobody laughs at hitting themselves.
      if (beat.by !== beat.victim) moods.push({ player: beat.by, mood: 'laugh', from: step.at, until })
      // The victim flinches when the hit arrives.
      moods.push({ player: beat.victim, mood: 'hit', from: step.at + step.length * 0.5, until: until + 0.4 })
    } else if (beat.kind === 'exploded') {
      moods.push({ player: beat.player, mood: 'shocked', from: step.at, until })
    } else if (beat.kind === 'passed') {
      moods.push({ player: beat.from, mood: 'cheer', from: step.at, until })
      // The next player catches it.
      moods.push({ player: beat.to, mood: 'shocked', from: step.at + step.length * 0.6, until: until + 0.3 })
    } else if (beat.kind === 'lifeLost') {
      moods.push({ player: beat.player, mood: 'hit', from: step.at, until })
    } else if (beat.kind === 'jump') {
      moods.push({ player: beat.player, mood: beat.cleared ? 'cheer' : 'hit', from: step.at + step.length * 0.5, until: until + 0.4 })
    } else if (beat.kind === 'blank' && !calm) {
      moods.push({ player: beat.player, mood: 'sulk', from: step.at, until })
    } else if (beat.kind === 'spectacle' && beat.what === 'threeMisses' && !calm) {
      for (const player of others) {
        if (player !== beat.player) moods.push({ player, mood: 'laugh', from: step.at, until })
      }
    }
    steps.push(step)
  }
  cursor = start + (cursor - start) * squeeze

  const attack = chained.find((step) => step.scene.kind === 'attacked')
  for (const step of afterStone) {
    step.at = attack ? attack.at + attack.length * STONE_FLIGHT : start
    steps.push(step)
    sounds.push(...soundsOf(step.scene as Beat, story, step))
    const beat = step.scene as Beat
    if (beat.kind === 'lost') moods.push({ player: beat.player, mood: 'shocked', from: step.at, until: step.at + 1.05 })
  }

  const won = story.chain.some((beat) => beat.kind === 'won')
  // The drinking banner takes the middle of the screen once the chain is over.
  // Not on the dart that ends the game: the result lists its orders instead.
  const banner = drinking.orders && !won ? Math.max(lead + 0.4, cursor) : null
  const bannerDown = banner === null ? 0 : banner + DRINK_CENTRE

  if (cue.next && !won) {
    const at = Math.max(cursor, lead + 0.9, bannerDown)
    steps.push({ key: 'turn', at, length: TURN_LENGTH, scene: { kind: 'turn', player: cue.next } })
    sounds.push({ at, effect: 'turn' })
    if (cue.round !== undefined) {
      const round = roundSteps(story.gameId, cue.round, cue.next, at, cue.level)
      steps.push(round.step)
      sounds.push(...round.sounds)
    }
  }

  const shown = calm ? steps.filter((step) => !loud(step.scene)) : steps
  return {
    gameId: story.gameId,
    steps: shown,
    sounds,
    moods,
    suspense: lead,
    length: Math.max(bannerDown, ...shown.map((step) => step.at + step.length), ...moods.map((span) => span.until)),
    banner,
  }
}
