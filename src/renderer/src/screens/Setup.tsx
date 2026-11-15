import { useState } from 'react'
import { DEFAULT_GAMES, MAX_PLAYERS, MIN_FREE_PLAYERS, MIN_PLAYERS, type Player } from '../../../core/evening/evening'
import { freePlayGames } from '../../../core/game/registry'
import { X01_STARTS } from '../../../core/game/x01'
import { AVATARS, cleanName, MAX_NAME_LENGTH, MAX_PROFILES } from '../../../core/players'
import { strings } from '../../../shared/strings'
import { Avatar } from '../components/Avatar'
import { Modal } from '../components/Modal'
import { send, useProfiles } from '../hooks'
import { gameName } from './Draw'

const s = strings.setup
const f = strings.freePlay
const MAX_GAMES = 15

function newId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function PlayerEditor(props: {
  player: Player | null
  onSave: (player: Player) => void
  onDelete?: () => void
  onClose: () => void
}): React.JSX.Element {
  const [name, setName] = useState(props.player?.name ?? '')
  const [avatar, setAvatar] = useState(props.player?.avatar ?? AVATARS[0])
  const cleaned = cleanName(name)
  return (
    <Modal title={props.player ? s.editPlayerTitle : s.newPlayerTitle} onClose={props.onClose}>
      <input
        className="input"
        autoFocus
        value={name}
        maxLength={MAX_NAME_LENGTH}
        placeholder={s.namePlaceholder}
        aria-label={s.name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="avatar-grid">
        {AVATARS.map((id) => (
          <button
            key={id}
            type="button"
            className={id === avatar ? 'avatar-pick avatar-pick--on' : 'avatar-pick'}
            aria-label={strings.avatars[id]}
            onClick={() => setAvatar(id)}
          >
            <Avatar avatar={id} mood={id === avatar ? 'cheer' : 'idle'} />
          </button>
        ))}
      </div>
      <div className="row">
        {props.onDelete && (
          <button type="button" className="button button--miss" onClick={props.onDelete}>
            {strings.common.delete}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={props.onClose}>
          {strings.common.cancel}
        </button>
        <button
          type="button"
          className="button"
          disabled={cleaned === ''}
          onClick={() => props.onSave({ id: props.player?.id ?? newId(), name: cleaned, avatar })}
        >
          {strings.common.save}
        </button>
      </div>
    </Modal>
  )
}

/**
 * Picking tonight's players and the number of games; or, for free play,
 * the players and the one game to play.
 */
export function Setup({ onBack, freePlay = false }: { onBack: () => void; freePlay?: boolean }): React.JSX.Element {
  const [profiles, saveProfiles] = useProfiles()
  const [chosen, setChosen] = useState<string[]>([])
  const [games, setGames] = useState(DEFAULT_GAMES)
  const [game, setGame] = useState(freePlayGames[0]!.id)
  const [startScore, setStartScore] = useState<number>(501)
  const [doubleOut, setDoubleOut] = useState(true)
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [editMode, setEditMode] = useState(false)

  const picked = profiles.filter((p) => chosen.includes(p.id))
  const ready = picked.length >= (freePlay ? MIN_FREE_PLAYERS : MIN_PLAYERS) && picked.length <= MAX_PLAYERS

  const toggle = (id: string): void =>
    setChosen((now) =>
      now.includes(id) ? now.filter((x) => x !== id) : now.length < MAX_PLAYERS ? [...now, id] : now,
    )

  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="button button--quiet" onClick={onBack}>
          {strings.common.back}
        </button>
        <h2>{freePlay ? f.title : s.title}</h2>
        <button
          type="button"
          className={editMode ? 'button' : 'button button--quiet'}
          onClick={() => setEditMode(!editMode)}
        >
          {s.edit}
        </button>
      </header>
      <p className="hint">{profiles.length === 0 ? s.noPlayers : freePlay ? f.hint : s.hint}</p>

      <div className="profiles">
        {profiles.map((player) => {
          const on = chosen.includes(player.id)
          return (
            <button
              key={player.id}
              type="button"
              className={on && !editMode ? 'profile profile--on' : 'profile'}
              onClick={() => (editMode ? setEditing(player) : toggle(player.id))}
            >
              <Avatar avatar={player.avatar} mood={on && !editMode ? 'cheer' : 'idle'} />
              <span>{player.name}</span>
            </button>
          )
        })}
        {profiles.length < MAX_PROFILES && (
          <button type="button" className="profile profile--new" onClick={() => setEditing('new')}>
            <span className="profile__plus">+</span>
            <span>{s.addPlayer}</span>
          </button>
        )}
      </div>

      {freePlay ? (
        <footer className="bar bar--wrap">
          <div className="row row--left">
            {freePlayGames.map((rules) => (
              <button key={rules.id} type="button" className={game === rules.id ? 'chip chip--on' : 'chip'} onClick={() => setGame(rules.id)}>
                {gameName(rules.id)}
              </button>
            ))}
          </div>
          {game === 'x01' && (
            <div className="row row--left">
              {X01_STARTS.map((score) => (
                <button key={score} type="button" className={startScore === score ? 'chip chip--on' : 'chip'} onClick={() => setStartScore(score)}>
                  {score}
                </button>
              ))}
              <button type="button" className={doubleOut ? 'chip chip--on' : 'chip'} onClick={() => setDoubleOut(true)}>
                {f.doubleOut}
              </button>
              <button type="button" className={doubleOut ? 'chip' : 'chip chip--on'} onClick={() => setDoubleOut(false)}>
                {f.straightOut}
              </button>
            </div>
          )}
          <button
            type="button"
            className="button button--big"
            disabled={!ready}
            onClick={() => send({ type: 'startFreePlay', players: picked, game, options: { start: startScore, doubleOut } })}
          >
            {f.start}
          </button>
        </footer>
      ) : (
        <footer className="bar">
          <div className="stepper">
            <span>{s.games}</span>
            <button type="button" className="key" disabled={games <= 1} onClick={() => setGames(games - 1)}>
              −
            </button>
            <strong>{games}</strong>
            <button type="button" className="key" disabled={games >= MAX_GAMES} onClick={() => setGames(games + 1)}>
              +
            </button>
          </div>
          <button
            type="button"
            className="button button--big"
            disabled={!ready}
            onClick={() => send({ type: 'start', players: picked, games })}
          >
            {s.start}
          </button>
        </footer>
      )}

      {editing && (
        <PlayerEditor
          player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  saveProfiles(profiles.filter((p) => p.id !== editing.id))
                  setChosen(chosen.filter((id) => id !== editing.id))
                  setEditing(null)
                }
          }
          onSave={(player) => {
            const exists = profiles.some((p) => p.id === player.id)
            saveProfiles(exists ? profiles.map((p) => (p.id === player.id ? player : p)) : [...profiles, player])
            if (!exists && chosen.length < MAX_PLAYERS) setChosen([...chosen, player.id])
            setEditing(null)
          }}
        />
      )}
    </main>
  )
}
