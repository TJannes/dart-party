import { strings } from '../../../shared/strings'
import { Avatar } from '../components/Avatar'
import { BoardStatus } from '../components/BoardStatus'
import { UpdateBar } from '../components/UpdateBar'

export function Home(props: {
  onNewParty: () => void
  onFreePlay: () => void
  onBoardCheck: () => void
  onSettings: () => void
}): React.JSX.Element {
  return (
    <main className="screen screen--home">
      <BoardStatus />
      <section className="hero">
        <div className="hero__cast">
          <Avatar avatar="fox" mood="cheer" size="12vh" />
          <Avatar avatar="panda" size="12vh" />
          <Avatar avatar="frog" mood="cheer" size="12vh" />
        </div>
        <h1>{strings.appName}</h1>
        <p className="tagline">{strings.tagline}</p>
        <div className="hero__buttons">
          <button type="button" className="button button--big" onClick={props.onNewParty}>
            {strings.home.newParty}
          </button>
          <div className="row">
            <button type="button" className="button button--quiet" onClick={props.onFreePlay}>
              {strings.home.freePlay}
            </button>
            <button type="button" className="button button--quiet" onClick={props.onBoardCheck}>
              {strings.home.boardCheck}
            </button>
            <button type="button" className="button button--quiet" onClick={props.onSettings}>
              {strings.settings.open}
            </button>
          </div>
        </div>
      </section>
      <footer>
        <UpdateBar />
        <p className="small">
          {strings.version(window.dartParty.appVersion)} · {strings.disclaimer}
        </p>
      </footer>
    </main>
  )
}
