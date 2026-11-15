import { finalRanking, standings, type Party } from '../../../core/party/party'
import { placesOf } from '../../../core/party/points'
import { strings } from '../../../shared/strings'
import { useCalm } from '../animation/Stage'
import { colourOf, playerOf } from '../colours'
import { PodiumView } from '../components/PodiumView'
import { send } from '../hooks'

/** The end of the party: the top three on the blocks, everyone listed. */
export function Podium({ party }: { party: Party }): React.JSX.Element {
  const calm = useCalm()
  const ranking = finalRanking(party)
  const places = placesOf(ranking)
  const points = new Map(standings(party).map((row) => [row.player, row.points]))
  const entries = ranking.flat().map((id) => {
    const player = playerOf(party, id)
    return {
      id,
      name: player.name,
      avatar: player.avatar,
      colour: colourOf(party, id),
      place: places[id]!,
      points: points.get(id) ?? 0,
    }
  })
  return <PodiumView entries={entries} calm={calm} buttonLabel={strings.party.finish} onButton={() => send({ type: 'finish' })} />
}
