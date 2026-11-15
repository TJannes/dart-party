import { useEffect, useState } from 'react'
import { strings } from '../../shared/strings'
import { Stage } from './animation/Stage'
import { ROLE, useEvening, useScreens, useSettings } from './hooks'
import { AnimationsScreen } from './screens/AnimationsScreen'
import { BoardCheck } from './screens/BoardCheck'
import { Draw } from './screens/Draw'
import { Home } from './screens/Home'
import { Play } from './screens/Play'
import { Podium } from './screens/Podium'
import { Rules } from './screens/Rules'
import { SettingsScreen } from './screens/SettingsScreen'
import { Setup } from './screens/Setup'
import { sound } from './sound'
import { useMusic } from './soundEvents'

export function App(): React.JSX.Element | null {
  const evening = useEvening()
  const settings = useSettings()
  return (
    <Stage evening={evening} calm={settings.calmAnimations}>
      <Screen evening={evening} />
    </Stage>
  )
}

function Screen({ evening }: { evening: ReturnType<typeof useEvening> }): React.JSX.Element | null {
  const [menu, setMenu] = useState<'home' | 'setup' | 'check' | 'settings' | 'animations'>('home')
  const settings = useSettings()
  const screens = useScreens()

  // Sound comes from the show window when there is one, else from this one.
  useEffect(() => sound.setAudible(ROLE === 'show' || !screens.twoWindows), [screens.twoWindows])
  useEffect(
    () => sound.setVolumes(settings.effectsVolume, settings.musicVolume),
    [settings.effectsVolume, settings.musicVolume],
  )
  useMusic(evening)

  if (evening === undefined) return null
  if (evening === null) {
    // The TV has no menus: it waits for the evening to start.
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
    if (menu === 'check') {
      return (
        <main className="screen">
          <BoardCheck onBack={() => setMenu('home')} />
        </main>
      )
    }
    return (
      <Home
        onNewEvening={() => setMenu('setup')}
        onBoardCheck={() => setMenu('check')}
        onSettings={() => setMenu('settings')}
      />
    )
  }

  // Back to the start once this evening is over or stopped.
  if (menu !== 'home') setMenu('home')

  switch (evening.stage) {
    case 'draw':
      return <Draw evening={evening} />
    case 'rules':
      return <Rules evening={evening} />
    case 'playing':
    case 'decider':
      return <Play evening={evening} />
    case 'podium':
      return <Podium evening={evening} />
  }
}
