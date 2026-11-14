import type { ReactNode } from 'react'

export function Modal(props: { title: string; onClose: () => void; children: ReactNode }): React.JSX.Element {
  return (
    <div className="modal" onClick={props.onClose}>
      <div className="modal__card" role="dialog" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <h2>{props.title}</h2>
        {props.children}
      </div>
    </div>
  )
}
