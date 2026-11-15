import type { FC } from 'react'
import { RING } from '../../../core/board/ring'
import type { Dart } from '../../../core/board/state'
import type { DartStory } from '../../../core/evening/cues'
import { activeRecord, evaluateRecord, type Evening } from '../../../core/evening/evening'
import type { PlayerId } from '../../../core/game/types'
import { colourOf, playerOf } from '../colours'
import type { Scene, SceneKind, Step } from './timeline'

// What a theme pack supplies to draw the moments, and what it gets to draw
// them with. The animations find the avatars, scores and the board on
// screen by their data attributes, so they work on top of any scene.

/** A place on screen, in pixels: the centre and the size of what is there. */
export interface Spot {
  x: number
  y: number
  size: number
}

export interface StageInfo {
  /** True when flashes, shaking and teasing are switched off. */
  calm: boolean
  /** What the scene of the game shows right now: the view its rules gave. */
  view: unknown
  /** The dart this is all about, with everything it caused. Null for a turn change. */
  story: DartStory | null
  colourOf(player: PlayerId): string
  nameOf(player: PlayerId): string
  avatarOf(player: PlayerId): string
  /** Where a player's avatar is, or null when the scene does not show it. */
  avatar(player: PlayerId): Spot | null
  /** Where a player's score is; falls back on the avatar. */
  score(player: PlayerId): Spot | null
  scoreElement(player: PlayerId): Element | null
  board(): Spot | null
  boardElement(): Element | null
  /**
   * Where something a scene puts on screen for its game is (the bomb, the
   * pig), by the name in its `data-anim-prop`. Null when it is not there.
   */
  prop(name: string): Spot | null
  propElement(name: string): Element | null
  /** Where a dart sits on the board on screen. Null without a board. */
  boardPoint(dart: Dart): { x: number; y: number } | null
  /** Where a spot given in board units is on screen. Null without a board. */
  boardXY(at: { x: number; y: number }): { x: number; y: number } | null
  /** The middle of a segment's outer single on screen. Null without a board. */
  segmentPoint(segment: number): { x: number; y: number } | null
  /** How many pixels the board's radius (to the outside of the doubles) is. */
  boardScale(): number
  /** Where the dart of this cue landed; the middle of the board without one. */
  dartPoint(): { x: number; y: number } | null
}

export interface SceneProps<K extends SceneKind = SceneKind> {
  step: Step & { scene: Extract<Scene, { kind: K }> }
  stage: StageInfo
}

/** One component per kind of scene. */
export type AnimationSet = { [K in SceneKind]: FC<SceneProps<K>> }

export interface AnimationPack {
  /** Used in every game. */
  general: AnimationSet
  /** A game's own version of some scenes, by game id. */
  games: Record<string, Partial<AnimationSet>>
}

/** The component for a scene: the game's own if it has one. */
export function animationFor(pack: AnimationPack, gameId: string | null, kind: SceneKind): FC<SceneProps> {
  const own = gameId ? pack.games[gameId]?.[kind] : undefined
  return (own ?? pack.general[kind]) as FC<SceneProps>
}

/** Half the width of the board drawing in board units; see Board.tsx. */
const BOARD_VIEW = 1.32

function spotOf(element: Element | null): Spot | null {
  if (!element) return null
  const box = element.getBoundingClientRect()
  if (box.width === 0 && box.height === 0) return null
  return { x: box.left + box.width / 2, y: box.top + box.height / 2, size: Math.min(box.width, box.height) }
}

/** Where a dart is in board units: as placed, or else the middle of its bed. */
export function boardPosition(dart: Dart): { x: number; y: number } {
  if (dart.position) return dart.position
  const at = dart.number === null ? -1 : RING.indexOf(dart.number)
  // A miss nobody placed: just off the board, bottom right.
  if (dart.miss || dart.number === null) return { x: 0.82, y: -0.82 }
  if (at < 0) return { x: 0, y: 0 } // the bull
  const radius = dart.multiplier === 3 ? 0.605 : dart.multiplier === 2 ? 0.976 : dart.bed === 'SingleInner' ? 0.34 : 0.79
  const angle = (at * 18 * Math.PI) / 180
  return { x: radius * Math.sin(angle), y: radius * Math.cos(angle) }
}

export function stageInfo(evening: Evening, calm: boolean, story: DartStory | null): StageInfo {
  const dart = story?.dart ?? null
  const find = (selector: string): Element | null => document.querySelector(selector)
  const avatar = (player: PlayerId): Spot | null => spotOf(find(`[data-anim-avatar="${CSS.escape(player)}"]`))
  const scoreElement = (player: PlayerId): Element | null => find(`[data-anim-score="${CSS.escape(player)}"]`)
  const boardElement = (): Element | null => find('[data-anim-board] svg, svg[data-anim-board]')
  const propElement = (name: string): Element | null => find(`[data-anim-prop="${CSS.escape(name)}"]`)
  const board = (): Spot | null => spotOf(boardElement())
  const boardScale = (): number => (board()?.size ?? 0) / (2 * BOARD_VIEW)
  const boardXY = (at: { x: number; y: number }): { x: number; y: number } | null => {
    const spot = board()
    return spot && { x: spot.x + at.x * boardScale(), y: spot.y - at.y * boardScale() }
  }
  const boardPoint = (thrown: Dart): { x: number; y: number } | null => boardXY(boardPosition(thrown))
  const record = activeRecord(evening)
  return {
    calm,
    view: record ? evaluateRecord(record).view : null,
    story,
    boardXY,
    boardScale,
    segmentPoint: (segment) => {
      const angle = (RING.indexOf(segment) * 18 * Math.PI) / 180
      return boardXY({ x: 0.79 * Math.sin(angle), y: 0.79 * Math.cos(angle) })
    },
    colourOf: (player) => colourOf(evening, player),
    nameOf: (player) => playerOf(evening, player)?.name ?? '',
    avatarOf: (player) => playerOf(evening, player)?.avatar ?? 'fox',
    avatar,
    score: (player) => spotOf(scoreElement(player)) ?? avatar(player),
    scoreElement,
    board,
    boardElement,
    prop: (name) => spotOf(propElement(name)),
    propElement,
    boardPoint,
    dartPoint: () => (dart ? boardPoint(dart) : board()),
  }
}
