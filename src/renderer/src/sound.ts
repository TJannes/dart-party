import { theme } from './theme'
import type { EffectName, Music, MusicScene, Tone } from './theme/types'

// Plays the theme's effects and music with the Web Audio API. Only one
// window makes sound: the show window when there is one, else the main one.

class Sound {
  private context: AudioContext | null = null
  private effectsGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private audible = false
  private volumes = { effects: 0.8, music: 0.3 }
  private scene: MusicScene | null = null
  private musicTimer: ReturnType<typeof setInterval> | null = null
  private nextBeat = 0
  private beat = 0

  setAudible(audible: boolean): void {
    this.audible = audible
    this.applyVolumes()
    if (!audible) this.stopMusic()
    else if (this.scene) this.startMusic(this.scene)
  }

  setVolumes(effects: number, music: number): void {
    this.volumes = { effects, music }
    this.applyVolumes()
  }

  play(name: EffectName): void {
    if (!this.audible || this.volumes.effects === 0) return
    const context = this.ready()
    for (const tone of theme.effects[name]) this.tone(tone, context.currentTime, this.effectsGain!)
  }

  /** The background tune for where the party is. Null for silence. */
  setScene(scene: MusicScene | null): void {
    if (scene === this.scene) return
    this.scene = scene
    this.stopMusic()
    if (scene && this.audible) this.startMusic(scene)
  }

  private ready(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext()
      this.effectsGain = this.context.createGain()
      this.musicGain = this.context.createGain()
      this.effectsGain.connect(this.context.destination)
      this.musicGain.connect(this.context.destination)
      this.applyVolumes()
    }
    if (this.context.state === 'suspended') void this.context.resume()
    return this.context
  }

  private applyVolumes(): void {
    if (!this.effectsGain || !this.musicGain) return
    this.effectsGain.gain.value = this.audible ? this.volumes.effects : 0
    // Music sits well under the effects even at full volume.
    this.musicGain.gain.value = this.audible ? this.volumes.music * 0.35 : 0
  }

  private tone(tone: Tone, origin: number, output: GainNode): void {
    const context = this.context!
    const start = origin + tone.at
    const end = start + tone.length
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = tone.wave
    oscillator.frequency.setValueAtTime(tone.from, start)
    if (tone.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(tone.to, end)
    envelope.gain.setValueAtTime(0, start)
    envelope.gain.linearRampToValueAtTime(tone.gain, start + 0.01)
    envelope.gain.exponentialRampToValueAtTime(0.001, end)
    oscillator.connect(envelope).connect(output)
    oscillator.start(start)
    oscillator.stop(end + 0.02)
  }

  private startMusic(scene: MusicScene): void {
    const context = this.ready()
    this.stopMusic()
    this.beat = 0
    this.nextBeat = context.currentTime + 0.1
    // Schedule a little ahead, so the timer's jitter is never heard.
    this.musicTimer = setInterval(() => this.scheduleMusic(theme.music[scene]), 100)
  }

  /** Silences this instance for good: its music loop and anything still sounding. */
  shutDown(): void {
    this.stopMusic()
    void this.context?.close()
    this.context = null
    this.effectsGain = null
    this.musicGain = null
    this.audible = false
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) clearInterval(this.musicTimer)
    this.musicTimer = null
  }

  private scheduleMusic(music: Music): void {
    const context = this.context!
    const half = 30 / music.tempo // eighth notes
    while (this.nextBeat < context.currentTime + 0.3) {
      const chord = music.chords[Math.floor(this.beat / 8) % music.chords.length]!
      const step = this.beat % 8
      const [bass, ...upper] = chord
      if (step === 0 || step === 4) {
        this.tone({ wave: 'sine', from: bass!, at: 0, length: half * 3.5, gain: 0.5 }, this.nextBeat, this.musicGain!)
      }
      const arpeggio = upper[[0, 1, 2, 3, 2, 1, 2, 1][step]! % upper.length]!
      this.tone({ wave: music.wave, from: arpeggio, at: 0, length: half * 0.9, gain: 0.28 }, this.nextBeat, this.musicGain!)
      this.nextBeat += half
      this.beat++
    }
  }
}

export const sound = new Sound()

// In development a changed file can make this module load again. The old
// instance must stop its music loop then, or two tunes play over each other.
import.meta.hot?.dispose(() => sound.shutDown())
