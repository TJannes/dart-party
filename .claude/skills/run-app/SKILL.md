---
name: run-app
description: Start the Dart Party Electron app on this Linux machine and drive it like a user (real mouse clicks, typing, tapping the on-screen board, screenshots). Use to check any change that shows on screen or changes how a game plays, or when asked to run, test or screenshot the app.
---

# Run and drive Dart Party

The driver launches the built app with Playwright (`playwright-core`, a dev
dependency) and takes commands over HTTP on port 9400, so every step is one
shell call. It uses the app's normal user data: this machine is a test
environment, and the owner allows changing players, settings and parties as
needed for a test.

All paths are relative to the repo root. Node 26 must be on PATH:
`export PATH=~/.local/opt/node-v26.13.1-linux-x64/bin:$PATH`.

## Start

```bash
npm run build                                   # the driver runs out/, so build first
node .claude/skills/run-app/driver.mjs          # in the background; prints "driver ready on 9400"
```

Wait for "driver ready" before sending commands. After changing app code:
`quit`, build, start again.

## Commands

In zsh, define a function (a variable holding the command does not split):

```bash
d() { node .claude/skills/run-app/drive.mjs "$@"; }
```

| command | what it does |
|---|---|
| `d click "<text>"` | real mouse click on the button/link containing the text |
| `d click-css <selector> [n]` | click the n-th match of a CSS selector |
| `d click-at <x> <y>` | click at window coordinates (CSS px, window is 1280x768) |
| `d click-in <selector> <fx> <fy>` | click a spot inside an element, as fractions of its box |
| `d tap-board <x> <y> [selector]` | tap the on-screen board at board coordinates (bull 0,0; double ring edge radius 1; y up). Default: the board in the "Add dart" picker |
| `d dart <S20/D5/T19/25/B/M>` | enter one dart through "Add dart" and the picker (single, double, triple, outer bull, bull, miss). Not for Sniper or Robin Hood |
| `d only-game <name>` | on the Settings screen: leave only that game in the draw |
| `d fill <label/placeholder/selector> <text>` | fill an input |
| `d type <text>` / `d press <key>` | keyboard |
| `d buttons` | visible buttons, `(off)` when disabled: the quickest way to see what can be clicked |
| `d text [selector]` | visible text |
| `d wait-text <text>` | wait up to 15 s for text |
| `d ss <name>` | screenshot to `.claude/skills/run-app/shots/<name>.png`; then Read it |
| `d sleep <ms>` | wait (animations) |
| `d eval <js>` | read state in the page, e.g. `window.dartParty.getParty()`. Read only: drive the app by clicking |
| `d window show` | switch to the show window (start the driver with `FORCE_SHOW=1`) |
| `d quit` | close the app and the driver |

## Recipes

- **One game only**: Home → `Settings` → `only-game <name>` → `Back` → `New party` → click two players → `−` until
  Games is 1 → `Start the party` → `Continue` (after the draw stops) →
  `Let's play`.
- **A dart by hand**: `Add dart`, then `tap-board x y` (Sniper and any game
  with positions) or the number keys in the picker; `Next player` passes the
  turn as a takeout would.
- **Where to aim in Sniper**: the crosses are in the party state:
  `d eval "window.dartParty.getParty().then(p => p.games.at(-1).setup.targets)"`.
- **Animations**: take several screenshots 300 ms apart right after the dart;
  most of a cue is over within 2 seconds.

## Gotchas

- The app resumes a saved party at start; `Stop party` → `Stop the party`
  returns to Home.
- Autodarts is not running here, so a red banner shows on every screen and
  darts are entered by hand. That is expected.
- `--no-sandbox` is needed: the setuid sandbox helper is not set up.
- `click` matches the first button containing the text: "Miss" in the picker
  and on the control bar are two buttons; use `click-css` when it matters.
- Everything here is Linux only. Windows still has to be tried by the owner.
