// Every piece of text the user can see lives here, so the app can be
// translated later by swapping this one object.

export const strings = {
  appName: 'Dart Party',
  tagline: 'An evening of darts mini-games',
  comingSoon: 'Nothing to play yet. The games are on their way.',
  disclaimer: 'Unofficial. Not affiliated with Autodarts.',
  version: (version: string) => `Version ${version}`,

  board: {
    connecting: 'Looking for Autodarts…',
    offline: 'Autodarts is not running. Start Autodarts Desktop on this computer.',
    unexpected:
      'Autodarts answers in a way this version does not understand.',
    ready: 'Board ready. Throw a dart!',
    starting: 'Autodarts is starting detection. Check that the cameras are connected.',
    stuck: 'The board is stuck. Resetting it…',
    stopped: 'Detection is stopped. Start it in Autodarts.',
    cloudOffline: 'Autodarts has no internet connection. Detection still works.',
    reset: 'Reset board',
    miss: 'Miss',
    log: {
      dartThrown: (name: string) => `Dart: ${name}`,
      dartsRemoved: 'Darts removed',
      throwsCorrected: 'Darts corrected in Autodarts',
      boardReset: 'Board reset',
      boardStuck: 'Board stuck',
      detectionStopped: 'Detection stopped',
      detectionStarted: 'Detection started',
      connectionLost: 'Connection to Autodarts lost',
      connectionRestored: 'Connection to Autodarts restored',
      unexpectedData: 'Unexpected answer from Autodarts',
    },
  },

  update: {
    checking: 'Checking for updates…',
    upToDate: 'You have the latest version.',
    checkAgain: 'Check again',
    available: (version: string) => `Version ${version} is available.`,
    download: 'Download update',
    downloading: (percent: number) => `Downloading update… ${percent}%`,
    ready: (version: string) => `Version ${version} is ready to install.`,
    install: 'Restart and install',
    error: 'Could not check for updates.',
    retry: 'Try again',
    unsupported: 'Updates are only checked in an installed copy.',
  },
} as const
