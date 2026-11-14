import { finalRanking, standings, type Evening } from '../../../core/evening/evening'
import { placesOf } from '../../../core/evening/points'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf, PLAYER_COLOURS } from '../colours'
import { Avatar } from '../components/Avatar'
import { send } from '../hooks'

const s = strings.evening

function Confetti(): React.JSX.Element {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 40 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: PLAYER_COLOURS[i % PLAYER_COLOURS.length],
            animationDelay: `${-(i * 0.37) % 4}s`,
            animationDuration: `${3 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  )
}

/** The end of the evening: the top three on the blocks, everyone listed. */
export function Podium({ evening }: { evening: Evening }): React.JSX.Element {
  const ranking = finalRanking(evening)
  const places = placesOf(ranking)
  const order = ranking.flat()
  const points = new Map(standings(evening).map((row) => [row.player, row.points]))
  // Everyone in the top three stands on a block, as high as their place.
  // Second place stands left of the winner, third place right.
  const onPlace = (place: number): string[] => order.filter((id) => places[id] === place)
  const blocks = [...onPlace(2), ...onPlace(1), ...onPlace(3)]
  const rest = order.filter((id) => places[id]! > 3)

  return (
    <main className="screen screen--podium">
      <Confetti />
      <h2 className="podium__title">{s.podiumTitle}</h2>
      <div className="podium">
        {blocks.map((id) => {
          const player = playerOf(evening, id)
          const place = places[id]!
          return (
            <div key={id} className={`podium__spot podium__spot--${place}`}>
              <Avatar avatar={player.avatar} mood={place === 1 ? 'cheer' : 'idle'} size={place === 1 ? '22vh' : '15vh'} />
              <strong>{player.name}</strong>
              <div className="podium__block" style={{ background: colourOf(evening, id) }}>
                <span>{place}</span>
                <small>{s.points(points.get(id) ?? 0)}</small>
              </div>
            </div>
          )
        })}
      </div>
      {rest.length > 0 && (
        <ol className="podium__rest">
          {rest.map((id) => {
            const player = playerOf(evening, id)
            return (
              <li key={id}>
                {s.place(places[id]!)} <Avatar avatar={player.avatar} mood="sulk" size="1.6em" /> {player.name} ·{' '}
                {s.points(points.get(id) ?? 0)}
              </li>
            )
          })}
        </ol>
      )}
      <button type="button" className="button button--big" onClick={() => send({ type: 'finish' })}>
        {s.finish}
      </button>
    </main>
  )
}
