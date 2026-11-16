import { useEffect, useState } from 'react'
import { strings } from '../../shared/strings'
import { Stage } from './animation/Stage'
import { ROLE, useParty, useScreens, useSettings } from './hooks'
import { AnimationsScreen } from './screens/AnimationsScreen'
import { BoardCheck } from './screens/BoardCheck'
import { Draw } from './screens/Draw'
import { DrinkRules } from './screens/DrinkRules'
import { Home } from './screens/Home'
import { Play } from './screens/Play'
import { Podium } from './screens/Podium'
import { Rules } from './screens/Rules'
import { SettingsScreen } from './screens/SettingsScreen'
import { Setup } from './screens/Setup'
import { Wheel } from './screens/Wheel'
import { sound } from './sound'
import { useMusic } from './soundEvents'

export function App(): React.JSX.Element | null {
  const party = useParty()
  const settings = useSettings()
  return (
    <Stage party={party} calm={settings.calmAnimations}>
      <Screen party={party} />
    </Stage>
  )
}

function Screen({ party }: { party: ReturnType<typeof useParty> }): React.JSX.Element | null {
  const [menu, setMenu] = useState<'home' | 'setup' | 'freePlay' | 'check' | 'settings' | 'animations'>('home')
  const settings = useSettings()
  const screens = useScreens()

  // Sound comes from the show window when there is one, else from this one.
  useEffect(() => sound.setAudible(ROLE === 'show' || !screens.twoWindows), [screens.twoWindows])
  useEffect(
    () => sound.setVolumes(settings.effectsVolume, settings.musicVolume),
    [settings.effectsVolume, settings.musicVolume],
  )
  useMusic(party)

  if (party === undefined) return null
  if (party === null) {
    // The TV has no menus: it waits for the party to start.
    if (ROLE === 'show') {
      return (
        <main className="screen screen--home">
          <section className="hero">
            <h1>{strings.appName}</h1>
            <p className="tagline">{strings.show.waiting}</p>
          </section>
        </main>
      )
    }
    if (menu === 'settings') return <SettingsScreen onBack={() => setMenu('home')} onPreview={() => setMenu('animations')} />
    if (menu === 'animations') return <AnimationsScreen onBack={() => setMenu('settings')} />
    if (menu === 'setup') return <Setup onBack={() => setMenu('home')} />
    if (menu === 'freePlay') return <Setup freePlay onBack={() => setMenu('home')} />
    if (menu === 'check') {
      return (
        <main className="screen">
          <BoardCheck onBack={() => setMenu('home')} />
        </main>
      )
    }
    return (
      <Home
        onNewParty={() => setMenu('setup')}
        onFreePlay={() => setMenu('freePlay')}
        onBoardCheck={() => setMenu('check')}
        onSettings={() => setMenu('settings')}
      />
    )
  }

  // Back to the start once this party is over or stopped.
  if (menu !== 'home') setMenu('home')

  switch (party.stage) {
    case 'drinkRules':
      return <DrinkRules party={party} />
    case 'draw':
      return <Draw party={party} />
    case 'rules':
      return <Rules party={party} />
    case 'playing':
    case 'decider':
      return <Play party={party} />
    case 'wheel':
      return <Wheel party={party} />
    case 'podium':
      return <Podium party={party} />
  }
}
