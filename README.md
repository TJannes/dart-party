# Dart Party

A desktop party game for a group of friends around one dartboard: an evening
of randomly drawn darts mini-games with a running scoreboard and a winner at
the end.

Dart detection comes from [Autodarts](https://autodarts.io) Desktop running on
the same machine. **Dart Party is unofficial and not affiliated with
Autodarts.**

Nothing is playable yet: the app is an empty window that can install and
update itself. See [docs/PLAN.md](docs/PLAN.md) for the goal, the decisions
made and the build steps.

## Install

Download the latest version from the
[Releases page](https://github.com/TJannes/dart-party/releases/latest).

**Windows:** run `Dart-Party-Setup-<version>.exe`. The installer is not
signed, so Windows shows "Windows protected your PC" the first time. Choose
*More info*, then *Run anyway*.

**Ubuntu:** download `Dart-Party-<version>-x86_64.AppImage`, make it
executable and start it:

```sh
chmod +x Dart-Party-*.AppImage
./Dart-Party-*.AppImage
```

## Updates

The app looks for a newer version each time it starts and shows a button when
there is one. It never downloads or installs anything without that click.

## Development

Needs Node.js 22.12 or newer.

```sh
npm install
npm run dev         # run the app with hot reload
npm test            # unit tests
npm run typecheck
npm run dist:linux  # build the AppImage into release/
npm run dist:win    # build the Windows installer (on Windows)
```

To publish a release, set `version` in `package.json`, commit, and push a
matching tag (`v0.1.0` for version `0.1.0`). GitHub Actions builds both
installers and publishes the release.

## License

[MIT](LICENSE)
