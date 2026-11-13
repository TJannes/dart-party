/// <reference types="vite/client" />
import type { DartPartyApi } from '../../shared/api'

declare global {
  interface Window {
    dartParty: DartPartyApi
  }
}
