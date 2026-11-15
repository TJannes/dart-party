import { finalRanking, standings, type Evening } from '../../../core/evening/evening'
import { placesOf } from '../../../core/evening/points'
import { strings } from '../../../shared/strings'
import { useCalm } from '../animation/Stage'
import { colourOf, playerOf } from '../colours'
import { PodiumView } from '../components/PodiumView'
import { send } from '../hooks'

/** The end of the evening: the top three on the blocks, everyone listed. */
export function Podium({ evening }: { evening: Evening }): React.JSX.Element {
  const calm = useCalm()
  const ranking = finalRanking(evening)
  const places = placesOf(ranking)
  const points = new Map(standings(evening).map((row) => [row.player, row.points]))
  const entries = ranking.flat().map((id) => {
    const player = playerOf(evening, id)
    return {
      id,
      name: player.name,
      avatar: player.avatar,
      colour: colourOf(evening, id),
      place: places[id]!,
      points: points.get(id) ?? 0,
    }
  })
  return <PodiumView entries={entries} calm={calm} buttonLabel={strings.evening.finish} onButton={() => send({ type: 'finish' })} />
}
