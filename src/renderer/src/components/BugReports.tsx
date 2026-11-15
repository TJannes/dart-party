import { useEffect, useState } from 'react'
import type { BugFlag, LogSummary } from '../../../core/log/partyLog'
import { strings } from '../../../shared/strings'
import { BugIcon } from './BugIcon'
import { Modal } from './Modal'

const s = strings.settings

const when = (iso: string): string => (iso ? new Date(iso).toLocaleString() : '')

/** The kept party logs with their bugs: notes to write, a log to hand over. */
export function BugReports(): React.JSX.Element {
  const [logs, setLogs] = useState<LogSummary[] | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const [deleting, setDeleting] = useState<LogSummary | null>(null)

  const load = (): void => void window.dartParty.listLogs().then(setLogs)
  useEffect(load, [])

  if (logs === null) return <></>
  if (logs.length === 0) return <p className="hint hint--left">{s.noLogs}</p>
  const shown = all ? logs : logs.filter((log) => log.flags.length > 0)

  return (
    <div className="bug-logs">
      <div className="row row--left">
        <button type="button" className={all ? 'chip' : 'chip chip--on'} onClick={() => setAll(false)}>
          {s.showFlagged}
        </button>
        <button type="button" className={all ? 'chip chip--on' : 'chip'} onClick={() => setAll(true)}>
          {s.showAll}
        </button>
      </div>
      {shown.length === 0 && <p className="hint hint--left">{s.noFlagged}</p>}
      {shown.map((log) => (
        <div key={log.id} className="bug-log">
          <div className="bug-log__head">
            <span>
              <strong>{when(log.startedAt)}</strong>
              {' · '}
              {log.freePlay ? `${s.freePlay}: ` : ''}
              {log.players.join(', ')}
            </span>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => void window.dartParty.saveLog(log.id).then((ok) => ok && setSaved(log.id))}
            >
              {saved === log.id ? s.saved : s.saveLog}
            </button>
            <button type="button" className="button button--quiet" onClick={() => setDeleting(log)}>
              {strings.common.delete}
            </button>
          </div>
          {log.flags.length === 0 ? (
            <span className="hint hint--left">{s.noBugs}</span>
          ) : (
            log.flags.map((flag) => <FlagNote key={flag.id} log={log.id} flag={flag} />)
          )}
        </div>
      ))}

      {deleting && (
        <Modal title={s.deleteLog} onClose={() => setDeleting(null)}>
          <p>
            {when(deleting.startedAt)} · {deleting.players.join(', ')}
          </p>
          <div className="row">
            <button type="button" className="button button--quiet" onClick={() => setDeleting(null)}>
              {strings.common.cancel}
            </button>
            <button
              type="button"
              className="button button--miss"
              onClick={() =>
                void window.dartParty.deleteLog(deleting.id).then(() => {
                  setDeleting(null)
                  load()
                })
              }
            >
              {strings.common.delete}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FlagNote({ log, flag }: { log: string; flag: BugFlag }): React.JSX.Element {
  const [note, setNote] = useState(flag.note)
  return (
    <label className="bug-log__flag">
      <span>
        <BugIcon /> {new Date(flag.at).toLocaleTimeString()}
      </span>
      <textarea
        className="input input--left textarea"
        rows={2}
        placeholder={s.bugNote}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== flag.note && window.dartParty.noteBug(log, flag.id, note.trim())}
      />
    </label>
  )
}
