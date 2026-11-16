import { useEffect, useState } from 'react'
import { cueBetween } from '../../../core/party/cues'
import type { DemoStep } from '../../../core/party/demo'
import { activeRecord, evaluateRecord } from '../../../core/party/party'
import { useHaltCue, usePlayCue } from '../animation/Stage'
import { GameScene } from '../scenes/GameScene'

/** How long a step stands still before its dart, and how long after it. Seconds. */
const LEAD = 1.2
const HOLD = 3.2

/** Moments that take the whole screen in a game; the card leaves them out. */
const FULL_SCREEN = ['spectacle', 'won', 'finalDuel']

/**
 * The demo on the rules card: the game's own scene, playing a few darts in
 * a loop with a caption each. Silent, and nothing in it can be pressed.
 */
export function RulesDemo({ steps, captions }: { steps: DemoStep[]; captions: readonly string[] }): React.JSX.Element {
  const play = usePlayCue()
  const halt = useHaltCue()
  const [at, setAt] = useState({ step: 0, thrown: false })
  const step = steps[at.step % steps.length]!

  useEffect(() => {
    const next = at.thrown ? { step: (at.step + 1) % steps.length, thrown: false } : { step: at.step, thrown: true }
    const timer = setTimeout(() => setAt(next), (at.thrown ? HOLD : LEAD) * 1000)
    return () => clearTimeout(timer)
  }, [at, steps.length])

  // Play once the scene shows the dart, so the animation finds the avatars and the board.
  useEffect(() => {
    if (!at.thrown) return
    const cue = cueBetween(step.before, step.after)
    if (cue?.kind !== 'dart') return
    // A demo only shows what the dart does in the game: nobody is announced
    // as next, and nothing fills the screen over the card.
    const chain = cue.story.chain.filter((beat) => !FULL_SCREEN.includes(beat.kind))
    play({ kind: 'dart', story: { ...cue.story, chain }, next: null }, step.after, step.before, { silent: true })
  }, [at, step, play])

  // An animation still running must not follow the players into the game.
  useEffect(() => halt, [halt])

  const party = at.thrown ? step.after : step.before
  const record = activeRecord(party)!
  const state = evaluateRecord(record)
  const turn = state.current ? record.turns[state.current.turn] : record.turns.at(-1)

  return (
    <div className="demo" aria-hidden>
      <div className="demo__scene">
        <GameScene party={party} record={record} state={state} darts={(turn?.darts ?? []).map((d) => d.dart)} />
      </div>
      <p className="demo__caption" key={at.step}>
        <span className="demo__count">{at.step + 1}</span>
        {captions[at.step]}
      </p>
    </div>
  )
}
