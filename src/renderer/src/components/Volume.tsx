import { strings } from '../../../shared/strings'
import { useSettings } from '../hooks'

const s = strings.settings

function Slider(props: { label: string; value: number; onChange: (value: number) => void }): React.JSX.Element {
  return (
    <label className="slider">
      <span>{props.label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

/** The two volume sliders. They work at once, on whichever window plays. */
export function Volume(): React.JSX.Element {
  const settings = useSettings()
  return (
    <div className="sliders">
      <Slider
        label={s.effects}
        value={settings.effectsVolume}
        onChange={(effectsVolume) => window.dartParty.updateSettings({ effectsVolume })}
      />
      <Slider
        label={s.music}
        value={settings.musicVolume}
        onChange={(musicVolume) => window.dartParty.updateSettings({ musicVolume })}
      />
    </div>
  )
}
