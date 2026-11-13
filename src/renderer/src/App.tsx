import { useEffect, useState } from 'react'
import { strings } from '../../shared/strings'
import { updateView, type UpdateStatus } from '../../shared/update'
import { BoardPanel } from './BoardPanel'

function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({ kind: 'idle' })
  useEffect(() => {
    const unsubscribe = window.dartParty.onUpdateStatus(setStatus)
    void window.dartParty.getUpdateStatus().then(setStatus)
    return unsubscribe
  }, [])
  return status
}

function UpdateBar(): React.JSX.Element {
  const status = useUpdateStatus()
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

export function App(): React.JSX.Element {
  return (
    <main className="shell">
      <section className="hero">
        <h1>{strings.appName}</h1>
        <p className="tagline">{strings.tagline}</p>
        <p className="soon">{strings.comingSoon}</p>
      </section>
      <BoardPanel />
      <footer>
        <UpdateBar />
        <p className="small">
          {strings.version(window.dartParty.appVersion)} · {strings.disclaimer}
        </p>
      </footer>
    </main>
  )
}
