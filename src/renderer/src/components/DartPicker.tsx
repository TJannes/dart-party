import { useState } from 'react'
import type { DartInput } from '../../../core/evening/session'
import { strings } from '../../../shared/strings'
import { Modal } from './Modal'

const s = strings.controls

/** Entering a dart by hand: ring first, then the number. */
export function DartPicker(props: { onPick: (dart: DartInput) => void; onClose: () => void }): React.JSX.Element {
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1)
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
