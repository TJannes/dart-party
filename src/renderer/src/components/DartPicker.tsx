import { useState } from 'react'
import type { DartInput } from '../../../core/evening/session'
import { strings } from '../../../shared/strings'
import { Board } from './Board'
import { Modal } from './Modal'

const s = strings.controls

/** Entering a dart by hand: ring first, then the number. */
export function DartPicker(props: {
  onPick: (dart: DartInput) => void
  onClose: () => void
  /** Robin Hood only cares how far from the centre the dart is. */
  zones?: boolean
  /** Sniper only cares where the dart is: point at it. */
  cross?: { x: number; y: number }
}): React.JSX.Element {
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1)
  if (props.cross) {
    return (
      <Modal title={strings.games.sniper.tap} onClose={props.onClose}>
        <div className="picker__board">
          <Board cross={props.cross} onTap={(x, y) => props.onPick({ position: { x, y } })} />
        </div>
        <div className="row">
          <button type="button" className="button button--miss" onClick={() => props.onPick({ miss: true })}>
            {s.miss}
          </button>
          <button type="button" className="button button--quiet" onClick={props.onClose}>
            {strings.common.cancel}
          </button>
        </div>
      </Modal>
    )
  }
  if (props.zones) {
    const zones = strings.games.robinHood.zones
    const choices: [string, DartInput][] = [
      [zones[6], { number: 25, multiplier: 2 }],
      [zones[5], { number: 25, multiplier: 1 }],
      [zones[4], { number: 20, multiplier: 1, inner: true }],
      [zones[3], { number: 20, multiplier: 1 }],
    ]
    return (
      <Modal title={s.pickTitle} onClose={props.onClose}>
        <div className="correct-list">
          {choices.map(([label, dart]) => (
            <button key={label} type="button" className="key key--wide" onClick={() => props.onPick(dart)}>
              {label}
            </button>
          ))}
          <button type="button" className="key key--wide key--miss" onClick={() => props.onPick({ miss: true })}>
            {zones[0]}
          </button>
        </div>
        <button type="button" className="button button--quiet" onClick={props.onClose}>
          {strings.common.cancel}
        </button>
      </Modal>
    )
  }
  const rings: [1 | 2 | 3, string][] = [
    [1, s.single],
    [2, s.double],
    [3, s.triple],
  ]
  return (
    <Modal title={s.pickTitle} onClose={props.onClose}>
      <div className="picker__rings">
        {rings.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={value === multiplier ? 'chip chip--on' : 'chip'}
            onClick={() => setMultiplier(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="picker__numbers">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((number) => (
          <button key={number} type="button" className="key" onClick={() => props.onPick({ number, multiplier })}>
            {number}
          </button>
        ))}
      </div>
      <div className="picker__rings">
        <button type="button" className="key key--wide" onClick={() => props.onPick({ number: 25, multiplier: 1 })}>
          {s.outerBull}
        </button>
        <button type="button" className="key key--wide" onClick={() => props.onPick({ number: 25, multiplier: 2 })}>
          {s.bull}
        </button>
        <button type="button" className="key key--wide key--miss" onClick={() => props.onPick({ miss: true })}>
          {s.miss}
        </button>
      </div>
      <button type="button" className="button button--quiet" onClick={props.onClose}>
        {strings.common.cancel}
      </button>
    </Modal>
  )
}
