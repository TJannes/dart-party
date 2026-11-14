import { useCallback, useEffect, useState } from 'react'
import type { BoardSnapshot } from '../../core/board/tracker'
import type { Evening, Player } from '../../core/evening/evening'
import type { EveningCommand } from '../../core/evening/session'
import { DEFAULT_SETTINGS, type Settings } from '../../core/settings'
import type { ScreensState } from '../../shared/api'

/** The evening being played. Undefined until the main process has answered. */
export function useEvening(): Evening | null | undefined {
  const [evening, setEvening] = useState<Evening | null | undefined>(undefined)
  useEffect(() => {
    const stop = window.dartParty.onEvening(setEvening)
    void window.dartParty.getEvening().then(setEvening)
    return stop
  }, [])
  return evening
}

export function send(command: EveningCommand): void {
  window.dartParty.eveningCommand(command)
}

export function useBoardSnapshot(): BoardSnapshot {
  const [snapshot, setSnapshot] = useState<BoardSnapshot>({
    link: 'connecting',
    condition: null,
    cloudConnected: null,
    throws: [],
  })
  useEffect(() => {
    const stop = window.dartParty.onBoardSnapshot(setSnapshot)
    void window.dartParty.getBoardSnapshot().then(setSnapshot)
    return stop
  }, [])
  return snapshot
}

/** The saved profiles, and a way to replace them. */
export function useProfiles(): [Player[], (players: Player[]) => void] {
  const [profiles, setProfiles] = useState<Player[]>([])
  useEffect(() => {
    void window.dartParty.getPlayers().then(setProfiles)
  }, [])
  const save = useCallback((players: Player[]) => {
    setProfiles(players)
    void window.dartParty.savePlayers(players).then(setProfiles)
  }, [])
  return [profiles, save]
}

/** 'show' for the window on the TV, 'main' for the one with the controls. */
export const ROLE: 'main' | 'show' =
  new URLSearchParams(window.location.search).get('role') === 'show' ? 'show' : 'main'

export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  useEffect(() => {
    const stop = window.dartParty.onSettings(setSettings)
    void window.dartParty.getSettings().then(setSettings)
    return stop
  }, [])
  return settings
}

export function useScreens(): ScreensState {
  const [screens, setScreens] = useState<ScreensState>({ displays: 1, twoWindows: false })
  useEffect(() => {
    const stop = window.dartParty.onScreens(setScreens)
    void window.dartParty.getScreens().then(setScreens)
    return stop
  }, [])
  return screens
}
