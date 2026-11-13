/// <reference types="vite/client" />
import type { DartPartyApi } from '../../shared/update'

declare global {
  interface Window {
    dartParty: DartPartyApi
  }
}
