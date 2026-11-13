// Every piece of text the user can see lives here, so the app can be
// translated later by swapping this one object.

export const strings = {
  appName: 'Dart Party',
  tagline: 'An evening of darts mini-games',
  comingSoon: 'Nothing to play yet. The games are on their way.',
  disclaimer: 'Unofficial. Not affiliated with Autodarts.',
  version: (version: string) => `Version ${version}`,

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
