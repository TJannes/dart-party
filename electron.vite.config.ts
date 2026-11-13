import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import pkg from './package.json'

// The packaged app may only load its own files. The development server needs
// inline scripts for hot reload, so the policy is added to real builds only.
const contentSecurityPolicy: Plugin = {
  name: 'dart-party-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<!--csp-->',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:" />`,
    ),
}

export default defineConfig({
  main: {},
  preload: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
  },
  renderer: {
    plugins: [react(), contentSecurityPolicy],
  },
})
