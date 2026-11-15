import { useEffect, useState } from 'react'
import { drawableGames } from '../../../core/game/registry'
import { cleanAddress } from '../../../core/settings'
import { strings } from '../../../shared/strings'
import { BugReports } from '../components/BugReports'
import { Volume } from '../components/Volume'
import { useScreens, useSettings } from '../hooks'
import { gameName } from './Draw'

const s = strings.settings

export function SettingsScreen({ onBack, onPreview }: { onBack: () => void; onPreview: () => void }): React.JSX.Element {
  const settings = useSettings()
  const screens = useScreens()
  const [address, setAddress] = useState(settings.autodartsAddress)
  useEffect(() => setAddress(settings.autodartsAddress), [settings.autodartsAddress])

  const cleaned = cleanAddress(address)
  const enabled = drawableGames.filter((game) => !settings.disabledGames.includes(game.id))

  const toggleGame = (id: string): void => {
    const off = settings.disabledGames.includes(id)
    // The last game left cannot be switched off.
    if (!off && enabled.length <= 1) return
    window.dartParty.updateSettings({
      disabledGames: off ? settings.disabledGames.filter((x) => x !== id) : [...settings.disabledGames, id],
    })
  }

  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="button button--quiet" onClick={onBack}>
          {strings.common.back}
        </button>
        <h2>{s.title}</h2>
        <span />
      </header>

      <div className="settings">
        <section>
          <h3>{s.games}</h3>
          <div className="row row--left">
            {drawableGames.map((game) => (
              <button
                key={game.id}
                type="button"
                className={settings.disabledGames.includes(game.id) ? 'chip' : 'chip chip--on'}
                onClick={() => toggleGame(game.id)}
              >
                {gameName(game.id)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>{s.volume}</h3>
          <Volume />
        </section>

        <section>
          <h3>{s.animations}</h3>
          <div className="row row--left">
            <button
              type="button"
              className={settings.calmAnimations ? 'chip' : 'chip chip--on'}
              onClick={() => window.dartParty.updateSettings({ calmAnimations: false })}
            >
              {s.lively}
            </button>
            <button
              type="button"
              className={settings.calmAnimations ? 'chip chip--on' : 'chip'}
              onClick={() => window.dartParty.updateSettings({ calmAnimations: true })}
            >
              {s.calm}
            </button>
            <button type="button" className="button" onClick={onPreview}>
              {s.preview}
            </button>
          </div>
          <p className="hint hint--left">{s.calmHint}</p>
        </section>

        <section>
          <h3>{s.checkout}</h3>
          <div className="row row--left">
            <button
              type="button"
              className={settings.checkoutHints ? 'chip chip--on' : 'chip'}
              onClick={() => window.dartParty.updateSettings({ checkoutHints: true })}
            >
              {s.checkoutOn}
            </button>
            <button
              type="button"
              className={settings.checkoutHints ? 'chip' : 'chip chip--on'}
              onClick={() => window.dartParty.updateSettings({ checkoutHints: false })}
            >
              {s.checkoutOff}
            </button>
          </div>
          <p className="hint hint--left">{s.checkoutHint}</p>
        </section>

        <section>
          <h3>{s.screens}</h3>
          {screens.displays < 2 && !screens.twoWindows ? (
            <p className="hint hint--left">{s.oneDisplay}</p>
          ) : (
            <div className="row row--left">
              <button
                type="button"
                className={screens.twoWindows ? 'chip chip--on' : 'chip'}
                onClick={() => !screens.twoWindows && window.dartParty.toggleScreens()}
              >
                {s.twoScreens}
              </button>
              <button
                type="button"
                className={screens.twoWindows ? 'chip' : 'chip chip--on'}
                onClick={() => screens.twoWindows && window.dartParty.toggleScreens()}
              >
                {s.oneScreen}
              </button>
            </div>
          )}
        </section>

        <section>
          <h3>{s.address}</h3>
          <div className="row row--left">
            <input
              className="input input--left"
              value={address}
              aria-label={s.address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <button
              type="button"
              className="button"
              disabled={cleaned === null || cleaned === settings.autodartsAddress}
              onClick={() => cleaned && window.dartParty.updateSettings({ autodartsAddress: cleaned })}
            >
              {s.apply}
            </button>
          </div>
          <p className="hint hint--left">{s.addressHint}</p>
        </section>

        <section>
          <h3>{s.bugs}</h3>
          <p className="hint hint--left">{s.bugsHint}</p>
          <BugReports />
        </section>
      </div>
    </main>
  )
}
