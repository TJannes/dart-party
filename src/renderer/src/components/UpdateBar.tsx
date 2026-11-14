import { useEffect, useState } from 'react'
import { updateView, type UpdateStatus } from '../../../shared/update'

export function UpdateBar(): React.JSX.Element {
  const [status, setStatus] = useState<UpdateStatus>({ kind: 'idle' })
  useEffect(() => {
    const unsubscribe = window.dartParty.onUpdateStatus(setStatus)
    void window.dartParty.getUpdateStatus().then(setStatus)
    return unsubscribe
  }, [])
  const view = updateView(status)
  const highlight = status.kind === 'available' || status.kind === 'ready'
  return (
    <div className={highlight ? 'update update--highlight' : 'update'} role="status">
      <span>{view.message}</span>
      {view.button && (
        <button type="button" className="button" onClick={() => window.dartParty.updateAction(view.button!.action)}>
          {view.button.label}
        </button>
      )}
    </div>
  )
}
