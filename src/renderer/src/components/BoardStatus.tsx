import { boardView } from '../../../shared/board'
import { useBoardSnapshot } from '../hooks'

/** Says so when darts will not be detected. Silent when all is well. */
export function BoardStatus(): React.JSX.Element | null {
  const view = boardView(useBoardSnapshot())
  if (view.tone === 'ok') return null
  return (
    <p className={`board__status board__status--${view.tone} board__status--bar`} role="status">
      {view.message}
    </p>
  )
}
