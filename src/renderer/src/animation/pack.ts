import type { FC } from 'react'
import { RING } from '../../../core/board/ring'
import type { Dart } from '../../../core/board/state'
import type { Evening } from '../../../core/evening/evening'
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
  /** Where a dart sits on the board on screen. Null without a board. */
  boardPoint(dart: Dart): { x: number; y: number } | null
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

export function stageInfo(evening: Evening, calm: boolean, dart: Dart | null): StageInfo {
  const find = (selector: string): Element | null => document.querySelector(selector)
  const avatar = (player: PlayerId): Spot | null => spotOf(find(`[data-anim-avatar="${CSS.escape(player)}"]`))
  const scoreElement = (player: PlayerId): Element | null => find(`[data-anim-score="${CSS.escape(player)}"]`)
  const boardElement = (): Element | null => find('[data-anim-board] svg, svg[data-anim-board]')
  const board = (): Spot | null => spotOf(boardElement())
  const boardPoint = (thrown: Dart): { x: number; y: number } | null => {
    const spot = board()
    if (!spot) return null
    const scale = spot.size / (2 * BOARD_VIEW)
    const at = boardPosition(thrown)
    return { x: spot.x + at.x * scale, y: spot.y - at.y * scale }
  }
  return {
    calm,
    colourOf: (player) => colourOf(evening, player),
    nameOf: (player) => playerOf(evening, player)?.name ?? '',
    avatarOf: (player) => playerOf(evening, player)?.avatar ?? 'fox',
    avatar,
    score: (player) => spotOf(scoreElement(player)) ?? avatar(player),
    scoreElement,
    board,
    boardElement,
    boardPoint,
    dartPoint: () => (dart ? boardPoint(dart) : board()),
  }
}
